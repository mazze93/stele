# Security Policy

STELE is a directive compiler with an adversarial paste surface. Its output
governs Claude's behavior in sessions. This makes it a meaningful attack target.

## Reporting a Vulnerability

Report security issues privately to **mazze.leczzare@protonmail.com**.

Do not open a public GitHub issue for security vulnerabilities.

There is no formal CVE process. Direct contact is preferred and sufficient.
Include: what you found, how to reproduce it, and what you believe the impact is.

## Scope

The primary attack surface is the paste input zone (Group 4, live since v1.0.0):
`src/components/panels/InheritPanel.tsx` and `CollaboratorPanel.tsx`, both of
which send content through `gate()` to `src/lib/extractor.ts`. The TOBIRA
detection system, `gate()`, `LOCKED_FIELDS` / `DirectiveStatePatchSchema`, and
the integrity state machine are all relevant attack targets.

Pasted, extracted, and model-derived content is rendered as text, never markup.
HTML-parsing sinks are lint-gated (`eslint/markup-sinks.js`), and the gate is
tested (`evals/markup-sinks.test.ts`). Any path that gets attacker-controlled
markup into the DOM is in scope. Per ADR-0004, the operator's API key is held
in the browser tier, so script injection anywhere in `bundle.html` is
treated as key exposure.
