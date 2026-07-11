---
name: 配置_模块G_DNA路径映射
type: 配置
consumer: 指令_模块G_DNA拆解
---

## 使用边界

本配置不是分析提示词的一部分。仅在用户已回复“确认入库”且当前环境具有目标知识库写入能力时读取。对话交付阶段只输出 `asset_id`、`asset_type` 和 `suggested_filename`，不输出路径，也不得声称已经创建文件。

## 路径映射

| asset_type | 存放路径（相对 根目录） | 建议文件名 |
|---|---|---|
| `variable_library` | `04_DNA资产库/01_L1高频原料/01_变量库/[track_id]/` | `变量库_[track_id]_[故事名]_[序号].md` |
| `rhythm_template` | `04_DNA资产库/01_L1高频原料/02_节奏模板库/[track_id]/` | `节奏模板_[track_id]_[故事名]_[序号].md` |
| `emotional_anchor` | `04_DNA资产库/01_L1高频原料/03_情感锚点库/[track_id]/` | `情感锚点_[track_id]_[故事名]_[序号].md` |
| `suspense_template` | `04_DNA资产库/01_L1高频原料/04_悬念模板库/[track_id]/` | `悬念模板_[track_id]_[故事名]_[序号].md` |
| `gratification_formula` | `04_DNA资产库/01_L1高频原料/05_爽点配方库/[track_id]/` | `爽点配方_[track_id]_[故事名]_[序号].md` |
| `intro_template` | `04_DNA资产库/01_L1高频原料/06_导语拆解库/[track_id]/` | `导语拆解_[track_id]_[故事名]_[序号].md` |
| `opening_template` | `04_DNA资产库/01_L1高频原料/07_开篇拆解库/[track_id]/` | `开篇拆解_[track_id]_[故事名]_[序号].md` |
| `asset_relationship_network` | `04_DNA资产库/02_L2结构机制/08_资产关系网络/[track_id]/` | `资产关系网络_[故事名].json` |
| `agency_curve` | `04_DNA资产库/02_L2结构机制/09_行动力曲线库/[track_id]/` | `行动力曲线_[track_id]_[故事名]_[序号].md` |
| `character_highlight` | `04_DNA资产库/02_L2结构机制/10_人物高光库/[track_id]/` | `人物高光_[track_id]_[故事名]_[序号].md` |
| `high_octane_scene` | `04_DNA资产库/02_L2结构机制/11_高燃场面库/[track_id]/` | `高燃场面_[track_id]_[故事名]_[序号].md` |
| `conflict_escalation_formula` | `04_DNA资产库/02_L2结构机制/12_冲突升级库/[track_id]/` | `冲突升级公式_[track_id]_[故事名]_[序号].md` |
| `structural_technique` | `04_DNA资产库/02_L2结构机制/13_结构技法库/[track_id]/` | `结构技法_[track_id]_[故事名]_[序号].md` |
| `structural_skeleton` | `04_DNA资产库/02_L2结构机制/14_结构骨架库/[track_id]/` | `结构骨架_[track_id]_[故事名]_[序号].md` |
| `world_setting` | `04_DNA资产库/02_L2结构机制/15_世界观设定库/[track_id]/` | `世界观设定_[track_id]_[故事名]_[序号].md` |
| `character_profile` | `04_DNA资产库/02_L2结构机制/16_人物小传库/[track_id]/` | `人物小传_[track_id]_[故事名]_[序号].md` |
| `chapter_outline` | `04_DNA资产库/02_L2结构机制/17_逐章大纲库/[track_id]/` | `逐章大纲_[track_id]_[故事名]_[序号].md` |
| `character_arc_framework` | `04_DNA资产库/03_L3深度参考/18_人物弧光库/[track_id]/` | `人物弧光框架_[track_id]_[故事名]_[序号].md` |
| `language_dna` | `04_DNA资产库/03_L3深度参考/19_语言DNA库/[track_id]/` | `语言DNA摘要_[track_id]_[故事名]_[序号].md` |
| `theme_template` | `04_DNA资产库/03_L3深度参考/20_主题拆解库/[track_id]/` | `核心思想_主题_[track_id]_[故事名]_[序号].md` |

`[track_id]` 必须来自已确认赛道。无法判断时使用 `UNKNOWN`，并保留无法判断原因。赛道分析结果存放在 `02_样文与拆解/`，不是 DNA 资产，不得放进 `analysis_results`。文件名不得包含括号、斜杠和其他路径分隔符。
