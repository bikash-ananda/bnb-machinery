# Contabo production deployment

The authoritative, VPS-specific deployment and recovery instructions are maintained in [infra/DEPLOY.md](../infra/DEPLOY.md).

That guide reflects the actual shared Contabo environment for B&B Machinery: project path `/opt/bnb-machinery`, domain `bnbmachinery.com`, existing host Caddy, PostgreSQL, Redis, persistent media, backup requirements and precautions for the other websites hosted on the same server.

Do not use generic fresh-server setup instructions here. In particular, do not run the server-hardening script, replace the host Caddyfile, or remove Docker volumes on the shared VPS.
