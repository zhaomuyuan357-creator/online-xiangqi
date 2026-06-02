# 进度跟踪

## Session 1 ✅ 完成

**目标**：项目初始化 + 规则引擎集成 + Canvas 棋盘渲染

### 已完成

- [x] Monorepo 初始化（pnpm workspaces）
- [x] Vue 3 + Vite + TypeScript 客户端
- [x] 安装 `elephantops` 规则引擎
- [x] 游戏状态 Composable (`useXiangqi`)
- [x] Canvas 棋盘渲染器（网格、九宫格、楚河汉界、位置标记）
- [x] Canvas 棋子渲染器（圆形 + 汉字 + 渐变效果）
- [x] 点击交互（选子、显示合法走法、走棋）
- [x] App.vue 组装（棋盘 + 状态面板 + 重新开始按钮）

### 验证结果

- TypeScript 编译无错误
- elephantops 集成正常工作
- 初始 FEN 正确
- 合法走法计算正确
- 开发服务器运行正常 (`pnpm dev`)

### 关键文件

| 文件 | 作用 |
|---|---|
| `packages/client/src/composables/useXiangqi.ts` | 游戏状态管理 |
| `packages/client/src/canvas/boardRenderer.ts` | 棋盘绘制 |
| `packages/client/src/canvas/pieceRenderer.ts` | 棋子绘制 |
| `packages/client/src/canvas/interaction.ts` | 交互处理 |
| `packages/client/src/App.vue` | 主页面 |

---

## Session 2 📋 待完成

**目标**：棋子交互优化 + 游戏流程完善

### 待办

- [ ] 拖拽走棋支持
- [ ] 吃子动画效果
- [ ] 将军/将杀音效（"牢第坐下"）
- [ ] 游戏结束弹窗
- [ ] 走棋历史记录
- [ ] 悔棋功能（需要双方确认）

---

## Session 3 📋 待完成

**目标**：WebSocket 服务端 + 联网对战

### 待办

- [ ] Node.js + WebSocket 服务端
- [ ] 房间管理（创建/加入/离开）
- [ ] 消息协议实现
- [ ] 服务端棋步校验
- [ ] 断线重连
- [ ] 双人联网对战

---

## Session 4 📋 待完成

**目标**：音效 + 测试 + 部署

### 待办

- [ ] 音效集成（"牢第坐下"录音）
- [ ] 单元测试（规则引擎）
- [ ] 集成测试（WebSocket 通信）
- [ ] 性能优化
- [ ] 部署准备

---

## 技术决策记录

### elephantops 使用要点

- 使用 `shallowRef` 管理游戏状态（类内部状态变化不触发 reactivity）
- 走棋后必须 `clone()` 再替换 ref：`game.value = game.value.clone()`
- Square 坐标系：`index = file + 9 * rank`，rank 0 = 红方底线
- SquareName 格式：`a1`-`i10`（rank 从 1 开始）
- `parseSquare("e0")` 返回 `undefined`，必须用 `parseSquare("e1")` 等

### Canvas 渲染

- gridSize = 60px，padding = 40px
- 棋盘总尺寸：520x580px
- 棋子用 Canvas 绘制（圆形渐变 + 汉字）
- 红方：红底白字；黑方：黑底白字
