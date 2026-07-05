# Agent Notes

## Project Navigation

- Product and feature description lives in `README.md`.
- Main app shell lives in `src/App.vue`.
- App workflow logic is split across `src/app/useStoryFlow.js` and `src/app/useProjectLibrary.js`.
- Reusable app UI lives in `src/components/app/`.
- Story state helpers live in `src/storyState.js`.
- Prompt defaults live in `src/prompts.js`.
- Local persistence API lives in `server/`, with frontend wrappers in `src/services/databaseApi.js`.

## Run And Verify

- Build check: `npm run build`.
- Full local app: `npm run dev:full`.
- Frontend only: `npm run dev`.
- Backend only: `npm run server`.
- If Vite cannot bind to `5173`, start it manually on a high port, for example:
  `npx vite --host 127.0.0.1 --port 43129`.

## Working Rules

- Treat this file as a navigation guide plus editing cautions. Put product-facing feature detail in `README.md`, not here.
- For manual file edits, use `apply_patch` through a `bash` heredoc. PowerShell here-strings can break UTF-8 patch arguments in this workspace.
- The app is project-first. Before adding new mutating actions, verify whether they should require an active project.
- Prefer narrowly scoped edits and follow the existing split between `src/App.vue`, `src/app/`, and `src/components/app/`.
- Avoid broad reformatting or cleanup in a dirty worktree.
- Before finalizing behavior changes, run `npm run build`.

Correct patch pattern:

```bash
apply_patch <<'PATCH'
*** Begin Patch
*** Update File: path/to/file
@@
-old text
+new text
*** End Patch
PATCH
```

## Implementation Pointers

- `state.brainholeOptions` is the source list of candidate brainholes.
- `state.brainhole` and `state.selectedBrainholeIndex` represent the current chosen brainhole.
- `clearBrainholeContinuation()` clears downstream generated content, so do not call it for append-style operations.
- After changing brainhole candidates, refresh the workspace using the same local patterns already used by the flow code.

每次执行后迭代沉淀相关指导文件