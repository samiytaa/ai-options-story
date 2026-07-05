使用简体中文和用户沟通

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
- Brainhole output quality rules should be enforced in layers: default prompt text in `src/prompts.js`, runtime guards in `src/app/promptConfig.js`, and parser/display fallbacks in `src/app/brainholeOptions.js` plus related UI styles.
- Prompt config edits are database-backed: track dirty prompt IDs, flush pending saves before closing/resetting, and bump the prompt editor version after reset so contenteditable prompt fields re-render from backend defaults.
- `state.customPromptInstruction` is the per-project, editor-area extra instruction. Append it at runtime to middle-flow generation prompts only; keep persistent default prompt edits in `src/prompts.js`/prompt config instead.
- For API model selection in `ApiConfigModal.vue`, keep manual model entry available and avoid native `datalist` for fetched model lists; browser rendering can hide most cached options.
- Edit/add dialogs that mutate the active project snapshot should explicitly call `saveCurrentProjectSnapshot()` after a successful local state change, instead of relying only on the delayed deep watcher.
- Editor-area actions that mutate story state, story blocks, wind-vane files, generated choices, or reset state should also flush `saveCurrentProjectSnapshot()` when the action completes.
- Generated guide/plot block presentation lives in `StoryStageWorkspace.vue`; keep display-only helpers such as word counts local to that component unless other views need the same behavior.

## Knowledge Capture

- After each change, update the smallest relevant doc only when the work teaches a reusable rule.
- Put product-facing feature behavior, workflow descriptions, and user-visible capability changes in `README.md`.
- Put agent navigation, editing cautions, verification commands, and cross-cutting implementation guardrails in `AGENTS.md`.
- Do not add one-off feature changelog entries to `AGENTS.md`; keep it short enough to scan before editing.
