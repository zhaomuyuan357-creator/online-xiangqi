/**
 * 服务端入口 - HTTP + WebSocket 服务器
 */

import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { RoomManager } from './rooms/RoomManager.js'
import { WsHandler } from './ws/handler.js'

const PORT = Number(process.env.PORT) || 3000

// 创建 HTTP 服务器
const server = createServer((req, res) => {
  // 健康检查端点
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok' }))
    return
  }

  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  res.writeHead(404)
  res.end('Not Found')
})

// 创建 WebSocket 服务器
const wss = new WebSocketServer({ server, path: '/ws' })

// 初始化房间管理和消息处理
const roomManager = new RoomManager()
const wsHandler = new WsHandler(roomManager)

wss.on('connection', (ws) => {
  wsHandler.handleConnection(ws)
})

// 启动服务器
server.listen(PORT, () => {
  console.log(`🀄 象棋服务器已启动: http://localhost:${PORT}`)
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`)
})
