# Windows local runtime fix — v2.1.2

## What failed?
`npm test` completed successfully (31/31 on the user's Windows machine). `tsc --noEmit && vite build` completed successfully. The crash occurred when `wrangler dev` started the native `workerd` executable with an access violation (`0xc0000005`) and stack overflow.

This is a Windows native runtime failure, not evidence that the TypeScript build failed or the website's NASA calculations are inaccurate.

## Recommended local preview
Double-click `start_windows.bat` in this package. It runs tests and a real React production build, then starts `scripts/local_node_preview.mjs` using built-in Node.js HTTP APIs on `http://127.0.0.1:8787`.

The Node preview uses the same JavaScript request handler as the Cloudflare Worker for `/api/status`, `/api/power`, `/api/boundaries`, `/api/ask` and serves the Vite build from `dist`. It avoids the Windows workerd executable. It does NOT completely emulate Cloudflare's runtime (Cloudflare cache, Workers AI, limits, routing security, etc). NASA/NCSI require working internet. Cloudflare Workers AI is intentionally not enabled.

If `start_windows.bat` cannot launch, open PowerShell in the project directory:
```
npm install
npm test
npm run build
node scripts/local_node_preview.mjs
```
Then visit http://127.0.0.1:8787 and http://127.0.0.1:8787/api/status.

## If you want to repair wrangler dev as well
1. Install/repair the latest Visual C++ v14 x64 Redistributable from https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist (Microsoft official site), then restart Windows.
2. The npm log notes blocked postinstall scripts for `workerd` and `esbuild`. Review with `npm install-scripts ls`. Only after inspecting and trusting these dependencies, run `npm install-scripts approve workerd esbuild` and then `npm install`.
3. Try `start_cloudflare_dev.bat` or `npx wrangler dev --port 8787`.
4. If it still crashes, file an issue at https://github.com/cloudflare/workers-sdk/issues with sanitized logs. Do not disable Windows security or bypass antivirus checks.

## Deploy
`deploy_windows.bat` still uses `wrangler deploy`, independently of the local preview. Running start_windows.bat does not modify the deployed Cloudflare site.
