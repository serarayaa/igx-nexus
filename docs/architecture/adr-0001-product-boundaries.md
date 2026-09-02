# ADR-0001 — Product boundaries

Status: Accepted

## Decision

IGX NEXUS is a CMDB / IT Asset Intelligence product. It will not implement Service Desk or Help Desk ticket management because Innergex uses Jira for that function.

GLPI is treated as a CMDB/ITAM engine and integration target, not as the product user interface. The IGX NEXUS web application will communicate through a dedicated NEXUS API and must not write directly to GLPI database tables.

## Consequences

- The UI remains modern, branded and independently evolvable.
- GLPI upgrades are less likely to break the product experience.
- Business rules, reconciliation and QR workflows live outside the GLPI core.
- Jira remains the authoritative support workflow platform.
