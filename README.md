# 线上象棋

浏览器端中国象棋双人实时对战应用。

## 功能特性

- 🎮 双人实时对战
- 🏰 房间系统（创建/加入/分享链接）
- ♟️ 完整象棋规则（蹩马腿、塞象眼、将帅对面等）
- 🎨 传统古典风格棋盘
- 🔊 落子音效

## 技术栈

| 层 | 技术选型 |
|---|---|
| 前端框架 | Vue 3 + Vite |
| 语言 | TypeScript |
| 棋盘渲染 | Canvas 2D |
| 后端 | Node.js + WebSocket |
| 规则引擎 | [elephantops](https://www.npmjs.com/package/elephantops) |
| 仓库结构 | Monorepo（pnpm workspaces） |

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装

```bash
pnpm install
```

### 开发

```bash
# 同时启动前端和后端
pnpm dev

# 或分别启动
pnpm dev:client  # 前端
pnpm dev:server  # 后端
```

### 构建

```bash
pnpm build
```

## 项目结构

```
线上象棋/
├── packages/
│   ├── client/          # Vue 3 前端
│   │   ├── src/
│   │   │   ├── components/   # Vue 组件
│   │   │   ├── canvas/       # Canvas 渲染逻辑
│   │   │   ├── composables/  # 组合式函数
│   │   │   ├── stores/       # 状态管理
│   │   │   └── views/        # 页面视图
│   │   └── package.json
│   └── server/          # Node.js 后端
│       ├── src/
│       │   ├── rooms/        # 房间管理
│       │   ├── game/         # 游戏逻辑
│       │   └── ws/           # WebSocket 处理
│       └── package.json
├── DESIGN.md            # 设计文档
├── PROGRESS.md          # 进度跟踪
└── package.json         # 根配置
```

## 游戏规则

- 红方先手（创建房间者）
- 支持房间号输入 + URL 分享链接
- 游戏结束弹窗显示结果

## 开发进度

- ✅ Session 1: 项目初始化 + 规则引擎集成 + Canvas 棋盘渲染
- 📋 Session 2: 棋子交互优化 + 游戏流程完善
- 📋 Session 3: WebSocket 服务端 + 联网对战
- 📋 Session 4: 音效 + 测试 + 部署

## 许可证

MIT
