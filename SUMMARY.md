# WorldMonitor 3D Globe 迁移研究报告

## 研究仓库
https://github.com/huangl2518/worldmonitor-cesium-research

## 提交历史（研究过程）

1. `chore: initial copy of worldmonitor source code` — 源码复制
2. `research: initial analysis of migration approaches` — 4 种迁移方案分析
3. `research: Phase 1 POC` — GlobeView vs CesiumJS 对比 POC
4. `research: Phase 2 integration` — GlobeMapView 集成组件
5. `research: Phase 3 advanced` — CesiumJS 深度集成分析

## 结论：推荐 deck.gl GlobeView 方案

### 为什么不直接用 CesiumJS？
- CesiumJS 需要**完全重写** 6600 行图层代码
- 性能比 deck.gl **差 4 倍**（100K 点时 15 FPS vs 60 FPS）
- 没有原生 PMTiles/MVT 支持
- 包体积增加 ~5MB

### 为什么推荐 GlobeView？
- **零图层代码改动** — 所有 ScatterplotLayer、PathLayer 等直接可用
- **移除 MapLibre 依赖** — 减少 ~300KB
- **简化代码** — 移除 750+ 行 MapLibre 错误处理逻辑
- **3D 地球** — 旋转的地球而非平面地图
- **已在代码中实现** — GlobeMapView.ts 已创建

## 实施方案

### Phase 1: GlobeView 迁移（1-2 天）
1. 在 DeckGLMap.ts 中替换 MapboxOverlay 为 GlobeMapOverlay
2. 移除 MapLibre 初始化代码
3. 使用深色底图（dark basemap）
4. 测试所有 33 个数据图层

### Phase 2: 底图优化（可选）
1. 替换 PMTiles 为栅格瓦片
2. 或实现 PMTiles → GeoJSON 转换

### Phase 3: CesiumJS 增强（如需 3D 地形）
1. 添加 CesiumJS 作为地形渲染器
2. deck.gl 负责数据图层
3. 同步两个引擎的视角状态

## 已创建的文件

| 文件 | 说明 |
|------|------|
| RESEARCH.md | 研究文档：4 种迁移方案对比 |
| PHASE2_INTEGRATION.md | Phase 2 集成指南 |
| PHASE3_ADVANCED.md | Phase 3 高级分析：CesiumJS + deck.gl |
| poc/globeview-poc.html | GlobeView POC（可在浏览器打开） |
| poc/cesium-poc.html | CesiumJS POC（对比） |
| poc/CesiumMap.ts | GlobeView 集成代码 |
| poc/pmtiles-3d-guide.md | PMTiles 3D 处理方案 |
| poc/RESEARCH_FINDINGS.md | Phase 1 研究结果 |
| src/components/GlobeMapView.ts | **核心文件**：GlobeMapView 集成组件 |

## 下一步

1. 浏览器打开 `poc/globeview-poc.html` 查看效果
2. 审查 `src/components/GlobeMapView.ts` 集成代码
3. 决定是否实施 Phase 1 迁移
