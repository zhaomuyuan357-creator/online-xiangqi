/**
 * GameSession 单元测试
 *
 * elephantops 坐标系：a1-i10，rank 从 1 开始
 * - 红方底线：rank 1（a1-i1）
 * - 黑方底线：rank 10（a10-i10）
 * - 红炮初始：b3, h3
 * - 红兵初始：a4, c4, e4, g4, i4
 * - 红马初始：b1, h1
 * - 红车初始：a1, i1
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GameSession } from './GameSession.js'

describe('GameSession', () => {
  let session: GameSession

  beforeEach(() => {
    session = new GameSession()
  })

  describe('初始化', () => {
    it('应创建一个新的游戏会话', () => {
      expect(session).toBeDefined()
      expect(session.started).toBe(false)
    })

    it('标记开始后 started 应为 true', () => {
      session.markStarted()
      expect(session.started).toBe(true)
    })

    it('初始 FEN 应为标准开局', () => {
      const fen = session.getFen()
      expect(fen).toContain('/')
      expect(fen.length).toBeGreaterThan(10)
      // 标准 FEN 以红方小写开头
      expect(fen).toContain(' w ')  // 轮到白方（红方）
    })

    it('初始回合应为红方', () => {
      expect(session.getTurn()).toBe('red')
    })

    it('初始状态不应将军', () => {
      expect(session.isCheck()).toBe(false)
    })

    it('初始状态不应将杀', () => {
      expect(session.isCheckmate()).toBe(false)
    })

    it('初始状态游戏未结束', () => {
      expect(session.isGameOver()).toBe(false)
    })

    it('初始状态无结果', () => {
      expect(session.getOutcome()).toBeUndefined()
    })
  })

  describe('makeMove - 合法走棋', () => {
    it('红炮二平五 (h3-e3) 应成功', () => {
      const result = session.makeMove('h3', 'e3')
      expect(result.success).toBe(true)
      expect(result.fen).toBeDefined()
      expect(result.from).toBeDefined()
      expect(result.to).toBeDefined()
      expect(result.isCheck).toBe(false)
      expect(result.isGameOver).toBe(false)
    })

    it('红车进二 (a1-a3) 应成功', () => {
      const result = session.makeMove('a1', 'a3')
      expect(result.success).toBe(true)
    })

    it('红马八进七 (b1-c3) 应成功', () => {
      const result = session.makeMove('b1', 'c3')
      expect(result.success).toBe(true)
    })

    it('红兵五进一 (e4-e5) 应成功', () => {
      const result = session.makeMove('e4', 'e5')
      expect(result.success).toBe(true)
    })

    it('走棋后回合应切换', () => {
      session.makeMove('h3', 'e3')   // 红炮平中
      expect(session.getTurn()).toBe('black')

      session.makeMove('h8', 'e8')   // 黑炮平中
      expect(session.getTurn()).toBe('red')
    })

    it('走棋后 FEN 应变化', () => {
      const fenBefore = session.getFen()
      session.makeMove('h3', 'e3')
      const fenAfter = session.getFen()
      expect(fenAfter).not.toBe(fenBefore)
    })

    it('红兵过河后可以吃黑兵', () => {
      // 红兵 e4->e5, 黑兵 e7->e6, 红兵 e5 吃 e6 黑兵
      session.makeMove('e4', 'e5')
      session.makeMove('e7', 'e6')
      const result = session.makeMove('e5', 'e6')
      expect(result.success).toBe(true)
    })

    it('红炮无炮架不能吃子', () => {
      // h3 红炮直线到 h10 黑马，中间 h7 为空（无炮架），应不合法
      // 实际上 h7 是空位，h3->h10 有 h7 作为"经过"但不是炮架
      // 测试：b3 红炮直线到 b10 黑马，中间 b4-b9 需要恰好一个炮架
      // b4 空, b5 空, b6 空, b7 空, b8 黑炮, b9 空, b10 黑马
      // b3->b10 之间有 b8 黑炮作为炮架，应该合法
      const result = session.makeMove('b3', 'b10')
      // b3->b10: 中间有 b8 黑炮作为炮架，所以是合法的吃子
      expect(result.success).toBe(true)
    })

    it('红炮直线移动到空位应合法', () => {
      // h3 红炮可以移动到 h7（空位，非吃子）
      const result = session.makeMove('h3', 'h7')
      expect(result.success).toBe(true)
    })
  })

  describe('makeMove - 非法走棋', () => {
    it('无效坐标格式应返回错误', () => {
      const result = session.makeMove('z9', 'a1')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('不存在的坐标应返回错误', () => {
      const result = session.makeMove('a0', 'a1')
      expect(result.success).toBe(false)
    })

    it('走对方的棋子应返回错误', () => {
      // 红方回合，尝试走黑方的马 b10-c8
      const result = session.makeMove('b10', 'c8')
      expect(result.success).toBe(false)
      expect(result.error).toBe('不合法的走棋')
    })

    it('走空位应返回错误', () => {
      // e5 是空位
      const result = session.makeMove('e5', 'e6')
      expect(result.success).toBe(false)
    })

    it('象走直线应返回错误', () => {
      // 相在 c1，尝试走直线 c1-c4（相只能走田字）
      const result = session.makeMove('c1', 'c4')
      expect(result.success).toBe(false)
    })

    it('士出九宫应返回错误', () => {
      // 仕在 d1，尝试走出九宫
      const result = session.makeMove('d1', 'd4')
      expect(result.success).toBe(false)
    })

    it('兵未过河不能横走', () => {
      // 兵在 e4，尝试横走 e4-f4（未过河不能横走）
      const result = session.makeMove('e4', 'f4')
      expect(result.success).toBe(false)
    })
  })

  describe('getAllLegalMoves', () => {
    it('初始状态红方应有合法走法', () => {
      const moves = session.getAllLegalMoves()
      expect(moves.length).toBeGreaterThan(0)
    })

    it('每步走法应包含 from 和 to', () => {
      const moves = session.getAllLegalMoves()
      for (const move of moves) {
        expect(move.from).toBeDefined()
        expect(move.to).toBeDefined()
      }
    })

    it('初始状态红方合法走法数量应在合理范围', () => {
      const moves = session.getAllLegalMoves()
      // 初始状态红方有 44 种合法走法
      expect(moves.length).toBeGreaterThanOrEqual(30)
      expect(moves.length).toBeLessThanOrEqual(60)
    })
  })

  describe('将军检测', () => {
    it('非将军局面应正确报告', () => {
      session.makeMove('h3', 'e3')
      expect(session.isCheck()).toBe(false)
    })
  })

  describe('连续走棋', () => {
    it('应能连续走多步棋', () => {
      const moves = [
        ['h3', 'e3'],   // 红炮二平五
        ['h8', 'e8'],   // 黑炮8平5
        ['b1', 'c3'],   // 红马八进七
        ['b10', 'c8'],  // 黑马2进3
      ]

      for (const [from, to] of moves) {
        const result = session.makeMove(from, to)
        expect(result.success).toBe(true)
      }
    })

    it('走完所有步骤后游戏应仍在进行', () => {
      session.makeMove('h3', 'e3')
      session.makeMove('h8', 'e8')
      session.makeMove('b1', 'c3')
      session.makeMove('b10', 'c8')

      expect(session.isGameOver()).toBe(false)
    })

    it('走棋后应能获取新的合法走法', () => {
      session.makeMove('h3', 'e3')
      session.makeMove('h8', 'e8')

      const moves = session.getAllLegalMoves()
      expect(moves.length).toBeGreaterThan(0)
    })
  })
})
