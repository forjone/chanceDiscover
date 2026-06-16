# 机会矿工 · Opportunity Miner

把散落在应用商店评论里的用户抱怨，提炼成**排序后、带证据、可执行**的产品机会卡片。

面向独立开发者的「下一步该做什么」发现工具——不与面向企业团队的反馈监控平台竞争，专注回答 *what should I build next*。

---

## 它解决什么

独立开发者最缺的不是执行力，而是**方向**。用户的真实痛点散落在成百上千条评论里，靠人工翻看既慢又容易遗漏。机会矿工把这条链路自动化：

```
评论采集  →  痛点聚类  →  四维打分  →  机会卡片  →  趋势核验
```

每张**机会卡片**包含：标题、核心痛点、目标用户、代表性证据（含来源应用与评分）、出现频次、现有方案、空白机会、建议形态，以及最关键的**反向尽调**——竞品为何还没解决，用来规避「看起来很美」的伪机会。

## 评分系统（四个加权维度，各 0–25 分，合成 0–100）

| 维度 | 权重 | 衡量什么 |
| --- | --- | --- |
| 需求强度 | 25% | 评论频次 + 情绪强度 |
| 付费意愿 | 30% | 明确的付费信号（"愿意付费"、"take my money"…） |
| 市场空白 | 30% | 现有方案的缺失 / 不足 |
| 时机趋势 | 15% | **真实**热度轨迹，而非 AI 臆测 |

> 时机维度坚持用真实数据：有 `YOUTUBE_API_KEY` 时取 YouTube 发布热度，否则用我们自己评论量的真实斜率兜底。

## 三阶段能力（已全部落地）

- **MVP** — 手动粘贴 / 录入评论 → 聚类 → 打分 → 生成机会卡片（含列表与详情 UI）
- **Phase 1 · 自动采集** — App Store RSS（免 key）与 Google Play 抓取，按应用名搜索后一键采集
- **Phase 2 · 监控与趋势** — 为每个痛点关键词记录真实热度轨迹并可视化；每次采集 / 挖掘都留存执行记录，支撑纵向积累

## 技术栈

- **Next.js 14**（App Router）+ TypeScript + Tailwind CSS
- **libSQL / Turso**（本地文件默认，可无缝切换远程 Turso）
- 数据模型：`apps`、`reviews`、`pain_clusters`、`opportunities`、`trends`、`runs`
- 聚类 / 情感 / 付费意愿 / 关键词抽取均为**离线确定性启发式**（中英双语词典），无需任何 LLM Key 即可跑通；`src/lib/*` 中的 `narrate*` 与聚类函数预留了接 LLM 的位置

## 快速开始

```bash
npm install
cp .env.example .env          # 可选：配置 Turso / YouTube Key
npm run seed                  # 灌入演示数据并跑一次挖掘
npm run dev                   # http://localhost:3000
```

不想用演示数据？直接 `npm run dev`，到「评论数据」页**手动录入**或**商店采集**，再点「开始挖掘」。

## 目录结构

```
src/
  app/
    page.tsx                  总览仪表盘
    opportunities/            机会卡片：列表 + 详情
    reviews/                  评论录入 / 商店采集
    apps/  trends/  runs/     矿源 / 趋势监控 / 挖掘记录
    api/                      apps reviews opportunities pipeline collect search runs trends
  components/                 Sidebar、评分可视化、客户端交互组件
  db/                         schema（建表）/ client（libSQL）/ repo（数据访问）/ seed
  lib/
    nlp.ts                    情感、付费意愿、关键词抽取（中英双语）
    clustering.ts             痛点聚类
    scoring.ts                四维加权打分
    cards.ts                  机会卡片生成
    pipeline.ts               全链路编排
    ingest.ts                 评论入库 + 手动文本解析
    collectors/               appstore（RSS）/ googleplay / youtube（趋势）
```

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | 默认 `file:./data/miner.db`；远程用 `libsql://<db>.turso.io` |
| `DATABASE_AUTH_TOKEN` | 仅远程 Turso 需要 |
| `YOUTUBE_API_KEY` | 可选；用于 Phase 2 真实趋势信号，缺省时用评论量轨迹兜底 |
| `APPSTORE_COUNTRY` | App Store RSS 默认地区，默认 `us` |

## 已知限制 / 后续

- 「重新挖掘」会重建痛点簇与机会卡片，当前会清空机会的人工状态标记（新发现/观察中/在做了/已归档）；后续可按簇标签做状态延续。
- 聚类与文案为启发式；接入 LLM 可显著提升痛点命名与卡片叙述质量（接口已预留）。
- Google Play 抓取依赖可选包 `google-play-scraper`，受网络 / 风控影响可能为空，此时建议使用 App Store 或手动录入。
- **采集功能需要外网出口**：App Store RSS / iTunes Search 需可访问 `itunes.apple.com`。若运行环境的网络策略限制出口（例如返回 403），采集会优雅降级为空并给出提示，请改用手动录入，或在开放出口的环境/本机运行。
