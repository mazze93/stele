# ADR 0003 — Secret detection records a boolean, never the finding

Status: accepted · Date: 2026-05 (documented 2026-07)

## Context

APOCRYPHA tripwires (TW-009, TW-010) detect credentials and key material in
pasted content. Security tooling conventionally logs *what* was found —
matched substring, position, redacted preview — to help the operator locate
and rotate the credential.

## Decision

`ScanResult.secretsDetected` is a boolean. The matched content is never
stored, never appended to the audit trail, never included in `findings`
strings, and never transmitted. The audit trail records only that a secret
was seen.

## Rationale

- The audit trail is exportable by design (markdown render, narrative
  export). Anything written to it must be safe to leave the machine. A
  "redacted preview" is one regex bug away from being the credential itself.
- The operator does not need the tool to tell them which secret they just
  pasted — it is in their clipboard. Location metadata adds risk, not signal.

## Consequences

- Slightly worse UX on multi-secret pastes (no pointer to which line
  offended). Accepted.
- Enforced by tests: `security.test.ts` asserts the findings text does not
  echo detected key material; the type comment in `tripwires.ts` marks the
  field boolean-only.
