#!/usr/bin/env python3
"""Valida y prepara el bootstrap declarativo de GLPI para IGX NEXUS.

En CMDB-004 este script actúa como validador y dry-run. La escritura contra GLPI
se habilitará únicamente mediante APIs soportadas; nunca escribirá directo en
MariaDB.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


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

    if len(status_names) != 9:
        raise ValueError(
            f"Se esperaban 9 estados base de ciclo de vida y se encontraron {len(status_names)}."
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


def parse_args() -> argparse.Namespace:
    default_config = Path(__file__).parent / "config" / "innergex-chile.json"
    parser = argparse.ArgumentParser(
        description="Valida la configuración declarativa del bootstrap GLPI de IGX NEXUS."
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=default_config,
        help="Ruta al archivo JSON de configuración.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        config = load_config(args.config)
        validate_config(config)
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f"[ERROR] {error}", file=sys.stderr)
        return 1

    print(render_plan(config))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
