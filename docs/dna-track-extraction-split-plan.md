# DNA Track Analysis and Asset Extraction Split Plan

## Goal

Separate track analysis from DNA asset extraction.

Track analysis decides where a story belongs and which track context should drive later work.
Asset extraction turns a confirmed story and track context into reusable DNA records.

## Current Problem

`src/features/materialExtractor/aiPrompts.js` currently loads these prompt sources into one AI call:

- `提示词/指令_模块G_DNA拆解.md`
- `提示词/配置_模块G_DNA路径映射.md`
- `提示词/短故事工业化骨架与赛道结构系统.md`

That makes one request do two jobs:

- classify the sample into a track;
- extract reusable assets.

The result is fragile because path variables, `metadata.track`, and asset folder resolution may be based on a rough local guess instead of an explicit user-confirmed track analysis.

## Functional Boundary

### Track Analysis

Input:

- story title;
- story text;
- optional platform or target market note.

Output:

```json
{
  "track_analysis": {
    "source_story": "string",
    "primary_track": "string",
    "secondary_tracks": ["string"],
    "confidence": "low | medium | high",
    "sample_folder": "02_样文与拆解/01_赛道样文/[track_id]/",
    "objective_features": ["string"],
    "reader_expectation": "string",
    "emotional_promise": ["string"],
    "structure_signature": {
      "opening": "string",
      "development": "string",
      "turn": "string",
      "ending": "string"
    },
    "risk_notes": ["string"],
    "evidence": [
      {
        "quote": "string",
        "interpretation": "string",
        "chapter": 1,
        "approx_char_offset": 0
      }
    ]
  }
}
```

Rules:

- no DNA asset records here;
- no `analysis_results`;
- no folder write claim;
- unknown track is allowed, but must include reason and evidence gap.

### Asset Extraction

Input:

- story title;
- story text;
- confirmed `track_analysis.primary_track`;
- optional extraction mode: quick or full.

Output keeps the existing contract:

```json
{
  "extraction_summary": {},
  "analysis_results": {
    "variable_library": [],
    "rhythm_template": [],
    "emotional_anchor": [],
    "suspense_template": [],
    "gratification_formula": []
  }
}
```

Rules:

- `metadata.track` must come from confirmed track analysis;
- asset paths use confirmed track variables;
- extraction may reference track context, but must not re-classify the story as a side effect;
- `variable_library.core_data.red_lines.primary_genre` should mirror the confirmed track unless the asset evidence contradicts it.

## Optimized Path Structure

The current path mapping mixes track routing with asset folders under `04_DNA片段库`.
Use two roots instead:

```text
02_样文与拆解/
├─ 01_赛道样文/
├─ 02_赛道分析/
├─ 03_赛道结构卡/
└─ 09_待分拣样文/

04_DNA资产库/
├─ 00_资产关系网络/
├─ 01_L1高频原料/
├─ 02_L2结构机制/
└─ 03_L3深度参考/
```

### Track Root

```text
02_样文与拆解/
├─ 01_赛道样文/[track_id]/[story_slug].md
├─ 02_赛道分析/[track_id]/[story_slug].track.json
├─ 03_赛道结构卡/[track_id].md
└─ 09_待分拣样文/[story_slug].md
```

Purpose:

- raw or cleaned sample text;
- one track-analysis result per sample;
- aggregated track cards;
- samples that cannot be confidently classified.

### DNA Asset Root

```text
04_DNA资产库/
├─ 00_资产关系网络/[track_id]/资产关系网络_[story_slug].json
├─ 01_L1高频原料/
│  ├─ 01_变量库/[track_id]/
│  ├─ 02_节奏模板库/[track_id]/
│  ├─ 03_情感锚点库/[track_id]/
│  ├─ 04_悬念模板库/[track_id]/
│  ├─ 05_爽点配方库/[track_id]/
│  ├─ 06_导语拆解库/[track_id]/
│  └─ 07_开篇拆解库/[track_id]/
├─ 02_L2结构机制/
│  ├─ 08_行动力曲线库/[track_id]/
│  ├─ 09_人物高光库/[track_id]/
│  ├─ 10_高燃场面库/[track_id]/
│  ├─ 11_冲突升级库/[track_id]/
│  ├─ 12_结构技法库/[track_id]/
│  ├─ 13_结构骨架库/[track_id]/
│  ├─ 14_世界观设定库/[track_id]/
│  ├─ 15_人物小传库/[track_id]/
│  └─ 16_逐章大纲库/[track_id]/
└─ 03_L3深度参考/
   ├─ 17_人物弧光库/[track_id]/
   ├─ 18_语言DNA库/[track_id]/
   └─ 19_主题拆解库/[track_id]/
```

Benefits:

- the left number is now workflow order, not inherited legacy folder number;
- L1/L2/L3 are visible in the filesystem, UI, and metadata;
- track analysis artifacts are kept outside the DNA asset root;
- every path can be resolved from `asset_type`, `level`, `display_order`, and confirmed `track_id`.

## Implementation Phases

### Phase 1: Contracts and Prompt Split

Create:

- `src/features/materialExtractor/trackPrompts.js`
- `src/features/materialExtractor/extractionPrompts.js`

Change:

- keep track prompt focused on `短故事工业化骨架与赛道结构系统.md`;
- keep extraction prompt focused on DNA asset schema and output contract;
- remove track-analysis responsibility from extraction prompt.

Done when:

- track request returns only `track_analysis`;
- extraction request returns only `extraction_summary` and `analysis_results`;
- `npm run build` passes.

### Phase 2: AI Client Split

Create:

- `requestTrackAnalysis(config, input)`
- `requestAssetExtraction(config, input)`

Change:

- keep shared JSON parsing helpers;
- add `validateTrackAnalysisResponse`;
- keep existing extraction validator for asset results.

Done when:

- invalid track responses fail with readable Chinese errors;
- invalid asset responses still fail loudly;
- `npm run build` passes.

### Phase 3: State and Persistence

Add state:

- `state.trackAnalysis`;
- `state.confirmedTrack`;
- `state.trackAnalysisPending`;
- `state.extractionPending`.

Persist with current project material extraction record:

- `trackAnalysis`;
- `confirmedTrack`;
- `sourceTitle`;
- `sourceText`;
- `analysisResults`;
- `extractionSummary`;

Done when:

- page reload restores track analysis and extraction results separately;
- extraction can reuse confirmed track without re-running track analysis.

### Phase 4: Path Mapping Upgrade

Create a canonical mapping module:

- `src/features/materialExtractor/assetPathRegistry.js`

It should export:

- `TRACK_SAMPLE_PATHS`;
- `ASSET_PATH_REGISTRY`;
- `resolveTrackPath`;
- `resolveAssetPath`;
- `makeAssetFilename`.

Done when:

- UI path view uses the new clear path structure;
- `metadata.resolved_path` uses confirmed track;
- no code path calls keyword `detectGenre()` for final path resolution.

### Phase 5: UI Workflow

Change the material extractor page into a two-step workflow:

1. `赛道分析`
2. `DNA抽取`

UI rules:

- show track analysis result before asset extraction;
- allow manual track confirmation or correction;
- disable DNA extraction until a track is confirmed, except when user explicitly chooses `UNKNOWN`;
- keep the asset library browser grouped by L1/L2/L3.

Done when:

- user can run track analysis alone;
- user can run asset extraction after confirming track;
- existing database and path tabs still work.

## Verification

Run after each phase:

```bash
npm run build
```

Manual checks:

- track analysis returns no `analysis_results`;
- extraction returns no `track_analysis`;
- confirmed track changes `metadata.track` and `[track_id]` path resolution;
- saved project restores both track result and asset result;
- path view displays the optimized structure.

