import { ref, computed, shallowRef } from 'vue'
import { Xiangqi } from 'elephantops/xiangqi'
import { parseSquare, makeSquare, squareFile, squareRank } from 'elephantops'
import { makeFen } from 'elephantops/fen'
import { SquareSet } from 'elephantops'
import type { Square, Move, Piece, Color } from 'elephantops'

export function useXiangqi() {
  // Use shallowRef because Xiangqi is a class with internal state
  // After play(), we must replace with a clone to trigger reactivity
  const game = shallowRef(Xiangqi.default())
  const selectedSquare = ref<Square | null>(null)
  const legalDests = ref<SquareSet>(SquareSet.empty())
  const lastMove = ref<Move | null>(null)

  // Computed game state
  const fen = computed(() => makeFen(game.value.toSetup()))
  const turn = computed(() => game.value.turn)
  const isCheck = computed(() => game.value.isCheck())
  const isCheckmate = computed(() => game.value.isCheckmate())
  const isStalemate = computed(() => game.value.isStalemate())
  const isGameOver = computed(() => game.value.isEnd())
  const outcome = computed(() => game.value.outcome())

  // Get piece at a square
  function getPiece(square: Square): Piece | undefined {
    return game.value.board.get(square)
  }

  // Select a square (click interaction)
  function selectSquare(square: Square) {
    const piece = game.value.board.get(square)

    if (selectedSquare.value !== null) {
      // A piece is already selected
      const move: Move = { from: selectedSquare.value, to: square }

      if (game.value.isLegal(move)) {
        // Make the move
        const newGame = game.value.clone()
        newGame.play(move)
        game.value = newGame
        lastMove.value = move
        selectedSquare.value = null
        legalDests.value = SquareSet.empty()
        return
      }
    }

    // Select a new piece (must be current player's piece)
    if (piece && piece.color === game.value.turn) {
      selectedSquare.value = square
      legalDests.value = game.value.dests(square)
    } else {
      // Click on empty square or opponent's piece with no selection
      selectedSquare.value = null
      legalDests.value = SquareSet.empty()
    }
  }

  // Reset the game
  function reset() {
    game.value = Xiangqi.default()
    selectedSquare.value = null
    legalDests.value = SquareSet.empty()
    lastMove.value = null
  }

  // Get all legal moves for current player
  function getAllLegalMoves(): Move[] {
    const moves: Move[] = []
    const all = game.value.allDests()
    for (const [from, targets] of all) {
      for (const to of targets) {
        moves.push({ from, to })
      }
    }
    return moves
  }

  // Helper: convert square index to file/rank for Canvas rendering
  function squareToCoords(square: Square): { file: number; rank: number } {
    return {
      file: squareFile(square),
      rank: squareRank(square)
    }
  }

  // Helper: convert file/rank to square index
  function coordsToSquare(file: number, rank: number): Square | undefined {
    return parseSquare(`${'abcdefghi'[file]}${rank + 1}`)
  }

  // Get the king's square for a color (for check highlight)
  function getKingSquare(color: Color): Square | undefined {
    return game.value.board.kingOf(color)
  }

  return {
    // State
    game,
    fen,
    turn,
    isCheck,
    isCheckmate,
    isStalemate,
    isGameOver,
    outcome,
    selectedSquare,
    legalDests,
    lastMove,

    // Methods
    getPiece,
    selectSquare,
    reset,
    getAllLegalMoves,
    squareToCoords,
    coordsToSquare,
    getKingSquare,

    // Re-exports for convenience
    parseSquare,
    makeSquare,
    SquareSet
  }
}
