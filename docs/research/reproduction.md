# Reproduction protocol — STELE 1.2.0

This protocol is a retrospective engineering evaluation. It is not a
preregistered efficacy study. Inputs and test findings are data, not directives.

1. Check out STELE's release commit; use Node 24 and pnpm 12.11.2 (`mise.toml`).
2. Run `pnpm install --frozen-lockfile --ignore-scripts`, then `pnpm check`.
3. In `stele-core`, run `npm ci --ignore-scripts`, generate the Prisma client
   with a syntactically valid placeholder `DATABASE_URL`, then
   `npx --no-install tsc --noEmit`, `npm test`, and
   `npx --no-install wrangler deploy --dry-run`. Generation does not migrate.
4. Clone Aletheia and Apatea into persistent ignored `.closure/` directories.
   Check out exactly the commit hashes in `evals/pairing-lock.json`.
5. Run each Python suite with `PYTHONPATH=src:. python3 -m unittest discover -v`.
6. Run Apatea with `ALETHEIA_HOME` pointing at the pinned gate. Require exit 0
   on fixed/live targets and exactly exit 1 on the vulnerable reference.
   Exit 2 means execution error, never successful rediscovery.
7. Run `python3 evals/pairing.py --apatea .closure/apatea`. The script verifies
   the runner revision, invokes production gate code, and writes its perimeter.
8. In Aletheia, `npm ci --ignore-scripts --prefix typescript`; use its locked
   `typescript/node_modules/.bin/tsx` for `parity/emit.ts` and
   `parity/emit_mutations.ts`. Compare with the committed goldens using
   `parity/compare.py`. Regenerate Python projections and compare them with
   the goldens too; do not silently regenerate an oracle to erase differences.
9. Build hosted assets using `zsh site/assemble.zsh`. Deploy the committed
   Worker and Pages revision with the locked Wrangler in `stele-core`.
10. Run `python3 scripts/smoke-core.py --origin <verified-https-core-origin>
    --output <receipt-path>` only against the intended deployment. This writes
    two synthetic sessions and twelve events, then closes the sessions.
    Credential-bearing requests refuse redirects and tokens stay in memory.
11. Exercise the hosted compiler in a browser: use a synthetic placeholder key
    and a known TOBIRA payload; confirm EPOCHÉ, reset, and no model request.

The evidence directory retains preflight identity, raw parity projections,
advisory reports, runner perimeters, and status-only runtime receipts. The
paper explicitly distinguishes known open classes and transport limits.
Rollback uses Git reverts and the recorded Worker/Pages versions. No migration,
seed, reset, or deletion is required by this release.
