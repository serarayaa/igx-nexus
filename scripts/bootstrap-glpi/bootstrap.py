#!/usr/bin/env python3
"""Valida, reconcilia y aplica la configuración base de GLPI para IGX NEXUS.

Por defecto valida la configuración declarativa y muestra un dry-run local.
Con ``--check-glpi`` consulta la API High-Level soportada por GLPI y compara
el estado real con la configuración deseada.
Con ``--apply`` crea o actualiza únicamente las ubicaciones declaradas que
falten o diverjan. Las reglas de enrutamiento de inventario se validan aquí y
se reconcilian con ``inventory-rules.php``. Nunca escribe directamente en MariaDB.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from ipaddress import ip_address
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


DEFAULT_GLPI_BASE_URL = "http://localhost:8080/api.php/v2.3.0"

_LOOPBACK_HOSTNAMES = {"localhost"}


class _NoRedirectHandler(HTTPRedirectHandler):
    def redirect_request(
        self,
        req: Request,
        fp: Any,
        code: int,
        msg: str,
        headers: Any,
        newurl: str,
    ) -> None:
        return None


def _is_loopback_host(hostname: str | None) -> bool:
    if hostname is None:
        return False
    normalized = hostname.lower()
    if normalized in _LOOPBACK_HOSTNAMES:
        return True
    try:
        return ip_address(normalized).is_loopback
    except ValueError:
        return False


def normalize_glpi_base_url(raw_url: str) -> str:
    value = raw_url.strip()
    parsed = urlsplit(value)

    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("GLPI_BASE_URL debe ser una URL absoluta HTTP(S).")
    if parsed.username or parsed.password:
        raise ValueError("GLPI_BASE_URL no puede contener credenciales.")
    if parsed.query or parsed.fragment:
        raise ValueError("GLPI_BASE_URL no puede contener query string ni fragmento.")
    if parsed.scheme == "http" and not _is_loopback_host(parsed.hostname):
        raise ValueError(
            "GLPI_BASE_URL debe usar HTTPS salvo endpoints loopback explícitos "
            "(localhost, 127.0.0.1 o ::1)."
        )

    return value.rstrip("/")

PHYSICAL_TYPE_TO_VISIBILITY = {
    "Computers": "computer",
    "Network devices": "networkequipment",
    "Phones": "phone",
    "Monitors": "monitor",
    "Peripherals": "peripheral",
    "Printers": "printer",
    "Enclosures": "enclosure",
    "PDUs": "pdu",
    "Racks": "rack",
    "Appliances": "appliance",
    "Passive devices": "passivedcequipment",
}

ALL_STATE_VISIBILITIES = (
    "computer",
    "monitor",
    "networkequipment",
    "peripheral",
    "phone",
    "printer",
    "softwarelicense",
    "certificate",
    "enclosure",
    "pdu",
    "line",
    "rack",
    "softwareversion",
    "cluster",
    "contract",
    "appliance",
    "databaseinstance",
    "cable",
    "unmanaged",
    "passivedcequipment",
)

LOCATION_FIELD_MAP = {
    "address": "address",
    "town": "town",
    "state": "state",
    "country": "country",
    "postal_code": "postcode",
    "room": "room",
    "building": "building",
    "comment": "comment",
}

INVENTORY_ROUTING_MATCHES = {"AND", "OR"}
INVENTORY_ROUTING_CRITERIA = {
    "inventory_tag": {"is"},
}
INVENTORY_ROUTING_ACTIONS = {"entity", "location"}


def load_config(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError("La configuración raíz debe ser un objeto JSON.")
    return data


def require_unique_names(items: list[dict[str, Any]], section: str) -> set[str]:
    names: list[str] = []
    for item in items:
        name = item.get("name")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"{section}: todos los elementos requieren un nombre no vacío.")
        names.append(name.strip())

    duplicates = sorted({name for name in names if names.count(name) > 1})
    if duplicates:
        raise ValueError(f"{section}: nombres duplicados: {', '.join(duplicates)}")

    return set(names)


def validate_parent_references(
    items: list[dict[str, Any]], known_names: set[str], section: str
) -> None:
    for item in items:
        parent = item.get("parent")
        if parent is not None and parent not in known_names:
            raise ValueError(
                f"{section}: '{item['name']}' referencia un padre inexistente: '{parent}'."
            )
        if parent == item["name"]:
            raise ValueError(f"{section}: '{item['name']}' no puede ser su propio padre.")


def build_entity_paths(entities: list[dict[str, Any]]) -> set[str]:
    by_name = {item["name"]: item for item in entities}
    cache: dict[str, str] = {}

    def resolve(name: str, trail: tuple[str, ...] = ()) -> str:
        if name in cache:
            return cache[name]
        if name in trail:
            chain = " -> ".join((*trail, name))
            raise ValueError(f"entities: ciclo de padres detectado: {chain}.")

        parent = by_name[name].get("parent")
        if parent is None:
            path = name
        else:
            path = f"{resolve(parent, (*trail, name))} > {name}"

        cache[name] = path
        return path

    return {resolve(name) for name in by_name}


def validate_inventory_routing_rules(
    rules: list[dict[str, Any]],
    entity_paths: set[str],
    location_names: set[str],
) -> None:
    require_unique_names(rules, "inventory_routing_rules")

    for rule in rules:
        name = rule["name"]

        if not isinstance(rule.get("active"), bool):
            raise ValueError(
                f"inventory_routing_rules: '{name}'.active debe ser booleano."
            )

        match = rule.get("match")
        if match not in INVENTORY_ROUTING_MATCHES:
            raise ValueError(
                f"inventory_routing_rules: '{name}'.match no soportado: {match!r}."
            )

        description = rule.get("description", "")
        if not isinstance(description, str):
            raise ValueError(
                f"inventory_routing_rules: '{name}'.description debe ser texto."
            )

        criteria = rule.get("criteria")
        actions = rule.get("actions")
        if not isinstance(criteria, list) or not criteria:
            raise ValueError(
                f"inventory_routing_rules: '{name}' requiere al menos un criterio."
            )
        if not isinstance(actions, list) or not actions:
            raise ValueError(
                f"inventory_routing_rules: '{name}' requiere al menos una acción."
            )

        seen_criteria: set[str] = set()
        for item in criteria:
            if not isinstance(item, dict):
                raise ValueError(
                    f"inventory_routing_rules: '{name}' contiene un criterio inválido."
                )
            field = item.get("field")
            operator = item.get("operator")
            value = item.get("value")
            if field not in INVENTORY_ROUTING_CRITERIA:
                raise ValueError(
                    f"inventory_routing_rules: '{name}' usa criterio no soportado: "
                    f"{field!r}."
                )
            if operator not in INVENTORY_ROUTING_CRITERIA[field]:
                raise ValueError(
                    f"inventory_routing_rules: '{name}' usa operador no soportado "
                    f"para {field!r}: {operator!r}."
                )
            if not isinstance(value, str) or not value.strip():
                raise ValueError(
                    f"inventory_routing_rules: '{name}' requiere un valor no vacío "
                    f"para {field!r}."
                )
            if field in seen_criteria:
                raise ValueError(
                    f"inventory_routing_rules: '{name}' repite el criterio {field!r}."
                )
            seen_criteria.add(field)

        seen_actions: set[str] = set()
        for item in actions:
            if not isinstance(item, dict):
                raise ValueError(
                    f"inventory_routing_rules: '{name}' contiene una acción inválida."
                )
            field = item.get("field")
            value = item.get("value")
            if field not in INVENTORY_ROUTING_ACTIONS:
                raise ValueError(
                    f"inventory_routing_rules: '{name}' usa acción no soportada: "
                    f"{field!r}."
                )
            if field in seen_actions:
                raise ValueError(
                    f"inventory_routing_rules: '{name}' repite la acción {field!r}."
                )
            seen_actions.add(field)

            if not isinstance(value, str) or not value.strip():
                raise ValueError(
                    f"inventory_routing_rules: '{name}' requiere un valor no vacío "
                    f"para la acción {field!r}."
                )

            if field == "entity" and value not in entity_paths:
                raise ValueError(
                    f"inventory_routing_rules: '{name}' referencia una entidad "
                    f"inexistente: {value!r}."
                )
            if field == "location" and value not in location_names:
                raise ValueError(
                    f"inventory_routing_rules: '{name}' referencia una ubicación "
                    f"inexistente: {value!r}."
                )


def validate_config(config: dict[str, Any]) -> None:
    required_sections = (
        "entities",
        "locations",
        "physical_asset_types",
        "statuses",
        "status_visibility_defaults",
        "inventory_routing_rules",
    )
    for section in required_sections:
        if section not in config:
            raise ValueError(f"Falta la sección obligatoria '{section}'.")

    entities = config["entities"]
    locations = config["locations"]
    statuses = config["statuses"]
    physical_types = config["physical_asset_types"]
    routing_rules = config["inventory_routing_rules"]

    if not all(
        isinstance(section, list)
        for section in (entities, locations, statuses, routing_rules)
    ):
        raise ValueError(
            "entities, locations, statuses e inventory_routing_rules deben ser listas."
        )
    if not isinstance(physical_types, list) or not all(
        isinstance(item, str) and item.strip() for item in physical_types
    ):
        raise ValueError("physical_asset_types debe ser una lista de textos no vacíos.")
    if not isinstance(config["status_visibility_defaults"], dict):
        raise ValueError("status_visibility_defaults debe ser un objeto JSON.")

    entity_names = require_unique_names(entities, "entities")
    location_names = require_unique_names(locations, "locations")
    status_names = require_unique_names(statuses, "statuses")

    validate_parent_references(entities, entity_names, "entities")
    validate_parent_references(locations, location_names, "locations")
    entity_paths = build_entity_paths(entities)

    for location in locations:
        entity = location.get("entity")
        if entity not in entity_names:
            raise ValueError(
                f"locations: '{location['name']}' referencia una entidad inexistente: '{entity}'."
            )

    duplicate_types = sorted(
        {item for item in physical_types if physical_types.count(item) > 1}
    )
    if duplicate_types:
        raise ValueError(
            "physical_asset_types: valores duplicados: " + ", ".join(duplicate_types)
        )

    unknown_types = sorted(set(physical_types) - set(PHYSICAL_TYPE_TO_VISIBILITY))
    if unknown_types:
        raise ValueError(
            "physical_asset_types: tipos sin mapeo de API: " + ", ".join(unknown_types)
        )

    if len(status_names) != 9:
        raise ValueError(
            f"Se esperaban 9 estados base de ciclo de vida y se encontraron {len(status_names)}."
        )

    location_entities = {location["entity"] for location in locations}
    if len(location_entities) != 1:
        raise ValueError(
            "CMDB-004 requiere que todas las ubicaciones declaradas pertenezcan "
            "a una única entidad objetivo."
        )

    validate_inventory_routing_rules(
        routing_rules,
        entity_paths,
        location_names,
    )


def render_plan(config: dict[str, Any]) -> str:
    lines: list[str] = [
        "IGX NEXUS — GLPI Bootstrap",
        "Modo: VALIDACIÓN / DRY-RUN",
        "",
        "Entidades:",
    ]

    for entity in config["entities"]:
        parent = entity.get("parent") or "<raíz>"
        lines.append(f"  [PLAN] {entity['name']} (padre: {parent})")

    lines.append("")
    lines.append("Ubicaciones:")
    for location in config["locations"]:
        parent = location.get("parent") or "<raíz de Chile>"
        lines.append(
            f"  [PLAN] {location['name']} (padre: {parent}, entidad: {location['entity']})"
        )

    lines.append("")
    lines.append("Reglas de enrutamiento de inventario:")
    for rule in config["inventory_routing_rules"]:
        state = "activa" if rule["active"] else "inactiva"
        lines.append(
            f"  [PLAN] {rule['name']} ({rule['match']}, {state})"
        )
        for criterion in rule["criteria"]:
            lines.append(
                "    IF "
                f"{criterion['field']} {criterion['operator']} "
                f"{criterion['value']}"
            )
        for action in rule["actions"]:
            lines.append(
                f"    THEN {action['field']} = {action['value']}"
            )

    lines.append("")
    lines.append("Estados de ciclo de vida:")
    for status in config["statuses"]:
        lines.append(f"  [PLAN] {status['name']}")

    lines.extend(
        [
            "",
            "Tipos físicos con visibilidad de estados:",
            "  " + ", ".join(config["physical_asset_types"]),
            "",
            "[OK] Configuración válida.",
            "[INFO] No se realizaron escrituras en GLPI.",
        ]
    )
    return "\n".join(lines)


def normalize_scalar(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return value


def parent_name(item: dict[str, Any]) -> str | None:
    parent = item.get("parent")
    if isinstance(parent, dict):
        name = parent.get("name")
        return name if isinstance(name, str) and name else None
    return None


class GLPIClient:
    def __init__(self, base_url: str, token: str) -> None:
        self.base_url = normalize_glpi_base_url(base_url)
        self.token = token
        self._opener = build_opener(_NoRedirectHandler())

    def _headers(
        self,
        *,
        entity_id: int | None = None,
        recursive: bool = False,
        content_type: bool = False,
    ) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
            "Accept-Language": "es_CL",
        }
        if entity_id is not None:
            headers["GLPI-Entity"] = str(entity_id)
            headers["GLPI-Entity-Recursive"] = "true" if recursive else "false"
        if content_type:
            headers["Content-Type"] = "application/json"
        return headers

    def request(
        self,
        method: str,
        path: str,
        *,
        entity_id: int | None = None,
        recursive: bool = False,
        query: dict[str, Any] | None = None,
        payload: dict[str, Any] | None = None,
    ) -> Any:
        url = f"{self.base_url}{path}"
        if query:
            url = f"{url}?{urlencode(query)}"

        data = None
        if payload is not None:
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

        request = Request(
            url,
            headers=self._headers(
                entity_id=entity_id,
                recursive=recursive,
                content_type=payload is not None,
            ),
            data=data,
            method=method,
        )
        try:
            with self._opener.open(request, timeout=20) as response:
                raw = response.read()
                if not raw:
                    return None
                return json.loads(raw.decode("utf-8"))
        except HTTPError as error:
            if 300 <= error.code < 400:
                raise RuntimeError(
                    f"GLPI intentó redirigir {method} {path}; "
                    "los redirects autenticados están bloqueados."
                ) from error
            raise RuntimeError(
                f"GLPI respondió HTTP {error.code} para {method} {path}."
            ) from error
        except URLError as error:
            raise RuntimeError(
                f"No fue posible conectar con GLPI para {method} {path}."
            ) from error

    def get(
        self,
        path: str,
        *,
        entity_id: int | None = None,
        recursive: bool = False,
        query: dict[str, Any] | None = None,
    ) -> Any:
        return self.request(
            "GET",
            path,
            entity_id=entity_id,
            recursive=recursive,
            query=query,
        )

    def post(
        self,
        path: str,
        payload: dict[str, Any],
        *,
        entity_id: int | None = None,
    ) -> Any:
        return self.request(
            "POST",
            path,
            entity_id=entity_id,
            payload=payload,
        )

    def patch(
        self,
        path: str,
        payload: dict[str, Any],
        *,
        entity_id: int | None = None,
    ) -> Any:
        return self.request(
            "PATCH",
            path,
            entity_id=entity_id,
            payload=payload,
        )

    def collection(
        self,
        path: str,
        *,
        entity_id: int | None = None,
        recursive: bool = False,
    ) -> list[dict[str, Any]]:
        data = self.get(
            path,
            entity_id=entity_id,
            recursive=recursive,
            query={"start": 0, "limit": 1000},
        )
        if not isinstance(data, list):
            raise RuntimeError(f"GLPI devolvió una respuesta inesperada para {path}.")
        return [item for item in data if isinstance(item, dict)]

    def detail(
        self,
        path: str,
        item_id: int,
        *,
        entity_id: int | None = None,
    ) -> dict[str, Any]:
        data = self.get(f"{path}/{item_id}", entity_id=entity_id)
        if not isinstance(data, dict):
            raise RuntimeError(
                f"GLPI devolvió una respuesta inesperada para {path}/{item_id}."
            )
        return data


def add_drift(
    drifts: list[str],
    object_type: str,
    name: str,
    field: str,
    actual: Any,
    expected: Any,
) -> None:
    if normalize_scalar(actual) != normalize_scalar(expected):
        drifts.append(
            f"{object_type} '{name}'.{field}: "
            f"GLPI={actual!r} | deseado={expected!r}"
        )


def expected_status_visibilities(config: dict[str, Any]) -> dict[str, bool]:
    physical_keys = {
        PHYSICAL_TYPE_TO_VISIBILITY[item] for item in config["physical_asset_types"]
    }
    default_physical = bool(
        config["status_visibility_defaults"].get(
            "visible_for_physical_asset_types", True
        )
    )
    default_other = bool(
        config["status_visibility_defaults"].get(
            "visible_for_other_item_types", False
        )
    )
    return {
        key: default_physical if key in physical_keys else default_other
        for key in ALL_STATE_VISIBILITIES
    }


def load_entities(client: GLPIClient) -> dict[str, dict[str, Any]]:
    entity_collection = client.collection("/Administration/Entity")
    return {
        item["name"]: item
        for item in entity_collection
        if isinstance(item.get("name"), str)
    }


def target_entity_context(
    config: dict[str, Any], client: GLPIClient
) -> tuple[str, int, dict[str, dict[str, Any]]]:
    entities_by_name = load_entities(client)
    location_entities = {location["entity"] for location in config["locations"]}
    target_entity_name = next(iter(location_entities))
    target_entity = entities_by_name.get(target_entity_name)
    if not target_entity:
        raise RuntimeError(
            f"No existe la entidad objetivo '{target_entity_name}' en GLPI."
        )
    return target_entity_name, int(target_entity["id"]), entities_by_name


def reconcile_glpi(config: dict[str, Any], client: GLPIClient) -> str:
    lines = [
        "IGX NEXUS — GLPI Bootstrap",
        "Modo: RECONCILIACIÓN READ-ONLY",
        "",
    ]
    missing: list[str] = []
    drifts: list[str] = []
    ok_count = 0

    target_entity_name, target_entity_id, entities_by_name = target_entity_context(
        config, client
    )

    lines.append("Entidades:")
    for desired in config["entities"]:
        name = desired["name"]
        live_summary = entities_by_name.get(name)
        if not live_summary:
            missing.append(f"Entity '{name}'")
            lines.append(f"  [MISSING] {name}")
            continue

        live = client.detail("/Administration/Entity", int(live_summary["id"]))
        before = len(drifts)
        add_drift(
            drifts,
            "Entity",
            name,
            "comment",
            live.get("comment"),
            desired.get("comment", ""),
        )
        add_drift(
            drifts,
            "Entity",
            name,
            "parent",
            parent_name(live),
            desired.get("parent"),
        )
        if len(drifts) == before:
            ok_count += 1
            lines.append(f"  [OK] {name}")
        else:
            lines.append(f"  [DRIFT] {name}")

    location_collection = client.collection(
        "/Dropdowns/Location", entity_id=target_entity_id
    )
    locations_by_name = {
        item["name"]: item
        for item in location_collection
        if isinstance(item.get("name"), str)
    }

    lines.extend(["", f"Ubicaciones ({target_entity_name}):"])
    for desired in config["locations"]:
        name = desired["name"]
        live_summary = locations_by_name.get(name)
        if not live_summary:
            missing.append(f"Location '{name}'")
            lines.append(f"  [MISSING] {name}")
            continue

        live = client.detail(
            "/Dropdowns/Location",
            int(live_summary["id"]),
            entity_id=target_entity_id,
        )
        before = len(drifts)

        add_drift(
            drifts,
            "Location",
            name,
            "parent",
            parent_name(live),
            desired.get("parent"),
        )
        live_entity = live.get("entity")
        live_entity_name = (
            live_entity.get("name") if isinstance(live_entity, dict) else None
        )
        add_drift(
            drifts,
            "Location",
            name,
            "entity",
            live_entity_name,
            desired["entity"],
        )

        for config_field, api_field in LOCATION_FIELD_MAP.items():
            if config_field in desired:
                add_drift(
                    drifts,
                    "Location",
                    name,
                    api_field,
                    live.get(api_field),
                    desired[config_field],
                )

        if len(drifts) == before:
            ok_count += 1
            lines.append(f"  [OK] {name}")
        else:
            lines.append(f"  [DRIFT] {name}")

    state_collection = client.collection(
        "/Dropdowns/State", entity_id=target_entity_id
    )
    states_by_name = {
        item["name"]: item
        for item in state_collection
        if isinstance(item.get("name"), str)
    }
    expected_visibilities = expected_status_visibilities(config)
    expected_helpdesk = bool(
        config["status_visibility_defaults"].get("show_in_assistance", False)
    )

    lines.extend(["", f"Estados ({target_entity_name}):"])
    for desired in config["statuses"]:
        name = desired["name"]
        live_summary = states_by_name.get(name)
        if not live_summary:
            missing.append(f"State '{name}'")
            lines.append(f"  [MISSING] {name}")
            continue

        live = client.detail(
            "/Dropdowns/State",
            int(live_summary["id"]),
            entity_id=target_entity_id,
        )
        before = len(drifts)

        add_drift(
            drifts,
            "State",
            name,
            "comment",
            live.get("comment"),
            desired.get("comment", ""),
        )
        add_drift(
            drifts,
            "State",
            name,
            "is_visible_helpdesk",
            live.get("is_visible_helpdesk"),
            expected_helpdesk,
        )

        live_visibilities = live.get("visibilities")
        if not isinstance(live_visibilities, dict):
            live_visibilities = {}
        for key, expected in expected_visibilities.items():
            add_drift(
                drifts,
                "State",
                name,
                f"visibilities.{key}",
                live_visibilities.get(key),
                expected,
            )

        if len(drifts) == before:
            ok_count += 1
            lines.append(f"  [OK] {name}")
        else:
            lines.append(f"  [DRIFT] {name}")

    lines.extend(["", "Diferencias detectadas:"])
    if not missing and not drifts:
        lines.append("  [OK] GLPI coincide con la configuración declarativa.")
    else:
        for item in missing:
            lines.append(f"  [MISSING] {item}")
        for item in drifts:
            lines.append(f"  [DRIFT] {item}")

    lines.extend(
        [
            "",
            "Resumen:",
            f"  Objetos conformes: {ok_count}",
            f"  Objetos faltantes: {len(missing)}",
            f"  Campos divergentes: {len(drifts)}",
            "",
            "[INFO] Comprobación completada en modo read-only.",
            "[INFO] No se realizaron escrituras en GLPI.",
        ]
    )
    return "\n".join(lines)


def location_payload(
    desired: dict[str, Any],
    locations_by_name: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    payload: dict[str, Any] = {"name": desired["name"]}

    for config_field, api_field in LOCATION_FIELD_MAP.items():
        if config_field in desired:
            payload[api_field] = desired[config_field]

    desired_parent = desired.get("parent")
    if desired_parent is not None:
        parent = locations_by_name.get(desired_parent)
        if not parent:
            raise RuntimeError(
                f"No se puede crear '{desired['name']}': "
                f"el padre '{desired_parent}' todavía no existe en GLPI."
            )
        payload["parent"] = {"id": int(parent["id"])}

    return payload


def location_patch(
    desired: dict[str, Any],
    live: dict[str, Any],
    locations_by_name: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    patch: dict[str, Any] = {}

    live_entity = live.get("entity")
    live_entity_name = (
        live_entity.get("name") if isinstance(live_entity, dict) else None
    )
    if live_entity_name != desired["entity"]:
        raise RuntimeError(
            f"No se automatiza el cambio de entidad de Location '{desired['name']}': "
            f"GLPI={live_entity_name!r}, deseado={desired['entity']!r}."
        )

    desired_parent = desired.get("parent")
    live_parent = parent_name(live)
    if normalize_scalar(live_parent) != normalize_scalar(desired_parent):
        if desired_parent is None:
            raise RuntimeError(
                f"No se automatiza quitar el padre de Location '{desired['name']}' "
                "sin validar antes el contrato específico de GLPI."
            )
        parent = locations_by_name.get(desired_parent)
        if not parent:
            raise RuntimeError(
                f"No se puede actualizar '{desired['name']}': "
                f"el padre '{desired_parent}' no existe en GLPI."
            )
        patch["parent"] = {"id": int(parent["id"])}

    for config_field, api_field in LOCATION_FIELD_MAP.items():
        if config_field not in desired:
            continue
        if normalize_scalar(live.get(api_field)) != normalize_scalar(
            desired[config_field]
        ):
            patch[api_field] = desired[config_field]

    return patch


def validate_apply_prerequisites(
    config: dict[str, Any],
    client: GLPIClient,
    target_entity_id: int,
    entities_by_name: dict[str, dict[str, Any]],
) -> None:
    missing_entities = [
        desired["name"]
        for desired in config["entities"]
        if desired["name"] not in entities_by_name
    ]
    if missing_entities:
        raise RuntimeError(
            "No se ejecutará --apply: faltan entidades base en GLPI: "
            + ", ".join(missing_entities)
        )

    states = client.collection("/Dropdowns/State", entity_id=target_entity_id)
    states_by_name = {
        item["name"]: item for item in states if isinstance(item.get("name"), str)
    }
    missing_states = [
        desired["name"]
        for desired in config["statuses"]
        if desired["name"] not in states_by_name
    ]
    if missing_states:
        raise RuntimeError(
            "No se ejecutará --apply: faltan estados base en GLPI: "
            + ", ".join(missing_states)
        )


def apply_glpi(config: dict[str, Any], client: GLPIClient) -> str:
    target_entity_name, target_entity_id, entities_by_name = target_entity_context(
        config, client
    )
    validate_apply_prerequisites(
        config, client, target_entity_id, entities_by_name
    )

    location_collection = client.collection(
        "/Dropdowns/Location", entity_id=target_entity_id
    )
    locations_by_name = {
        item["name"]: item
        for item in location_collection
        if isinstance(item.get("name"), str)
    }

    lines = [
        "IGX NEXUS — GLPI Bootstrap",
        "Modo: APPLY",
        f"Entidad objetivo: {target_entity_name} (ID {target_entity_id})",
        "",
        "Cambios de ubicaciones:",
    ]
    created = 0
    updated = 0
    unchanged = 0

    for desired in config["locations"]:
        name = desired["name"]
        live_summary = locations_by_name.get(name)

        if not live_summary:
            payload = location_payload(desired, locations_by_name)
            response = client.post(
                "/Dropdowns/Location",
                payload,
                entity_id=target_entity_id,
            )
            if not isinstance(response, dict) or not isinstance(response.get("id"), int):
                raise RuntimeError(
                    f"GLPI creó '{name}' pero devolvió una respuesta inesperada: "
                    f"{response!r}"
                )
            created_id = int(response["id"])
            locations_by_name[name] = {"id": created_id, "name": name}
            created += 1
            lines.append(f"  [CREATE] {name} (ID {created_id})")
            continue

        item_id = int(live_summary["id"])
        live = client.detail(
            "/Dropdowns/Location",
            item_id,
            entity_id=target_entity_id,
        )
        patch = location_patch(desired, live, locations_by_name)
        if not patch:
            unchanged += 1
            lines.append(f"  [SKIP] {name}")
            continue

        client.patch(
            f"/Dropdowns/Location/{item_id}",
            patch,
            entity_id=target_entity_id,
        )
        updated += 1
        fields = ", ".join(sorted(patch))
        lines.append(f"  [UPDATE] {name} ({fields})")

    lines.extend(
        [
            "",
            "Resumen de aplicación:",
            f"  Creadas: {created}",
            f"  Actualizadas: {updated}",
            f"  Sin cambios: {unchanged}",
            "",
            "[INFO] Escrituras realizadas exclusivamente mediante GLPI API.",
            "[INFO] MariaDB no fue accedida directamente.",
            "",
            "Verificación final:",
        ]
    )

    verification = reconcile_glpi(config, client)
    verification_lines = verification.splitlines()
    if len(verification_lines) >= 3:
        verification_lines = verification_lines[3:]
    lines.extend(verification_lines)
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    default_config = Path(__file__).parent / "config" / "innergex-chile.json"
    parser = argparse.ArgumentParser(
        description="Valida, compara y aplica la configuración declarativa del bootstrap GLPI."
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=default_config,
        help="Ruta al archivo JSON de configuración.",
    )

    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--check-glpi",
        action="store_true",
        help="Compara en modo read-only la configuración declarativa con GLPI.",
    )
    mode.add_argument(
        "--apply",
        action="store_true",
        help=(
            "Crea/actualiza ubicaciones mediante la API de GLPI y verifica "
            "el estado final."
        ),
    )

    parser.add_argument(
        "--glpi-base-url",
        default=os.getenv("GLPI_BASE_URL", DEFAULT_GLPI_BASE_URL),
        help="URL base de la API High-Level de GLPI.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        config = load_config(args.config)
        validate_config(config)

        if args.check_glpi or args.apply:
            token = os.getenv("GLPI_ACCESS_TOKEN")
            if not token:
                mode = "--apply" if args.apply else "--check-glpi"
                raise ValueError(
                    f"Falta GLPI_ACCESS_TOKEN. Obtén un token OAuth y expórtalo "
                    f"antes de usar {mode}."
                )
            client = GLPIClient(args.glpi_base_url, token)

            if args.apply:
                print(apply_glpi(config, client))
            else:
                print(reconcile_glpi(config, client))
        else:
            print(render_plan(config))
    except (OSError, json.JSONDecodeError, ValueError, RuntimeError) as error:
        print(f"[ERROR] {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
