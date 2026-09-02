# Architecture

Architecture decisions, diagrams and technical baselines for IGX NEXUS live here.

Core principles:

- GLPI is a CMDB/ITAM engine, not the product UI.
- IGX NEXUS owns the user experience and domain contracts.
- The NEXUS API isolates the web application from upstream implementation details.
- Authoritative sources are reconciled instead of duplicated blindly.
- Security, auditability and upgradeability are design constraints from day one.
