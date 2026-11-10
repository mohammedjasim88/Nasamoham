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

1. Create a **private, separate** GitHub repository, `oman-earth-intelligence`. Do not use the unrelated `UTAS-AstroSat` repository.
2. Commit the clean source tree (exclude `dist/`, `node_modules/`, and all local `.env` files), with this GitHub automation. Confirm `Quality and scientific integrity` passes in the **remote** environment before relying on it.
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

## Current verification limitations

The 10 November local review found **137 attempted unit tests, 136 passed, 1 failed** because the local dependency `three` was unavailable (`ERR_MODULE_NOT_FOUND`). `npm ci` timed out in the inspection runtime, so no complete clean install, build, full quality run or remote GitHub Actions success is claimed. The GitHub workflow must run and pass on the new repository before this release can be considered fully verified. Earlier documentation describes prior successful runs, but they are not substitutes for fresh verification.

## Source and licensing boundaries

The original source archive contained 217 entries. The publication ZIP excludes generated `dist/` files; those are recreated with `npm run build`. Original NASA source CSVs and scientific code remain unchanged. Existing NASA imagery, geographic data, tiles, fonts and other third-party materials require attribution/licence review before making the repository public or submitting the hackathon work. Do not commit real secrets. Do not assume the heuristic secret scan catches every secret.

## GitHub constraints

This connected GitHub integration can read and edit **existing repositories**, but it does not expose a repository-creation action. No independent repository was created and nothing was pushed to GitHub. Create a new **private** repository at https://github.com/new without README or .gitignore, then upload/push the extracted files. Once the repository exists, review the Actions jobs and alerts.
