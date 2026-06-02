/**
 * Piece renderer - draws xiangqi pieces on Canvas
 *
 * Each piece is drawn as a circle with a Chinese character inside.
 * Red pieces: red background with white text
 * Black pieces: black/dark background with white text
 *
 * Supports smooth move animations.
 */

import type { Piece, Color, Role, Square } from 'elephantops'
import type { BoardRenderer } from './boardRenderer'

/** Chinese character mapping for each piece */
const PIECE_CHARS: Record<Color, Record<Role, string>> = {
  red: {
    king: '帅',
    advisor: '仕',
    elephant: '相',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    pawn: '兵'
  },
  black: {
    king: '将',
    advisor: '士',
    elephant: '象',
    horse: '馬',
    chariot: '車',
    cannon: '砲',
    pawn: '卒'
  }
}

export interface PieceRendererConfig {
  ctx: CanvasRenderingContext2D
  boardRenderer: BoardRenderer
  /** Piece radius as fraction of gridSize (default: 0.42) */
  pieceScale?: number
}

/** 走棋动画状态 */
interface MoveAnimation {
  piece: Piece
  fromFile: number
  fromRank: number
  toFile: number
  toRank: number
  startTime: number
  duration: number
  onComplete?: () => void
}

/** 缓动函数：ease-out cubic */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export class PieceRenderer {
  private ctx: CanvasRenderingContext2D
  private boardRenderer: BoardRenderer
  private pieceRadius: number
  private animation: MoveAnimation | null = null
  private animationFrame: number | null = null

  constructor(config: PieceRendererConfig) {
    this.ctx = config.ctx
    this.boardRenderer = config.boardRenderer
    this.pieceRadius = (config.pieceScale ?? 0.42) * config.boardRenderer['gridSize']
  }

  /** 是否正在播放动画 */
  get isAnimating(): boolean {
    return this.animation !== null
  }

  /**
   * 启动走棋动画
   * @returns 如果动画正在播放，返回 false
   */
  animateMove(
    piece: Piece,
    fromFile: number, fromRank: number,
    toFile: number, toRank: number,
    onRedraw: () => void,
    onComplete?: () => void,
    duration = 200
  ): boolean {
    if (this.animation) return false

    this.animation = {
      piece,
      fromFile, fromRank,
      toFile, toRank,
      startTime: performance.now(),
      duration,
      onComplete,
    }

    const tick = () => {
      if (!this.animation) return

      const elapsed = performance.now() - this.animation.startTime
      const progress = Math.min(elapsed / this.animation.duration, 1)

      if (progress >= 1) {
        const cb = this.animation.onComplete
        this.animation = null
        cb?.()
        onRedraw()
      } else {
        onRedraw()
        this.animationFrame = requestAnimationFrame(tick)
      }
    }

    this.animationFrame = requestAnimationFrame(tick)
    return true
  }

  /** 取消正在进行的动画 */
  cancelAnimation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
    this.animation = null
  }

  /**
   * 获取动画中棋子的当前位置（像素坐标）
   * 如果没有动画，返回 null
   */
  getAnimatedPosition(): { x: number; y: number } | null {
    if (!this.animation) return null

    const elapsed = performance.now() - this.animation.startTime
    const t = Math.min(elapsed / this.animation.duration, 1)
    const eased = easeOutCubic(t)

    const from = this.boardRenderer.toPixel(this.animation.fromFile, this.animation.fromRank)
    const to = this.boardRenderer.toPixel(this.animation.toFile, this.animation.toRank)

    return {
      x: from.x + (to.x - from.x) * eased,
      y: from.y + (to.y - from.y) * eased,
    }
  }

  /** 获取动画中的棋子 */
  getAnimatingPiece(): { piece: Piece; toFile: number; toRank: number } | null {
    if (!this.animation) return null
    return {
      piece: this.animation.piece,
      toFile: this.animation.toFile,
      toRank: this.animation.toRank,
    }
  }

  /** Draw a single piece at the given board coordinates */
  drawPiece(piece: Piece, file: number, rank: number) {
    const { ctx, pieceRadius } = this
    const { x, y } = this.boardRenderer.toPixel(file, rank)

    this.drawPieceAt(piece, x, y)
  }

  /** 在指定像素坐标绘制棋子（支持动画） */
  drawPieceAt(piece: Piece, x: number, y: number) {
    const { ctx, pieceRadius } = this

    const isRed = piece.color === 'red'

    // Outer circle (piece body)
    ctx.beginPath()
    ctx.arc(x, y, pieceRadius, 0, Math.PI * 2)

    // Gradient fill for 3D effect
    const gradient = ctx.createRadialGradient(
      x - pieceRadius * 0.3, y - pieceRadius * 0.3, pieceRadius * 0.1,
      x, y, pieceRadius
    )

    if (isRed) {
      gradient.addColorStop(0, '#ff6b6b')
      gradient.addColorStop(0.7, '#c0392b')
      gradient.addColorStop(1, '#8b0000')
    } else {
      gradient.addColorStop(0, '#555')
      gradient.addColorStop(0.7, '#222')
      gradient.addColorStop(1, '#000')
    }

    ctx.fillStyle = gradient
    ctx.fill()

    // Border ring
    ctx.strokeStyle = isRed ? '#8b0000' : '#000'
    ctx.lineWidth = 2
    ctx.stroke()

    // Inner decorative ring
    ctx.beginPath()
    ctx.arc(x, y, pieceRadius * 0.78, 0, Math.PI * 2)
    ctx.strokeStyle = isRed ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Chinese character
    const char = PIECE_CHARS[piece.color][piece.role]
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${pieceRadius * 1.3}px "KaiTi", "楷体", "SimSun", "宋体", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(char, x, y + 1)
  }

  /** Draw a highlight ring around a selected piece */
  drawSelectionHighlight(file: number, rank: number) {
    const { ctx, pieceRadius } = this
    const { x, y } = this.boardRenderer.toPixel(file, rank)

    ctx.beginPath()
    ctx.arc(x, y, pieceRadius + 4, 0, Math.PI * 2)
    ctx.strokeStyle = '#f1c40f'
    ctx.lineWidth = 3
    ctx.stroke()
  }

  /** Draw a dot showing a legal move destination */
  drawLegalMoveDot(file: number, rank: number, isCapture: boolean) {
    const { ctx } = this
    const { x, y } = this.boardRenderer.toPixel(file, rank)
    const gridSize = this.boardRenderer['gridSize']

    if (isCapture) {
      // Capture: hollow ring around the piece
      ctx.beginPath()
      ctx.arc(x, y, gridSize * 0.44, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(231, 76, 60, 0.6)'
      ctx.lineWidth = 3
      ctx.stroke()
    } else {
      // Empty square: small green dot
      ctx.beginPath()
      ctx.arc(x, y, gridSize * 0.12, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(46, 204, 113, 0.6)'
      ctx.fill()
    }
  }

  /** Draw highlight for the last move (from and to squares) */
  drawLastMoveHighlight(fromFile: number, fromRank: number, toFile: number, toRank: number) {
    const { ctx, pieceRadius } = this
    const gridSize = this.boardRenderer['gridSize']

    // From square
    const from = this.boardRenderer.toPixel(fromFile, fromRank)
    ctx.fillStyle = 'rgba(241, 196, 15, 0.25)'
    ctx.fillRect(
      from.x - gridSize / 2,
      from.y - gridSize / 2,
      gridSize,
      gridSize
    )

    // To square
    const to = this.boardRenderer.toPixel(toFile, toRank)
    ctx.fillStyle = 'rgba(241, 196, 15, 0.35)'
    ctx.fillRect(
      to.x - gridSize / 2,
      to.y - gridSize / 2,
      gridSize,
      gridSize
    )
  }

  /** Draw check highlight on the king */
  drawCheckHighlight(file: number, rank: number) {
    const { ctx, pieceRadius } = this
    const { x, y } = this.boardRenderer.toPixel(file, rank)

    // Pulsing red ring
    ctx.beginPath()
    ctx.arc(x, y, pieceRadius + 6, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.8)'
    ctx.lineWidth = 4
    ctx.stroke()
  }

  /** 绘制将杀/绝杀高亮（更强的视觉效果） */
  drawCheckmateHighlight(file: number, rank: number) {
    const { ctx, pieceRadius } = this
    const { x, y } = this.boardRenderer.toPixel(file, rank)

    // 外层红色光晕
    const glow = ctx.createRadialGradient(x, y, pieceRadius, x, y, pieceRadius + 16)
    glow.addColorStop(0, 'rgba(231, 76, 60, 0.4)')
    glow.addColorStop(1, 'rgba(231, 76, 60, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(x, y, pieceRadius + 16, 0, Math.PI * 2)
    ctx.fill()

    // 内层红色环
    ctx.beginPath()
    ctx.arc(x, y, pieceRadius + 4, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.9)'
    ctx.lineWidth = 5
    ctx.stroke()
  }
}
