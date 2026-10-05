---
description: Security review of recent changes
---
Use the security-reviewer agent on the current git diff (or on $ARGUMENTS). Check against docs/SECURITY.md: authz in services, input validation, rate limits, audit logging, secrets, CSRF, file uploads, SQL, error leakage. Report findings by severity with file/line and a fix for each.
