# 线上象棋 — 设计文档

## 项目概述

浏览器端中国象棋双人实时对战应用。

## 技术栈

| 层 | 技术选型 |
|---|---|
| 前端框架 | Vue 3 + Vite |
| 语言 | TypeScript |
| 棋盘渲染 | Canvas 2D |
| 后端 | Node.js + WebSocket |
| 规则引擎 | `elephantops`（GPL-3.0） |
| 棋子素材 | 开源图片 |
| 仓库结构 | Monorepo（npm/pnpm workspaces） |

## 架构设计

### 通信模型：服务端权威

- 客户端发送走棋请求（`from`, `to`）
- 服务端校验棋步合法性（通过 `elephantops`）
- 合法则广播给双方，非法则返回错误

### WebSocket 消息协议

```typescript
// 客户端 → 服务端
type ClientMessage =
  | { type: 'join', roomId: string }
  | { type: 'move', from: Square, to: Square }
  | { type: 'resign' }
  | { type: 'draw_offer' }
  | { type: 'draw_accept' }

// 服务端 → 客户端
type ServerMessage =
  | { type: 'game_start', color: 'red' | 'black' }
  | { type: 'move', from: Square, to: Square, fen: string }
  | { type: 'game_over', reason: string, winner?: 'red' | 'black' }
  | { type: 'error', message: string }
  | { type: 'opponent_disconnected' }
```

## 游戏规则

- **红黑分配**：创建房间者执红先手
- **房间加入**：支持房间号输入 + URL 分享链接
- **游戏结束**：弹窗显示结果 → "再来一局" → 回首页

## 规则引擎

使用 `elephantops`，已验证以下规则实现正确：

- ✅ 马蹩马腿
- ✅ 象塞象眼
- ✅ 将帅对面
- ✅ 九宫限制
- ✅ 过河兵
- ✅ 将军/绝杀检测
- ✅ FEN/SAN/PGN/UCCI 支持

## 视觉设计

- **棋盘**：传统木纹纹理背景，Canvas 2D 绘制网格线、九宫格斜线、楚河汉界
- **棋子**：使用开源 SVG/PNG 棋子图片素材
- **风格**：传统古典风

## 音效

- 每步棋落子时播放音效："牢第坐下"
- 素材来源：用户自行录音（mp3/wav）

## MVP 范围（不包含）

以下功能不在 MVP 范围内，后续迭代添加：

- ❌ 悔棋
- ❌ 计时器/时钟
- ❌ 数据持久化（棋谱存储、用户系统）
- ❌ 随机匹配
- ❌ 聊天功能
- ❌ 观战模式
- ❌ 部署上线

## 测试策略

1. **手动测试**：两个浏览器标签页模拟对局
2. **单元测试**：规则引擎核心逻辑（走法校验、将军检测等）

## 目录结构（规划）

```
线上象棋/
├── packages/
│   ├── client/          # Vue 3 前端
│   │   ├── src/
│   │   │   ├── components/   # Vue 组件
│   │   │   ├── canvas/       # Canvas 渲染逻辑
│   │   │   ├── assets/       # 棋子图片、音效、木纹背景
│   │   │   ├── stores/       # 游戏状态管理
│   │   │   ├── types/        # 共享类型
│   │   │   └── App.vue
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── server/          # Node.js 后端
│       ├── src/
│       │   ├── rooms/        # 房间管理
│       │   ├── game/         # 游戏逻辑（调用 elephantops）
│       │   ├── ws/           # WebSocket 处理
│       │   ├── types/        # 共享类型
│       │   └── index.ts
│       └── package.json
├── DESIGN.md            # 本文档
├── package.json         # 根 package.json（workspaces）
└── tsconfig.json        # 根 TypeScript 配置
```
