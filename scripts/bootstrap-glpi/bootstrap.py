#!/usr/bin/env python3
"""Valida y reconcilia en modo lectura el bootstrap GLPI de IGX NEXUS.

Por defecto valida la configuración declarativa y muestra un dry-run local.
Con ``--check-glpi`` consulta la API High-Level soportada por GLPI y compara
el estado real con la configuración deseada. Este script no realiza escrituras
en GLPI ni accede directamente a MariaDB.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


DEFAULT_GLPI_BASE_URL = "http://localhost:8080/api.php/v2.3.0"

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


def validate_config(config: dict[str, Any]) -> None:
    required_sections = ("entities", "locations", "physical_asset_types", "statuses")
    for section in required_sections:
        if section not in config:
            raise ValueError(f"Falta la sección obligatoria '{section}'.")

    entities = config["entities"]
    locations = config["locations"]
    statuses = config["statuses"]
    physical_types = config["physical_asset_types"]

    if not all(isinstance(section, list) for section in (entities, locations, statuses)):
        raise ValueError("entities, locations y statuses deben ser listas.")
    if not isinstance(physical_types, list) or not all(
        isinstance(item, str) and item.strip() for item in physical_types
    ):
        raise ValueError("physical_asset_types debe ser una lista de textos no vacíos.")

    entity_names = require_unique_names(entities, "entities")
    location_names = require_unique_names(locations, "locations")
    status_names = require_unique_names(statuses, "statuses")

    validate_parent_references(entities, entity_names, "entities")
    validate_parent_references(locations, location_names, "locations")

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
        self.base_url = base_url.rstrip("/")
        self.token = token

    def get(
        self,
        path: str,
        *,
        entity_id: int | None = None,
        recursive: bool = False,
        query: dict[str, Any] | None = None,
    ) -> Any:
        url = f"{self.base_url}{path}"
        if query:
            url = f"{url}?{urlencode(query)}"

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
            "Accept-Language": "es_CL",
        }
        if entity_id is not None:
            headers["GLPI-Entity"] = str(entity_id)
            headers["GLPI-Entity-Recursive"] = "true" if recursive else "false"

        request = Request(url, headers=headers, method="GET")
        try:
            with urlopen(request, timeout=20) as response:
                return json.load(response)
        except HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"GLPI respondió HTTP {error.code} para {path}: {detail[:500]}"
            ) from error
        except URLError as error:
            raise RuntimeError(f"No fue posible conectar con GLPI para {path}: {error}") from error

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
        config["status_visibility_defaults"].get("visible_for_physical_asset_types", True)
    )
    default_other = bool(
        config["status_visibility_defaults"].get("visible_for_other_item_types", False)
    )
    return {
        key: default_physical if key in physical_keys else default_other
        for key in ALL_STATE_VISIBILITIES
    }


def reconcile_glpi(config: dict[str, Any], client: GLPIClient) -> str:
    lines = [
        "IGX NEXUS — GLPI Bootstrap",
        "Modo: RECONCILIACIÓN READ-ONLY",
        "",
    ]
    missing: list[str] = []
    drifts: list[str] = []
    ok_count = 0

    entity_collection = client.collection("/Administration/Entity")
    entities_by_name = {
        item.get("name"): item
        for item in entity_collection
        if isinstance(item.get("name"), str)
    }

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
        add_drift(drifts, "Entity", name, "comment", live.get("comment"), desired.get("comment", ""))
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

    location_entities = {location["entity"] for location in config["locations"]}
    target_entity_name = next(iter(location_entities))
    target_entity = entities_by_name.get(target_entity_name)
    if not target_entity:
        raise RuntimeError(
            f"No existe la entidad objetivo '{target_entity_name}' en GLPI."
        )
    target_entity_id = int(target_entity["id"])

    location_collection = client.collection(
        "/Dropdowns/Location", entity_id=target_entity_id
    )
    locations_by_name = {
        item.get("name"): item
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
        item.get("name"): item
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


def parse_args() -> argparse.Namespace:
    default_config = Path(__file__).parent / "config" / "innergex-chile.json"
    parser = argparse.ArgumentParser(
        description="Valida y compara la configuración declarativa del bootstrap GLPI."
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=default_config,
        help="Ruta al archivo JSON de configuración.",
    )
    parser.add_argument(
        "--check-glpi",
        action="store_true",
        help="Compara en modo read-only la configuración declarativa con GLPI.",
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

        if args.check_glpi:
            token = os.getenv("GLPI_ACCESS_TOKEN")
            if not token:
                raise ValueError(
                    "Falta GLPI_ACCESS_TOKEN. Obtén un token OAuth y expórtalo "
                    "antes de usar --check-glpi."
                )
            client = GLPIClient(args.glpi_base_url, token)
            print(reconcile_glpi(config, client))
        else:
            print(render_plan(config))
    except (OSError, json.JSONDecodeError, ValueError, RuntimeError) as error:
        print(f"[ERROR] {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
