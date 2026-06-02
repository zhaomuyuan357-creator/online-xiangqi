/**
 * WebSocket Handler - 消息路由与游戏流程控制
 *
 * 处理所有客户端消息，协调 RoomManager 和 GameSession。
 */

import type { WebSocket } from 'ws'
import { RoomManager } from '../rooms/RoomManager.js'
import type { ClientMessage } from '../types/index.js'
import { makeSquare } from 'elephantops'

export class WsHandler {
  private roomManager: RoomManager
  /** playerId -> WebSocket 映射 */
  private connections = new Map<string, WebSocket>()
  /** WebSocket -> playerId 反向映射 */
  private wsToPlayer = new Map<WebSocket, string>()
  private nextPlayerId = 1

  constructor(roomManager: RoomManager) {
    this.roomManager = roomManager

    // 每分钟清理过期房间
    setInterval(() => this.roomManager.cleanup(), 60_000)
  }

  /**
   * 处理新的 WebSocket 连接
   */
  handleConnection(ws: WebSocket) {
    const playerId = `player_${this.nextPlayerId++}`
    this.connections.set(playerId, ws)
    this.wsToPlayer.set(ws, playerId)

    console.log(`[WS] 玩家 ${playerId} 已连接`)

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as ClientMessage
        this.handleMessage(playerId, ws, msg)
      } catch {
        this.send(ws, { type: 'error', message: '消息格式错误' })
      }
    })

    ws.on('close', () => {
      this.handleDisconnect(playerId, ws)
    })

    ws.on('error', (err) => {
      console.error(`[WS] 玩家 ${playerId} 连接错误:`, err.message)
    })
  }

  /**
   * 路由消息到对应处理函数
   */
  private handleMessage(playerId: string, ws: WebSocket, msg: ClientMessage) {
    switch (msg.type) {
      case 'join':
        this.handleJoin(playerId, ws, msg.roomId)
        break
      case 'move':
        this.handleMove(playerId, ws, msg.from, msg.to)
        break
      case 'resign':
        this.handleResign(playerId)
        break
      case 'draw_offer':
        this.handleDrawOffer(playerId)
        break
      case 'draw_accept':
        this.handleDrawAccept(playerId)
        break
      default:
        this.send(ws, { type: 'error', message: '未知消息类型' })
    }
  }

  /**
   * 处理加入房间
   */
  private handleJoin(playerId: string, ws: WebSocket, roomId: string) {
    if (!roomId || typeof roomId !== 'string') {
      this.send(ws, { type: 'error', message: '请提供房间号' })
      return
    }

    const result = this.roomManager.joinRoom(roomId.toUpperCase(), playerId, ws)

    if (!result.success) {
      this.send(ws, { type: 'error', message: result.error! })
      return
    }

    const { room, color } = result!

    // 通知加入者房间信息
    this.send(ws, {
      type: 'room_joined',
      roomId: room!.id,
      playerCount: room!.players.size,
    })

    console.log(`[Room] 玩家 ${playerId} 加入房间 ${room!.id}，执${color === 'red' ? '红' : '黑'}方`)

    // 通知加入者分配的颜色
    this.send(ws, {
      type: 'game_start',
      color,
    })

    // 如果已有两人，通知双方游戏开始
    if (room!.players.size === 2) {
      // 给先加入的玩家也发送 game_start（如果还没发过）
      for (const [id, player] of room!.players) {
        if (id !== playerId) {
          this.send(player.ws, {
            type: 'game_start',
            color: player.color,
          })
        }
      }
      console.log(`[Room] 房间 ${room!.id} 游戏开始！`)
    }
  }

  /**
   * 处理走棋
   */
  private handleMove(playerId: string, ws: WebSocket, from: string, to: string) {
    const room = this.roomManager.findRoomByPlayer(playerId)
    if (!room) {
      this.send(ws, { type: 'error', message: '你不在任何房间中' })
      return
    }

    const player = this.roomManager.getPlayer(room, playerId)
    if (!player) return

    // 检查游戏是否已开始
    if (!room.game.started) {
      this.send(ws, { type: 'error', message: '等待对手加入' })
      return
    }

    // 检查是否轮到该玩家
    if (room.game.getTurn() !== player.color) {
      this.send(ws, { type: 'error', message: '还没轮到你走棋' })
      return
    }

    // 执行走棋
    const result = room.game.makeMove(from, to)

    if (!result.success) {
      this.send(ws, { type: 'error', message: result.error! })
      return
    }

    // 清除和棋提议
    room.drawOfferBy = null

    // 广播走棋给双方
    const moveMsg = {
      type: 'move',
      from: makeSquare(result.from!),
      to: makeSquare(result.to!),
      fen: result.fen,
    }

    this.roomManager.broadcast(room, moveMsg)

    console.log(`[Game] 房间 ${room.id}: ${player.color} ${from} → ${to}`)

    // 检查游戏是否结束
    if (result.isGameOver) {
      let reason: string
      let winner: string | undefined

      if (result.isCheckmate) {
        reason = '将杀'
        // 被将杀的是当前回合方（走棋后对方被将杀）
        // 不对，走棋后回合切换了，被将杀的是当前回合方
        winner = result.outcome?.winner
      } else if (result.outcome?.winner) {
        reason = '绝杀'
        winner = result.outcome.winner
      } else {
        reason = '和棋'
      }

      const gameOverMsg = {
        type: 'game_over',
        reason,
        ...(winner ? { winner } : {}),
      }

      this.roomManager.broadcast(room, gameOverMsg)
      console.log(`[Game] 房间 ${room.id}: 游戏结束 - ${reason} ${winner ? `(${winner}胜)` : ''}`)
    } else if (result.isCheck) {
      // 通知被将军的玩家
      const opponent = this.roomManager.getOpponent(room, playerId)
      if (opponent) {
        this.send(opponent.ws, { type: 'error', message: '将军！' })
      }
    }
  }

  /**
   * 处理认输
   */
  private handleResign(playerId: string) {
    const room = this.roomManager.findRoomByPlayer(playerId)
    if (!room) return

    const player = this.roomManager.getPlayer(room, playerId)
    if (!player) return

    const winner = player.color === 'red' ? 'black' : 'red'

    this.roomManager.broadcast(room, {
      type: 'game_over',
      reason: '认输',
      winner,
    })

    console.log(`[Game] 房间 ${room.id}: ${player.color} 认输`)
  }

  /**
   * 处理和棋提议
   */
  private handleDrawOffer(playerId: string) {
    const room = this.roomManager.findRoomByPlayer(playerId)
    if (!room) return

    const opponent = this.roomManager.getOpponent(room, playerId)
    if (!opponent) return

    room.drawOfferBy = playerId

    this.send(opponent.ws, { type: 'draw_offered' })
    console.log(`[Game] 房间 ${room.id}: 和棋提议`)
  }

  /**
   * 处理接受和棋
   */
  private handleDrawAccept(playerId: string) {
    const room = this.roomManager.findRoomByPlayer(playerId)
    if (!room) return

    // 只有对方提议了和棋才能接受
    if (room.drawOfferBy === null || room.drawOfferBy === playerId) {
      const player = this.roomManager.getPlayer(room, playerId)
      if (player) {
        this.send(player.ws, { type: 'error', message: '没有待接受的和棋提议' })
      }
      return
    }

    this.roomManager.broadcast(room, {
      type: 'game_over',
      reason: '和棋',
    })

    room.drawOfferBy = null
    console.log(`[Game] 房间 ${room.id}: 双方同意和棋`)
  }

  /**
   * 处理玩家断线
   */
  private handleDisconnect(playerId: string, ws: WebSocket) {
    this.connections.delete(playerId)
    this.wsToPlayer.delete(ws)

    const room = this.roomManager.findRoomByPlayer(playerId)
    if (!room) return

    const opponent = this.roomManager.getOpponent(room, playerId)
    if (opponent) {
      // 通知对手
      this.send(opponent.ws, { type: 'opponent_disconnected' })
    }

    // 从房间移除
    this.roomManager.leaveRoom(room.id, playerId)
    console.log(`[WS] 玩家 ${playerId} 断开连接，已从房间 ${room.id} 移除`)
  }

  /**
   * 发送消息给指定 WebSocket
   */
  private send(ws: WebSocket, message: object) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(message))
    }
  }
}
