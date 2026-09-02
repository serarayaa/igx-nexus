# IGX NEXUS

> **The Technology Map** — by Innergex

IGX NEXUS is an internal CMDB & IT Asset Intelligence platform for Innergex.

The platform is focused on configuration management, asset intelligence, discovery, relationships between configuration items, QR-based asset identification, data quality, security, lifecycle management, and integrations with authoritative enterprise sources.

## Scope

### In scope
- CMDB / ITAM
- Asset discovery and inventory
- Configuration item relationships
- Asset 360° views
- QR-based identification and physical inventory
- CMDB Health and data quality
- Lifecycle, ownership, locations, contracts, warranties and compliance
- Integrations with GLPI, Microsoft Intune, Microsoft Entra ID and other authoritative sources
- Modern Innergex-branded UI/UX
- Auditability and security-by-design

### Out of scope
- Service Desk / Help Desk
- Support ticket creation and management

Innergex already uses Jira for support workflows. IGX NEXUS must not duplicate that responsibility.

## Architecture principle

The custom IGX NEXUS experience remains decoupled from the GLPI core. The web UI communicates with a dedicated NEXUS API, which controls authorization, normalization, reconciliation, business logic, QR workflows, integrations and auditability.

```text
IGX NEXUS Web
      |
      v
  NEXUS API
      |
  +---+--------------------+
  |          |             |
 GLPI      Intune       Entra ID
  |
MariaDB
```

## Project status

Current target: **v0.1 — Local Demo**

The first milestone is a polished local demonstration that can later be promoted to an Innergex virtual machine with minimal architectural change.

## Development workflow

- `main` is the stable development baseline.
- Work is implemented per CMDB ticket on dedicated branches.
- Pull requests are reviewed before merge.
- Conventional Commits are used.
- Secrets and real corporate data must never be committed.

---

**IGX NEXUS — The Technology Map**  
Internal technology asset intelligence for Innergex.
