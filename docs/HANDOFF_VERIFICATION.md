# Portable handoff verification

Export date: 14 November 2026 (UTC).
Source commit: `563a659eee0e25cdb8b1a21516345b2fcccea05d`.

## Rechecked for this handoff

- The source checkout was clean before export.
- `npm test` passed **42/42** tests in Node.js **v24.22.1**.
- `npm run build` passed the TypeScript check and Vite production build.
- Vite reported a nonblocking large-chunk warning: JavaScript 583.93 kB, 151.97 kB gzip.
- Exported tracked files were byte-checked against the source snapshot before documentation-only adjustments. Application code, tests, package manifest, lockfile and assets are unchanged.
- All five test files, all source modules, the lockfile, Vite/TypeScript configuration and the referenced local images/fonts are included.
- ZIP entries were checked for safe relative paths, excluded-file rules, CRC integrity and byte-for-byte agreement with the staged export.
- `FILE_MANIFEST.sha256` lists the included file hashes, excluding the manifest itself.

The commands above were rerun in the original checkout, whose application files match the export. A separate fresh `npm ci` installation was not performed during packaging.

## Browser coverage

No new browser session was needed for this documentation/export task. The existing `VERIFICATION.md` contains the latest observed browser flow and 56 page + 20 dialog viewport checks. Those results are not reclassified as tests performed during ZIP packaging. Existing JSON evidence remains included. Browser screenshots are retained in the original project and omitted from this portable source package.

## Boundaries

This is source for the completed local-demo frontend. No backend service, database, production authentication, external payment, carrier service, credentials, dependencies or compiled build output is included. Run `npm ci` after extraction, then `npm run dev`.

`CLAUDE.md`, `START_HERE_TH.md` and `PROMPT_FOR_CLAUDE.txt` explain how to continue with Node.js/TypeScript without losing the existing UI and behaviors.
