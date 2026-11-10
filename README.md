# Oman Earth Intelligence — NASA Space Apps engineering repository

Private development repository for the Oman Earth Intelligence React / TypeScript / Vite / MapLibre / Cloudflare Workers project.

> **Import status — 10 November 2026:** The complete source archive has **not yet been committed** to this repository. This is an initial safeguarded repository scaffold, not a deployable application.

## Verified local snapshot
- Prepared archive: `Oman_Earth_Intelligence_GitHub_Engineering_Upgrade.zip` (196 files).
- Heuristic repository safety check: 168 text files scanned, no signature-based alerts.
- Local Node tests: 136 passed, 1 failed out of 137 attempted; the failure was `ERR_MODULE_NOT_FOUND` for the not-yet-installed `three` dependency.
- No remote full build or GitHub Actions validation has completed for this repository.
- The existing Cloudflare production application is **not connected to deployments from this repository** and has not been changed.

## Next safe step
Import the original **extracted** archive into this repository, preserving the nested paths such as `src/`, `worker/`, `tests/`, `public/`, `scripts/` and `.github/`. Exclude `node_modules/`, `dist/`, `.env`, `.dev.vars`, credentials, and other ignored files.

After the complete source has arrived, verify the included `.github/workflows/quality.yml` pipeline passes, then perform scientific/data and responsive UI review in isolated branches. The included manual Playwright browser workflow is optional. **Do not deploy to production without explicit approval.**

The private source archive is retained separately; this README documents repository status but is not a substitute for the source files.
