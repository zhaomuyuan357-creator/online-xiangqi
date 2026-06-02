/**
 * RoomManager 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RoomManager } from './RoomManager.js'
import type { WebSocket } from 'ws'

/** 创建模拟 WebSocket */
function createMockWs(readyState = 1): WebSocket {
  return {
    readyState,
    send: vi.fn(),
    close: vi.fn(),
  } as unknown as WebSocket
}

describe('RoomManager', () => {
  let manager: RoomManager

  beforeEach(() => {
    manager = new RoomManager()
  })

  describe('createRoom', () => {
    it('应创建房间并返回房间 ID', () => {
      const roomId = manager.createRoom()
      expect(roomId).toBeDefined()
      expect(roomId.length).toBe(6)
      expect(roomId).toMatch(/^[A-Z0-9]{6}$/)
    })

    it('应创建不同的房间 ID', () => {
      const id1 = manager.createRoom()
      const id2 = manager.createRoom()
      expect(id1).not.toBe(id2)
    })

    it('创建后应能查找到房间', () => {
      const roomId = manager.createRoom()
      const room = manager.getRoom(roomId)
      expect(room).toBeDefined()
      expect(room!.id).toBe(roomId)
      expect(room!.players.size).toBe(0)
    })
  })

  describe('joinRoom', () => {
    it('第一个玩家加入应分配红色', () => {
      const roomId = manager.createRoom()
      const ws = createMockWs()
      const result = manager.joinRoom(roomId, 'player1', ws)

      expect(result.success).toBe(true)
      expect(result.color).toBe('red')
      expect(result.room!.players.size).toBe(1)
    })

    it('第二个玩家加入应分配黑色', () => {
      const roomId = manager.createRoom()
      manager.joinRoom(roomId, 'player1', createMockWs())
      const result = manager.joinRoom(roomId, 'player2', createMockWs())

      expect(result.success).toBe(true)
      expect(result.color).toBe('black')
    })

    it('两个玩家加入后游戏应标记为已开始', () => {
      const roomId = manager.createRoom()
      manager.joinRoom(roomId, 'player1', createMockWs())
      manager.joinRoom(roomId, 'player2', createMockWs())

      const room = manager.getRoom(roomId)
      expect(room!.game.started).toBe(true)
    })

    it('第三个玩家加入应失败', () => {
      const roomId = manager.createRoom()
      manager.joinRoom(roomId, 'player1', createMockWs())
      manager.joinRoom(roomId, 'player2', createMockWs())
      const result = manager.joinRoom(roomId, 'player3', createMockWs())

      expect(result.success).toBe(false)
      expect(result.error).toBe('房间已满')
    })

    it('加入不存在的房间应自动创建', () => {
      const ws = createMockWs()
      const result = manager.joinRoom('NEWROOM', 'player1', ws)

      expect(result.success).toBe(true)
      expect(result.room).toBeDefined()
      expect(manager.getRoom('NEWROOM')).toBeDefined()
    })

    it('房间 ID 大小写敏感', () => {
      const ws = createMockWs()
      const result = manager.joinRoom('abc123', 'player1', ws)

      expect(result.success).toBe(true)
      // RoomManager 本身不做大写转换，由 WsHandler 处理
      expect(result.room!.id).toBe('abc123')
    })
  })

  describe('leaveRoom', () => {
    it('玩家离开后应从房间移除', () => {
      const roomId = manager.createRoom()
      manager.joinRoom(roomId, 'player1', createMockWs())
      manager.joinRoom(roomId, 'player2', createMockWs())

      const room = manager.leaveRoom(roomId, 'player1')
      expect(room).toBeDefined()
      expect(room!.players.size).toBe(1)
      expect(room!.players.has('player1')).toBe(false)
    })

    it('所有玩家离开后房间应被删除', () => {
      const roomId = manager.createRoom()
      manager.joinRoom(roomId, 'player1', createMockWs())

      manager.leaveRoom(roomId, 'player1')
      expect(manager.getRoom(roomId)).toBeUndefined()
    })

    it('离开不存在的房间应返回 undefined', () => {
      const result = manager.leaveRoom('NONEXIST', 'player1')
      expect(result).toBeUndefined()
    })
  })

  describe('findRoomByPlayer', () => {
    it('应能找到玩家所在的房间', () => {
      const roomId = manager.createRoom()
      manager.joinRoom(roomId, 'player1', createMockWs())

      const room = manager.findRoomByPlayer('player1')
      expect(room).toBeDefined()
      expect(room!.id).toBe(roomId)
    })

    it('未加入的玩家应返回 undefined', () => {
      const room = manager.findRoomByPlayer('nobody')
      expect(room).toBeUndefined()
    })
  })

  describe('getOpponent', () => {
    it('应能获取对手', () => {
      const roomId = manager.createRoom()
      manager.joinRoom(roomId, 'player1', createMockWs())
      manager.joinRoom(roomId, 'player2', createMockWs())

      const room = manager.getRoom(roomId)!
      const opponent = manager.getOpponent(room, 'player1')
      expect(opponent).toBeDefined()
      expect(opponent!.id).toBe('player2')
    })

    it('只有一个玩家时应返回 undefined', () => {
      const roomId = manager.createRoom()
      manager.joinRoom(roomId, 'player1', createMockWs())

      const room = manager.getRoom(roomId)!
      const opponent = manager.getOpponent(room, 'player1')
      expect(opponent).toBeUndefined()
    })
  })

  describe('broadcast', () => {
    it('应向房间内所有玩家发送消息', () => {
      const roomId = manager.createRoom()
      const ws1 = createMockWs()
      const ws2 = createMockWs()
      manager.joinRoom(roomId, 'player1', ws1)
      manager.joinRoom(roomId, 'player2', ws2)

      const room = manager.getRoom(roomId)!
      const message = { type: 'test', data: 'hello' }
      manager.broadcast(room, message)

      expect(ws1.send).toHaveBeenCalledWith(JSON.stringify(message))
      expect(ws2.send).toHaveBeenCalledWith(JSON.stringify(message))
    })

    it('应能排除指定玩家', () => {
      const roomId = manager.createRoom()
      const ws1 = createMockWs()
      const ws2 = createMockWs()
      manager.joinRoom(roomId, 'player1', ws1)
      manager.joinRoom(roomId, 'player2', ws2)

      const room = manager.getRoom(roomId)!
      manager.broadcast(room, { type: 'test' }, 'player1')

      expect(ws1.send).not.toHaveBeenCalled()
      expect(ws2.send).toHaveBeenCalledWith(JSON.stringify({ type: 'test' }))
    })

    it('不应向未就绪的连接发送消息', () => {
      const roomId = manager.createRoom()
      const ws1 = createMockWs(0)  // CONNECTING state
      const ws2 = createMockWs()
      manager.joinRoom(roomId, 'player1', ws1)
      manager.joinRoom(roomId, 'player2', ws2)

      const room = manager.getRoom(roomId)!
      manager.broadcast(room, { type: 'test' })

      expect(ws1.send).not.toHaveBeenCalled()
      expect(ws2.send).toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('不应清理新建的房间', () => {
      const roomId = manager.createRoom()
      manager.joinRoom(roomId, 'player1', createMockWs())

      manager.cleanup()
      expect(manager.getRoom(roomId)).toBeDefined()
    })

    it('应清理超时的房间', () => {
      const roomId = manager.createRoom()
      const ws = createMockWs()
      manager.joinRoom(roomId, 'player1', ws)

      // 模拟房间创建于 31 分钟前
      const room = manager.getRoom(roomId)!
      room.createdAt = Date.now() - 31 * 60 * 1000

      manager.cleanup()
      expect(manager.getRoom(roomId)).toBeUndefined()
      // 应通知玩家
      expect(ws.send).toHaveBeenCalled()
    })
  })
})
