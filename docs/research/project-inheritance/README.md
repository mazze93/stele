# Osmotic project context

The philosopher-scribe introduced in `42978c5` and narrative export introduced
in `93fd122` provide the session review and export path. This extension supplies
repository observations to that path and distributes the authority lesson from
Stratum ADR-003 and the tor-reference incident in compiled integration context.

## Refresh and use

Run `python3 scripts/collect-projects.py` from a checkout with the GitHub CLI
signed in. Collection reads the public repositories listed in
`src/data/project-sources.json`. The output replaces
`src/data/project-observations.json` atomically after all repositories respond.
Review that diff through the normal pull-request process to update the bundled
catalog. Existing IDs continue to select the same projects.

In Stele, select projects in the rail and open Collaborator. Choose an observed
project, inspect its commit and source links, edit its identity draft, then
apply it to the session. The draft is gated before application and produces a
TSUGI audit event. Narrative export retains the reviewed text and its observed
source citation. All three compilation targets include repository provenance
and reviewed session context. EPOCHÉ continues to replace normal output.

The optional model-assisted philosopher-scribe receives the bundled structural
context and observations. Calling it requires the existing session API key.
The offline review path works directly from collected repository descriptions.

## CI

`project-inheritance.yml` runs weekly, manually and when its collector changes.
It collects public metadata at default-branch revisions, validates the report
through the same application parser and uploads `stele-project-observations`.
Download the artifact, extract `project-observations.json`, and load it through
Collaborator's file input. A scheduled collection becomes available after this
workflow lands on the default branch.

CI uses read-only repository permissions. It produces a review artifact. Applying
observations to a session and updating the bundled catalog use the review paths
above. Repository descriptions are author statements. Source links and Git blob
identities locate source material but do not prove the descriptions' claims.
The collector records source identities without executing repository code or
reading private repositories. It makes no model calls.

## Boundaries

The report schema accepts repository identity, revision, observation time,
description, language and fixed source-file identities. It refuses governance
fields, unknown projects, duplicate projects and source-link substitution.
The existing TOBIRA gate screens description content and edited identity drafts.
Its lexical coverage retains the limitations in the Stele threat model.

This work leaves existing hard stops and posture as authored configuration.
The five newly registered integration projects have explicit initial posture
choices and empty project-specific hard stops. Their catalog entries require
ongoing review as their repositories evolve. Legacy projects without a configured
source remain authored entries.

The tor-reference case study and TESTAMENT are first-party incident records.
Their shared-credential and signing observations inform the compiled authority
context. The raw MCP transcripts have not been independently audited here.
Stratum authority-registry design and deployed ingress behavior retain their
recorded implementation boundaries. This refresh does not attest a human act.
