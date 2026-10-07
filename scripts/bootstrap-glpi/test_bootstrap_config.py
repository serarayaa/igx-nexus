#!/usr/bin/env python3
from __future__ import annotations

import copy
import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).parent
BOOTSTRAP_PATH = ROOT / "bootstrap.py"
CONFIG_PATH = ROOT / "config" / "innergex-chile.json"

SPEC = importlib.util.spec_from_file_location(
    "igx_nexus_bootstrap_glpi_config",
    BOOTSTRAP_PATH,
)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("No fue posible cargar bootstrap.py para pruebas.")
bootstrap = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bootstrap)


class GLPIBootstrapConfigTests(unittest.TestCase):
    def setUp(self) -> None:
        self.config = bootstrap.load_config(CONFIG_PATH)

    def test_repository_config_is_valid(self) -> None:
        bootstrap.validate_config(self.config)

    def test_rejects_duplicate_inventory_rule_names(self) -> None:
        config = copy.deepcopy(self.config)
        config["inventory_routing_rules"].append(
            copy.deepcopy(config["inventory_routing_rules"][0])
        )

        with self.assertRaisesRegex(ValueError, "nombres duplicados"):
            bootstrap.validate_config(config)

    def test_rejects_unknown_location_action(self) -> None:
        config = copy.deepcopy(self.config)
        for action in config["inventory_routing_rules"][0]["actions"]:
            if action["field"] == "location":
                action["value"] = "Site inexistente"

        with self.assertRaisesRegex(ValueError, "ubicación inexistente"):
            bootstrap.validate_config(config)

    def test_rejects_unsupported_inventory_tag_operator(self) -> None:
        config = copy.deepcopy(self.config)
        config["inventory_routing_rules"][0]["criteria"][0]["operator"] = "contains"

        with self.assertRaisesRegex(ValueError, "operador no soportado"):
            bootstrap.validate_config(config)

    def test_dry_run_renders_inventory_routing_rule(self) -> None:
        bootstrap.validate_config(self.config)
        plan = bootstrap.render_plan(self.config)

        self.assertIn("Reglas de enrutamiento de inventario:", plan)
        self.assertIn("NEXUS - Entity - Santiago", plan)
        self.assertIn("inventory_tag is nexus-live-lab", plan)
        self.assertIn("entity = Innergex > Chile", plan)
        self.assertIn("location = Santiago", plan)


if __name__ == "__main__":
    unittest.main()
