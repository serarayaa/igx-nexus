# Security

Security requirements and threat-model notes for IGX NEXUS.

Initial baseline:

- No real credentials or secrets in Git.
- No direct browser access to GLPI database tables.
- Least-privilege service identities.
- Encrypted transport for non-local environments.
- RBAC and enterprise SSO for production.
- Audit logging for privileged and asset-changing operations.
- Secure QR identifiers that do not embed sensitive asset data.
- Patch and dependency management as part of the release process.
