/**
 * RoomManager - 房间管理
 *
 * 管理游戏房间的创建、查找、玩家加入/离开。
 * 每个房间绑定一个 GameSession 实例。
 */

import type { WebSocket } from 'ws'
import { GameSession } from '../game/GameSession.js'
import type { Color } from 'elephantops'

export interface Player {
  id: string
  ws: WebSocket
  color: Color
}

export interface Room {
  id: string
  players: Map<string, Player>
  game: GameSession
  createdAt: number
  drawOfferBy: string | null
}

/** 房间不活跃超时时间 (ms) */
const ROOM_TIMEOUT = 30 * 60 * 1000 // 30 minutes

export class RoomManager {
  private rooms = new Map<string, Room>()

  /**
   * 创建新房间
   * @returns 房间 ID（6 位随机字符串）
   */
  createRoom(): string {
    const roomId = this.generateRoomId()
    const room: Room = {
      id: roomId,
      players: new Map(),
      game: new GameSession(),
      createdAt: Date.now(),
      drawOfferBy: null,
    }
    this.rooms.set(roomId, room)
    return roomId
  }

  /**
   * 玩家加入房间
   * @returns 加入结果：包含分配的颜色和房间信息
   */
  joinRoom(roomId: string, playerId: string, ws: WebSocket): {
    success: boolean
    room?: Room
    color?: Color
    error?: string
  } {
    let room = this.rooms.get(roomId)

    // 房间不存在时自动创建
    if (!room) {
      room = {
        id: roomId,
        players: new Map(),
        game: new GameSession(),
        createdAt: Date.now(),
        drawOfferBy: null,
      }
      this.rooms.set(roomId, room)
    }

    if (room.players.size >= 2) {
      return { success: false, error: '房间已满' }
    }

    // 分配颜色：第一个加入的执红（先手），第二个执黑
    const color: Color = room.players.size === 0 ? 'red' : 'black'

    const player: Player = { id: playerId, ws, color }
    room.players.set(playerId, player)

    // 两人加入后标记游戏开始
    if (room.players.size === 2) {
      room.game.markStarted()
    }

    return { success: true, room, color }
  }

  /**
   * 玩家离开房间
   */
  leaveRoom(roomId: string, playerId: string): Room | undefined {
    const room = this.rooms.get(roomId)
    if (!room) return undefined

    room.players.delete(playerId)

    // 房间空了则清理
    if (room.players.size === 0) {
      this.rooms.delete(roomId)
      return undefined
    }

    return room
  }

  /**
   * 通过房间 ID 查找房间
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  /**
   * 通过玩家 ID 查找其所在的房间
   */
  findRoomByPlayer(playerId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.has(playerId)) {
        return room
      }
    }
    return undefined
  }

  /**
   * 获取房间中的对手
   */
  getOpponent(room: Room, playerId: string): Player | undefined {
    for (const [id, player] of room.players) {
      if (id !== playerId) {
        return player
      }
    }
    return undefined
  }

  /**
   * 获取房间中的指定玩家
   */
  getPlayer(room: Room, playerId: string): Player | undefined {
    return room.players.get(playerId)
  }

  /**
   * 向房间中所有玩家广播消息
   */
  broadcast(room: Room, message: object, excludePlayerId?: string) {
    const data = JSON.stringify(message)
    for (const [id, player] of room.players) {
      if (id !== excludePlayerId && player.ws.readyState === 1) {
        player.ws.send(data)
      }
    }
  }

  /**
   * 向指定玩家发送消息
   */
  sendTo(player: Player, message: object) {
    if (player.ws.readyState === 1) {
      player.ws.send(JSON.stringify(message))
    }
  }

  /**
   * 清理过期房间
   */
  cleanup() {
    const now = Date.now()
    for (const [id, room] of this.rooms) {
      if (now - room.createdAt > ROOM_TIMEOUT) {
        // 通知房间内玩家
        this.broadcast(room, { type: 'error', message: '房间超时已关闭' })
        this.rooms.delete(id)
      }
    }
  }

  /** 生成 6 位随机房间号 */
  private generateRoomId(): string {
    let id: string
    do {
      id = Math.random().toString(36).substring(2, 8).toUpperCase()
    } while (this.rooms.has(id))
    return id
  }
}
