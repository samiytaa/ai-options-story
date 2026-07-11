import assert from 'node:assert/strict'

import { normalizeAssetAnalysisResults } from '../src/features/materialExtractor/assetRecords.js'
import { ASSET_PATH_REGISTRY } from '../src/features/materialExtractor/assetPathRegistry.js'
import { normalizeTrackAnalysis } from '../src/features/materialExtractor/trackAnalysisState.js'

function createAssetNormalizer(track) {
  return normalizeAssetAnalysisResults({
    variable_library: [
      {
        asset_id: 'variable_library_demo_01',
        asset_type: 'variable_library',
        metadata: {
          track: 'stale_track',
          resolved_path: 'stale/path',
        },
        core_data: {
          red_lines: {
            primary_genre: 'stale_track',
          },
        },
      },
    ],
  }, ASSET_PATH_REGISTRY, {
    getPathVariables(assetType, index) {
      return {
        track,
        track_id: track,
        story: '测试故事',
        story_slug: '测试故事',
        asset_type: assetType,
        index: String(index).padStart(2, '0'),
        feature: '通用',
      }
    },
    resolveTemplate(template, variables) {
      return template
        .replaceAll('[track_id]', variables.track)
        .replaceAll('[story_slug]', variables.story)
    },
    makeSuggestedFilename(assetType) {
      return `${assetType}_${track}.md`
    },
  })
}

const normalizedTrack = normalizeTrackAnalysis({
  source_story: '重生长姐',
  primary_track: '02_世情爽文',
  sample_folder: '02_样文与拆解/01_赛道样文/[track_id]/',
  confidence: 'high',
  risk_notes: [],
  structure_signature: {},
  evidence: [],
})

assert.equal(normalizedTrack.primary_track, '02_世情爽文')
assert.equal(normalizedTrack.sample_folder, '02_样文与拆解/01_赛道样文/02_世情爽文/')
assert.ok(!normalizedTrack.sample_folder.includes('[track_id]'))

const unknownTrack = normalizeTrackAnalysis({
  source_story: '未定题材样文',
  primary_track: 'UNKNOWN',
  confidence: 'low',
  risk_notes: [],
  structure_signature: {},
  evidence: [],
})

assert.equal(unknownTrack.sample_folder, '02_样文与拆解/09_待分拣样文/')
assert.deepEqual(unknownTrack.risk_notes, ['赛道暂时无法判断，等待人工确认。'])

const beforeConfirm = createAssetNormalizer('UNKNOWN')
assert.equal(
  beforeConfirm.variable_library[0].metadata.resolved_path,
  '04_DNA资产库/01_L1高频原料/01_变量库/UNKNOWN/',
)

const afterConfirm = createAssetNormalizer('02_世情爽文')
assert.equal(afterConfirm.variable_library[0].metadata.track, '02_世情爽文')
assert.equal(
  afterConfirm.variable_library[0].metadata.resolved_path,
  '04_DNA资产库/01_L1高频原料/01_变量库/02_世情爽文/',
)
assert.equal(afterConfirm.variable_library[0].suggested_filename, 'variable_library_02_世情爽文.md')

console.log('track analysis verification passed')
