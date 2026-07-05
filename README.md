# 脑洞组装工坊

`脑洞组装工坊` 是一个基于 `Vue 3 + Vite` 的互动式小说创作工作台，用来把“风向标 + 起始脑洞 + 分支选择”逐步组装成完整剧情，再按指定文风生成最终正文。

它现在不是单纯的一页原型，而是一个带本地项目、收藏库、提示词配置、右侧助手和 SQLite 持久化的创作工作台。

## 功能概览

### 1. 项目制创作

- 先创建项目，再进入创作流程。
- 当前项目会保存完整快照，包括脑洞候选、已选脑洞、导语、章节剧情、选项、钩子、大钩子和最终成文。
- 首页支持按更新时间或创建时间查看项目，并可重命名、切换、删除、导出全部数据。

对应实现：

- 项目首页与项目管理：`src/components/app/ProjectHome.vue`、`src/components/app/ProjectManagerModal.vue`
- 项目与导入导出逻辑：`src/app/useProjectLibrary.js`、`src/app/projects.js`
- 本地数据库 API：`server/index.js`、`src/services/databaseApi.js`

### 2. 脑洞生成与候选管理

- 左侧面板可输入一句起始脑洞，并上传风向标文件作为补充参考。
- AI 会生成一组脑洞候选，候选项包含正文、说明和评分信息。
- 已有脑洞候选时再次生成，会把新候选追加到原列表末尾，不会清空当前选定脑洞和后续内容。
- 候选支持选中、取消选中、编辑、删除、收藏。
- 收藏库中的脑洞支持两条路径：
  `追加到候选`：不打断当前进度，把收藏脑洞追加到候选列表。
  `选为当前脑洞`：仅在还没有选中脑洞、也还没生成导语时使用，用来直接替换当前起点。

对应实现：

- 左侧输入区：`src/components/app/BrainholeInputPanel.vue`
- 脑洞候选展示与操作：`src/components/app/BrainholeOptionsStage.vue`
- 脑洞相关状态与追加逻辑：`src/App.vue`、`src/app/useStoryFlow.js`、`src/app/brainholeOptions.js`

### 3. 导语、章节、选项、钩子推进

- 选定脑洞后，会生成导语和第一个剧情点。
- 每章按“剧情点 -> 选项 -> 继续生成”的方式推进。
- 剧情选项、章节钩子和大钩子选中后支持再次点击取消选中；在手动暂停流程中，取消选中会同步撤回待继续生成的旧选择。
- 未选定前，可以针对某一个剧情选项的结果、章节钩子/大钩子的剧情走向单独生成 4 个候选，并最终选用其中 1 个写回当前卡片。
- 常规章节结束后生成 4 个章节钩子，第四章后额外生成 4 个大钩子，作为关键转折。
- 整个流程不是固定卡点模板，而是让用户通过持续选择控制剧情分叉方向。

对应实现：

- 主工作台与阶段渲染：`src/components/app/StoryStageWorkspace.vue`
- 流程状态、章节结构、钩子解析：`src/storyState.js`
- AI 生成流程与阶段推进：`src/app/useStoryFlow.js`
- 默认提示词：`src/prompts.js`

### 4. 收藏库复用

- 可以把脑洞、剧情节点、剧情选项、章节钩子、大钩子加入收藏库。
- 收藏项保留类型、标题、摘要和结构化 payload，便于后续回填。
- 收藏库支持按标签页浏览、编辑、删除，也支持手动新增收藏。

对应实现：

- 收藏弹窗与编辑：`src/components/app/FavoritesLibraryModal.vue`、`src/components/app/FavoriteFormModal.vue`
- 收藏 payload 组装：`src/app/favorites.js`
- 收藏持久化：`src/app/useProjectLibrary.js`、`server/index.js`

### 5. 右侧工具区

- 右侧有两个核心方向：
  `AI 助手`：针对当前节点继续润色、重写，并可把回复应用到当前节点。
  `快捷工具`：复制正文、附带复制已选选项、查看流程记录，并控制自动生成行为。
- 提示词自动化目前包含两项开关：
  `自动生成剧情`：选中剧情选项或钩子后，自动继续生成下一段剧情。
  `自动生成选项`：剧情点生成后，自动继续生成当前节点的选项。
- 中间编辑区的“本次额外要求”会追加到导语、剧情点、选项、钩子和大钩子的本次生成提示词后，用于临时指定走向或风格；它随当前项目快照保存。

对应实现：

- 右侧面板：`src/components/app/EditorRightPanel.vue`
- 助手对话与应用逻辑：`src/App.vue`
- 正文复制与自动化设置：`src/app/useStoryFlow.js`、`src/app/browserStorage.js`

### 6. 提示词与模型配置

- 可以配置 API endpoint、模型名和密钥等 AI 接入参数。
- 提示词配置支持按生成环节维护，适合持续微调脑洞、导语、选项、钩子和最终成文的生成风格。
- 当前默认提示词定义在前端，数据库也支持保存和重置提示词配置。

对应实现：

- 模型配置：`src/components/app/ApiConfigModal.vue`、`src/services/apiConfig.js`
- 提示词配置：`src/components/app/PromptConfigModal.vue`、`src/app/promptConfig.js`、`src/prompts.js`
- 提示词配置接口：`server/index.js`、`src/services/databaseApi.js`

### 7. 本地数据与迁移

- 当前默认使用本地 `Express + SQLite` 保存项目、收藏、提示词和当前项目指针。
- 数据库文件位于 `data/brainhole.sqlite`。
- 项目支持导出全部数据为 JSON，也支持把旧的浏览器本地数据导入到数据库模式。

对应实现：

- 数据库初始化：`server/db.js`
- HTTP API：`server/index.js`
- 浏览器本地数据兼容：`src/app/browserStorage.js`

## 当前架构

- 前端入口：`src/App.vue`
- 视图组件：`src/components/app/`
- 创作流程逻辑：`src/app/useStoryFlow.js`
- 项目/收藏/导入导出：`src/app/useProjectLibrary.js`
- 结构化状态与解析函数：`src/storyState.js`
- 提示词定义：`src/prompts.js`
- 后端服务：`server/`

`AGENTS.md` 现在只保留给代理/自动化协作用的导航和编辑提醒，不再重复这里的功能说明。

## 开发运行

安装依赖：

```bash
npm install
```

同时启动前端和本地 API：

```bash
npm run dev:full
```

只启动后端：

```bash
npm run server
```

只启动前端：

```bash
npm run dev
```

构建检查：

```bash
npm run build
```

## 运行说明

- Vite 默认通过代理把 `/api` 转发到 `http://127.0.0.1:43128`，配置见 `vite.config.js`。
- 如果 `5173` 被占用，可以手动运行：

```bash
npx vite --host 127.0.0.1 --port 43129
```

- 如果是从旧版本切换过来，首次启动后可以通过应用内导入功能把浏览器本地数据迁入 SQLite。
