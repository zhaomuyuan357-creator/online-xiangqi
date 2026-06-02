/**
 * Board renderer - draws the xiangqi board on Canvas
 *
 * Board layout (9 columns a-i, 10 rows 0-9):
 *   - Red side at bottom (rows 0-4)
 *   - Black side at top (rows 5-9)
 *   - River between rows 4 and 5
 */

export interface BoardConfig {
  /** Canvas rendering context */
  ctx: CanvasRenderingContext2D
  /** Size of each grid cell in pixels */
  gridSize: number
  /** Padding around the board in pixels */
  padding: number
}

export class BoardRenderer {
  private ctx: CanvasRenderingContext2D
  private gridSize: number
  private padding: number

  /** Total canvas width */
  readonly width: number
  /** Total canvas height */
  readonly height: number

  constructor(config: BoardConfig) {
    this.ctx = config.ctx
    this.gridSize = config.gridSize
    this.padding = config.padding
    this.width = this.padding * 2 + this.gridSize * 8  // 9 columns = 8 gaps
    this.height = this.padding * 2 + this.gridSize * 9  // 10 rows = 9 gaps
  }

  /** Draw the complete board */
  draw() {
    this.drawBackground()
    this.drawGrid()
    this.drawPalaces()
    this.drawRiver()
    this.drawPositionMarkers()
    this.drawCoordinates()
  }

  /** Convert board coordinates to canvas pixel position */
  toPixel(file: number, rank: number): { x: number; y: number } {
    return {
      x: this.padding + file * this.gridSize,
      y: this.padding + rank * this.gridSize
    }
  }

  /** Convert canvas pixel position to board coordinates */
  fromPixel(x: number, y: number): { file: number; rank: number } | null {
    const file = Math.round((x - this.padding) / this.gridSize)
    const rank = Math.round((y - this.padding) / this.gridSize)
    if (file >= 0 && file <= 8 && rank >= 0 && rank <= 9) {
      return { file, rank }
    }
    return null
  }

  /** Draw wood-textured background */
  private drawBackground() {
    const { ctx, width, height } = this

    // Wood base color
    ctx.fillStyle = '#e8c97a'
    ctx.fillRect(0, 0, width, height)

    // Wood grain effect (subtle horizontal lines)
    ctx.strokeStyle = 'rgba(139, 90, 43, 0.15)'
    ctx.lineWidth = 1
    for (let y = 0; y < height; y += 3) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      // Slight wave pattern
      for (let x = 0; x < width; x += 20) {
        ctx.lineTo(x, y + Math.sin(x * 0.01 + y * 0.1) * 1.5)
      }
      ctx.stroke()
    }

    // Darker border around the board
    const borderX = this.padding - 2
    const borderY = this.padding - 2
    const borderWidth = this.gridSize * 8 + 4
    const borderHeight = this.gridSize * 9 + 4
    ctx.strokeStyle = '#5a3a1a'
    ctx.lineWidth = 3
    ctx.strokeRect(borderX, borderY, borderWidth, borderHeight)
  }

  /** Draw the 9x10 grid lines */
  private drawGrid() {
    const { ctx, gridSize, padding } = this

    ctx.strokeStyle = '#2c1810'
    ctx.lineWidth = 1

    // Horizontal lines (10 rows)
    for (let rank = 0; rank <= 9; rank++) {
      const y = padding + rank * gridSize
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + gridSize * 8, y)
      ctx.stroke()
    }

    // Vertical lines
    for (let file = 0; file <= 8; file++) {
      const x = padding + file * gridSize

      // Top half (rows 5-9, black side)
      ctx.beginPath()
      ctx.moveTo(x, padding + 5 * gridSize)
      ctx.lineTo(x, padding + 9 * gridSize)
      ctx.stroke()

      // Bottom half (rows 0-4, red side)
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, padding + 4 * gridSize)
      ctx.stroke()
    }

    // Left and right border lines (span full height)
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, padding + 4 * gridSize)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(padding + 8 * gridSize, padding)
    ctx.lineTo(padding + 8 * gridSize, padding + 4 * gridSize)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(padding, padding + 5 * gridSize)
    ctx.lineTo(padding, padding + 9 * gridSize)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(padding + 8 * gridSize, padding + 5 * gridSize)
    ctx.lineTo(padding + 8 * gridSize, padding + 9 * gridSize)
    ctx.stroke()
  }

  /** Draw the palace diagonal lines (九宫格) */
  private drawPalaces() {
    const { ctx, gridSize, padding } = this

    ctx.strokeStyle = '#2c1810'
    ctx.lineWidth = 1

    // Bottom palace (red, files c-e, rows 0-2)
    const bx1 = padding + 3 * gridSize
    const by1 = padding
    const bx2 = padding + 5 * gridSize
    const by2 = padding + 2 * gridSize
    ctx.beginPath()
    ctx.moveTo(bx1, by1)
    ctx.lineTo(bx2, by2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(bx2, by1)
    ctx.lineTo(bx1, by2)
    ctx.stroke()

    // Top palace (black, files c-e, rows 7-9)
    const tx1 = padding + 3 * gridSize
    const ty1 = padding + 7 * gridSize
    const tx2 = padding + 5 * gridSize
    const ty2 = padding + 9 * gridSize
    ctx.beginPath()
    ctx.moveTo(tx1, ty1)
    ctx.lineTo(tx2, ty2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(tx2, ty1)
    ctx.lineTo(tx1, ty2)
    ctx.stroke()
  }

  /** Draw "楚河" and "汉界" text on the river */
  private drawRiver() {
    const { ctx, gridSize, padding } = this

    const riverY = padding + 4.5 * gridSize

    ctx.fillStyle = '#2c1810'
    ctx.font = `bold ${gridSize * 0.45}px "KaiTi", "楷体", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // "楚河" on the left side
    ctx.save()
    ctx.translate(padding + 2 * gridSize, riverY)
    ctx.fillText('楚  河', 0, 0)
    ctx.restore()

    // "汉界" on the right side
    ctx.save()
    ctx.translate(padding + 6 * gridSize, riverY)
    ctx.fillText('漢  界', 0, 0)
    ctx.restore()
  }

  /** Draw position markers (小圆点) at cannon and pawn positions */
  private drawPositionMarkers() {
    const { ctx, gridSize, padding } = this
    const markerSize = gridSize * 0.08

    // Cannon positions: (1,2), (7,2), (1,7), (7,7)
    const cannonPositions = [
      { file: 1, rank: 2 }, { file: 7, rank: 2 },
      { file: 1, rank: 7 }, { file: 7, rank: 7 }
    ]

    // Pawn positions: (0,3), (2,3), (4,3), (6,3), (8,3), (0,6), (2,6), (4,6), (6,6), (8,6)
    const pawnPositions = [
      { file: 0, rank: 3 }, { file: 2, rank: 3 }, { file: 4, rank: 3 },
      { file: 6, rank: 3 }, { file: 8, rank: 3 },
      { file: 0, rank: 6 }, { file: 2, rank: 6 }, { file: 4, rank: 6 },
      { file: 6, rank: 6 }, { file: 8, rank: 6 }
    ]

    const allPositions = [...cannonPositions, ...pawnPositions]

    for (const pos of allPositions) {
      this.drawSingleMarker(pos.file, pos.rank, markerSize)
    }
  }

  /** Draw a single position marker (small cross or L-shape) */
  private drawSingleMarker(file: number, rank: number, size: number) {
    const { ctx, gridSize, padding } = this
    const cx = padding + file * gridSize
    const cy = padding + rank * gridSize
    const gap = size * 2

    ctx.strokeStyle = '#2c1810'
    ctx.lineWidth = 1

    // Draw 4 small L-shaped corners (skip edges at border)
    const corners = [
      { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
    ]

    for (const corner of corners) {
      const x = cx + corner.dx * gap
      const y = cy + corner.dy * gap

      // Check if this corner is within the board
      if (file === 0 && corner.dx === -1) continue
      if (file === 8 && corner.dx === 1) continue

      // Horizontal line
      ctx.beginPath()
      ctx.moveTo(x, y + corner.dy * size)
      ctx.lineTo(x, y)
      // Vertical line
      ctx.lineTo(x - corner.dx * size, y)
      ctx.stroke()
    }
  }

  /** Draw file (a-i) and rank (1-10) coordinate labels */
  private drawCoordinates() {
    const { ctx, gridSize, padding } = this

    const fileNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']

    // File labels at bottom
    ctx.fillStyle = '#5a3a1a'
    ctx.font = `bold ${gridSize * 0.3}px "Consolas", "Courier New", monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let file = 0; file <= 8; file++) {
      const x = padding + file * gridSize
      const y = padding + 9 * gridSize + gridSize * 0.5
      ctx.fillText(fileNames[file], x, y)
    }

    // Rank labels on the right (rank 0=top=10, rank 9=bottom=1)
    for (let rank = 0; rank <= 9; rank++) {
      const x = padding + 8 * gridSize + gridSize * 0.5
      const y = padding + rank * gridSize
      ctx.fillText(String(10 - rank), x, y)
    }
  }
}
