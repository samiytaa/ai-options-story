使用简体中文和用户沟通

## Project Navigation

- Product and feature description lives in `README.md`.
- Current feature state lives in `feature_list.json`, `progress.md`, and `session-handoff.md`.
- Migration execution checklist lives in `todo.md`.
- Main app shell lives in `src/App.vue`.
- App workflow logic is split across `src/app/useStoryFlow.js` and `src/app/useProjectLibrary.js`.
- Reusable app UI lives in `src/components/app/`.
- Story state helpers live in `src/storyState.js`.
- Prompt defaults live in `src/prompts.js`.
- Local persistence API lives in `server/`, with frontend wrappers in `src/services/databaseApi.js`.

## Run And Verify

- Build check: `npm run build`.
- Harness verification: `./init.sh` or Windows-native `init.bat`.
- Full local app: `npm run dev:full`.
- Frontend only: `npm run dev`.
- Backend only: `npm run server`.
- If Vite cannot bind to `5173`, start it manually on a high port, for example:
  `npx vite --host 127.0.0.1 --port 43129`.

## Working Rules

- Treat this file as a navigation guide plus editing cautions. Put product-facing feature detail in `README.md`, not here.
- For manual file edits, use `apply_patch` through a `bash` heredoc. PowerShell here-strings can break UTF-8 patch arguments in this workspace.
- In this workspace on Windows, do not pass patches to `apply_patch` through PowerShell pipes or here-strings. If the standard `bash` heredoc path fails, call the underlying Codex patch runner directly with one full UTF-8 patch argument.
- The app is project-first. Before adding new mutating actions, verify whether they should require an active project.
- Prefer narrowly scoped edits and follow the existing split between `src/App.vue`, `src/app/`, and `src/components/app/`.
- Avoid broad reformatting or cleanup in a dirty worktree.
- When searching project files, skip `node_modules` and `dist`.
- Before finalizing behavior changes, run `npm run build`.
- After each execution, if there is a meaningful next step, include a copy-ready next-step prompt that the user can paste into Codex, with the necessary context.

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

## Startup Workflow

每次开始先读：

- `AGENTS.md`
- `feature_list.json`
- `progress.md`
- `session-handoff.md`

如果这些状态文件不在仓库根目录，先定位实际路径，再继续执行；不要默认它们一定存在于根目录。

一次只处理 `feature_list.json` 中的一个 active / in-progress feature。若要切换任务，先把当前任务完成、阻塞原因或交接信息写入 `progress.md` 和 `session-handoff.md`。

## One Feature At A Time

一次只做一个用户请求 / 一个 feature。`feature_list.json` 是范围边界；不要在未完成、未阻塞或未交接当前 feature 前开启新的实现范围。

## Definition of Done

行为变更完成必须同时满足：

1. 用户要求的效果已经实现，且没有越过当前 feature 范围。
2. 项目快照、提示词、素材或故事状态相关变更遵守上面的项目优先规则。
3. 已运行 `npm run build`，或明确说明无法运行的原因。
4. 必要时更新 `README.md`、`progress.md`、`session-handoff.md` 或 `feature_list.json`。
5. 如果存在明确下一步，最终回复包含可复制给 Codex 的下一步提示词。

## End Of Session

结束一次有实质改动的会话前：

1. 更新 `progress.md` 的当前状态、风险和验证证据。
2. 更新 `session-handoff.md` 的变更文件、决策、阻塞和下一步。
3. 若 feature 状态变化，同步更新 `feature_list.json`。
4. 运行 `./init.sh` 或至少运行 `npm run build` 与 JSON 校验。

## Knowledge Capture

- After each change, update the smallest relevant doc only when the work teaches a reusable rule.
- Put product-facing feature behavior, workflow descriptions, and user-visible capability changes in `README.md`.
- Put agent navigation, editing cautions, verification commands, and cross-cutting implementation guardrails in `AGENTS.md`.
- Do not add one-off feature changelog entries to `AGENTS.md`; keep it short enough to scan before editing.
