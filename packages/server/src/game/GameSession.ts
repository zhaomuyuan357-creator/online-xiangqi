/**
 * GameSession - 封装单局游戏逻辑
 *
 * 每个房间对应一个 GameSession 实例，
 * 内部使用 elephantops 的 Xiangqi 引擎管理棋盘状态。
 */

import { Xiangqi } from 'elephantops/xiangqi'
import { parseSquare, makeSquare, squareFile, squareRank } from 'elephantops'
import { makeFen } from 'elephantops/fen'
import type { Square, Move, Color, Outcome } from 'elephantops'

export interface MoveResult {
  success: boolean
  fen?: string
  from?: Square
  to?: Square
  isCheck?: boolean
  isCheckmate?: boolean
  isGameOver?: boolean
  outcome?: Outcome
  error?: string
}

export class GameSession {
  private game: Xiangqi
  private _started = false

  constructor() {
    this.game = Xiangqi.default()
  }

  /** 游戏是否已开始（双方都加入） */
  get started(): boolean {
    return this._started
  }

  /** 标记游戏开始 */
  markStarted() {
    this._started = true
  }

  /** 获取当前 FEN */
  getFen(): string {
    return makeFen(this.game.toSetup())
  }

  /** 获取当前回合颜色 */
  getTurn(): Color {
    return this.game.turn
  }

  /** 是否将军 */
  isCheck(): boolean {
    return this.game.isCheck()
  }

  /** 是否将杀 */
  isCheckmate(): boolean {
    return this.game.isCheckmate()
  }

  /** 游戏是否结束 */
  isGameOver(): boolean {
    return this.game.isEnd()
  }

  /** 获取结果 */
  getOutcome(): Outcome | undefined {
    return this.game.outcome()
  }

  /**
   * 执行走棋
   * @param from 起始格子代数记号，如 "a0"
   * @param to 目标格子代数记号，如 "a1"
   * @returns MoveResult 包含成功/失败信息
   */
  makeMove(from: string, to: string): MoveResult {
    // 解析坐标
    const fromSquare = parseSquare(from)
    const toSquare = parseSquare(to)

    if (fromSquare === undefined || toSquare === undefined) {
      return { success: false, error: '无效的坐标格式' }
    }

    const move: Move = { from: fromSquare, to: toSquare }

    // 检查是否合法
    if (!this.game.isLegal(move)) {
      return { success: false, error: '不合法的走棋' }
    }

    // 执行走棋
    this.game.play(move)

    const outcome = this.game.outcome()

    return {
      success: true,
      fen: this.getFen(),
      from: fromSquare,
      to: toSquare,
      isCheck: this.game.isCheck(),
      isCheckmate: this.game.isCheckmate(),
      isGameOver: this.game.isEnd(),
      outcome: outcome ?? undefined,
    }
  }

  /**
   * 获取指定颜色的所有合法走法
   */
  getAllLegalMoves(): Move[] {
    const moves: Move[] = []
    const all = this.game.allDests()
    for (const [from, targets] of all) {
      for (const to of targets) {
        moves.push({ from, to })
      }
    }
    return moves
  }
}
