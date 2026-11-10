# GitHub Engineering Upgrade — Oman Earth Intelligence

**Release:** 10 November 2026 | **Scope:** source-control engineering only. No production deployment, no change to NASA datasets or scientific algorithms.

## What is included

- `.github/workflows/quality.yml` — read-only GitHub Actions job on every push and pull request: safety scan, pinned lockfile installation, existing scientific unit suite, TypeScript build and bundle budget.
- `.github/workflows/browser-smoke.yml` — **manual** Playwright checks on desktop Chrome, Android Chrome emulation and iPhone WebKit emulation. Runs only when requested, and may consume included GitHub Actions minutes.
- `.github/dependabot.yml` — weekly proposed updates for npm packages and GitHub Actions; **no automatic merging**.
- `.github/PULL_REQUEST_TEMPLATE.md` — scientific integrity, privacy, testing and rollback checklist.
- `scripts/repo_safety_check.mjs` + `npm run audit:repo` — heuristic scan for highly recognisable secret patterns and sensitive filenames. This is **not** a complete security review.
- `.gitignore` — safeguards against committing build output, local secrets and browser artifacts.

## Recommended sequence (highest return first)

1. Use the **private, separate** GitHub repository [`mohammedjasim88/Nasamoham`](https://github.com/mohammedjasim88/Nasamoham). Do not modify the unrelated `UTAS-AstroSat` repository.
2. The clean 195-file source tree is committed on branch `engineering/import-2026-11-10` (excluding `dist/`, `node_modules/` and local secrets). The `Quality and scientific integrity` workflow passed for commit `05bac1489b9b51a47cc4e0812d05e8ca284fc1e5`; see the [successful run](https://github.com/mohammedjasim88/Nasamoham/actions/runs/42861872962). Review [draft PR #1](https://github.com/mohammedjasim88/Nasamoham/pull/1) before merging.
3. Create feature branches and Pull Requests rather than editing `main` directly. Apply one focused change at a time.
4. Perform a controlled NASA POWER / scientific validity review, including coordinate scope, data provenance, trend significance, reproducible evidence, and missing-data/error states.
5. Improve the user experience through measured fixes: responsive maps, lazy loads, loading/errors, accessible controls, keyboard navigation, and reduced-motion support.
6. For map or UI changes, manually run **Browser smoke checks**. Check artefacts/screenshots if the job fails.
7. Review Dependabot PRs individually. Check licence compatibility and do not enable paid services.
8. Promote to Cloudflare **only after explicit approval**, with a recorded rollback version. The included Actions jobs intentionally have **no deployment** permissions or steps.

## Local checks (Windows PowerShell)

```powershell
npm.cmd ci
npm.cmd run audit:repo
npm.cmd run qa
# Optional, slower browser tests:
npx.cmd playwright install chromium webkit
npm.cmd run test:e2e
```

## Current verification status and limitations

On 10 November 2026, the complete **195-file** import was committed on a private GitHub development branch. The remote GitHub Actions [quality workflow run #42861872962](https://github.com/mohammedjasim88/Nasamoham/actions/runs/42861872962) **completed successfully** for commit `05bac1489b9b51a47cc4e0812d05e8ca284fc1e5`, including the repository-safety scan, `npm ci`, existing scientific unit tests, TypeScript compilation, Vite build, and bundle-budget checks.

Before that remote run, an offline inspection attempted 137 tests: 136 passed and one could not load its `three` dependency. That local environment limitation was addressed for the complete GitHub run through the locked dependency install. Earlier failed CI runs were triggered on **incomplete intermediate imports** and do not describe the complete final snapshot.

**Not yet verified:** the optional manual Playwright browser smoke workflow, a new independent end-to-end NASA data audit, and any new Cloudflare production deployment. This repository does not automatically deploy to Cloudflare. The draft pull request must be reviewed before merge, and production deployment still requires explicit approval.

## Source and licensing boundaries

The original source archive contained 217 entries. The publication ZIP excludes generated `dist/` files; those are recreated with `npm run build`. Original NASA source CSVs and scientific code remain unchanged. Existing NASA imagery, geographic data, tiles, fonts and other third-party materials require attribution/licence review before making the repository public or submitting the hackathon work. Do not commit real secrets. Do not assume the heuristic secret scan catches every secret.

## GitHub repository status

- Private project repository: [mohammedjasim88/Nasamoham](https://github.com/mohammedjasim88/Nasamoham)
- Import branch: `engineering/import-2026-11-10`
- Draft review: [Pull Request #1](https://github.com/mohammedjasim88/Nasamoham/pull/1)
- Confirmed successful quality job: [Actions run #42861872962](https://github.com/mohammedjasim88/Nasamoham/actions/runs/42861872962)
- Existing Cloudflare production remains untouched.
