# Security Policy

STELE is a directive compiler with an adversarial paste surface. Its output
governs Claude's behavior in sessions. This makes it a meaningful attack target.

## Reporting a Vulnerability

Report security issues privately to **mazze.leczzare@protonmail.com**.

Do not open a public GitHub issue for security vulnerabilities.

There is no formal CVE process. Direct contact is preferred and sufficient.
Include: what you found, how to reproduce it, and what you believe the impact is.

## Scope

The primary attack surface is the paste input zone (Group 4 — not yet implemented).
The TOBIRA detection system, gate() function, and integrity state machine are
all relevant attack targets.
