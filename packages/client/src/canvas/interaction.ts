/**
 * Interaction handler - manages click events on the Canvas
 *
 * Converts pixel coordinates to board coordinates and triggers game actions.
 */

import type { BoardRenderer } from './boardRenderer'

export interface InteractionConfig {
  canvas: HTMLCanvasElement
  boardRenderer: BoardRenderer
  onSelectSquare: (file: number, rank: number) => void
}

export class Interaction {
  private canvas: HTMLCanvasElement
  private boardRenderer: BoardRenderer
  private onSelectSquare: (file: number, rank: number) => void
  private boundHandler: (e: MouseEvent) => void

  constructor(config: InteractionConfig) {
    this.canvas = config.canvas
    this.boardRenderer = config.boardRenderer
    this.onSelectSquare = config.onSelectSquare

    // Bind the handler so we can remove it later
    this.boundHandler = this.handleClick.bind(this)
  }

  /** Start listening for click events */
  attach() {
    this.canvas.addEventListener('click', this.boundHandler)
  }

  /** Stop listening for click events */
  detach() {
    this.canvas.removeEventListener('click', this.boundHandler)
  }

  /** Handle canvas click */
  private handleClick(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Account for CSS scaling (if canvas size != display size)
    const scaleX = this.canvas.width / rect.width
    const scaleY = this.canvas.height / rect.height

    const coords = this.boardRenderer.fromPixel(x * scaleX, y * scaleY)
    if (coords) {
      this.onSelectSquare(coords.file, coords.rank)
    }
  }
}
