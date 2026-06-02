/**
 * onlineGame Store - 在线对战状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWebSocket } from '../composables/useWebSocket'
import { Xiangqi } from 'elephantops/xiangqi'
import { parseSquare, makeSquare, SquareSet } from 'elephantops'
import { makeFen } from 'elephantops/fen'
import type { Square, Move, Color, Outcome } from 'elephantops'

export type GamePhase = 'lobby' | 'waiting' | 'playing' | 'finished'

export interface LastMove {
  from: Square
  to: Square
}

export const useOnlineGameStore = defineStore('onlineGame', () => {
  const phase = ref<GamePhase>('lobby')
  const roomId = ref('')
  const myColor = ref<Color>('red')
  const playerCount = ref(0)
  const fen = ref('')
  const turn = ref<Color>('red')
  const isCheck = ref(false)
  const isCheckmate = ref(false)
  const gameOverReason = ref('')
  const winner = ref<Color | undefined>(undefined)
  const lastMove = ref<LastMove | null>(null)
  const errorMessage = ref('')
  const drawOffered = ref(false)

  let game: Xiangqi | null = null
  const { status, connect, disconnect, send, onMessage } = useWebSocket()

  const isMyTurn = computed(() => turn.value === myColor.value)
  const opponentColor = computed(() => myColor.value === 'red' ? 'black' : 'red')

  let removeMessageHandler: (() => void) | null = null

  function setupMessageHandler() {
    if (removeMessageHandler) removeMessageHandler()

    removeMessageHandler = onMessage((msg: any) => {
      switch (msg.type) {
        case 'room_joined':
          roomId.value = msg.roomId
          playerCount.value = msg.playerCount
          if (msg.playerCount < 2) {
            phase.value = 'waiting'
          }
          break

        case 'game_start':
          myColor.value = msg.color
          phase.value = 'playing'
          errorMessage.value = ''
          game = Xiangqi.default()
          fen.value = makeFen(game.toSetup())
          turn.value = 'red'
          isCheck.value = false
          isCheckmate.value = false
          lastMove.value = null
          break

        case 'move':
          handleServerMove(msg.from, msg.to, msg.fen)
          break

        case 'game_over':
          phase.value = 'finished'
          gameOverReason.value = msg.reason
          winner.value = msg.winner
          break

        case 'opponent_disconnected':
          if (phase.value === 'playing' || phase.value === 'waiting') {
            phase.value = 'finished'
            gameOverReason.value = '对手断线'
            winner.value = myColor.value
          }
          break

        case 'draw_offered':
          drawOffered.value = true
          break

        case 'error':
          errorMessage.value = msg.message
          setTimeout(() => { errorMessage.value = '' }, 3000)
          break
      }
    })
  }

  function handleServerMove(from: string, to: string, serverFen: string) {
    const fromSquare = parseSquare(from)
    const toSquare = parseSquare(to)

    if (fromSquare === undefined || toSquare === undefined) return

    lastMove.value = { from: fromSquare, to: toSquare }

    if (game) {
      const move: Move = { from: fromSquare, to: toSquare }
      if (game.isLegal(move)) {
        game.play(move)
      }
    }

    fen.value = serverFen
    turn.value = game?.turn ?? (turn.value === 'red' ? 'black' : 'red')
    isCheck.value = game?.isCheck() ?? false
    isCheckmate.value = game?.isCheckmate() ?? false
  }

  function joinGame(targetRoomId?: string) {
    setupMessageHandler()

    // 开发模式通过 Vite 代理，直连用 3000 端口
    const isDev = import.meta.env.DEV
    let wsUrl: string
    if (isDev) {
      // Vite dev server 代理 /ws -> ws://localhost:3000
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${window.location.host}/ws`
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${window.location.host}/ws`
    }

    connect(wsUrl)

    const checkConnection = setInterval(() => {
      if (status.value === 'connected') {
        clearInterval(checkConnection)
        if (targetRoomId) {
          send({ type: 'join', roomId: targetRoomId })
        } else {
          send({ type: 'join', roomId: generateRoomId() })
        }
      }
    }, 100)

    setTimeout(() => clearInterval(checkConnection), 10000)
  }

  function sendMove(from: Square, to: Square) {
    if (!isMyTurn.value) return
    if (phase.value !== 'playing') return

    send({ type: 'move', from: makeSquare(from), to: makeSquare(to) })
  }

  function getLegalDests(square: Square): SquareSet {
    if (!game) return SquareSet.empty()
    return game.dests(square)
  }

  function isLegalMove(from: Square, to: Square): boolean {
    if (!game) return false
    return game.isLegal({ from, to })
  }

  function getPiece(square: Square) {
    return game?.board.get(square)
  }

  function resign() {
    send({ type: 'resign' })
  }

  function offerDraw() {
    send({ type: 'draw_offer' })
  }

  function acceptDraw() {
    send({ type: 'draw_accept' })
  }

  function backToLobby() {
    disconnect()
    phase.value = 'lobby'
    roomId.value = ''
    myColor.value = 'red'
    playerCount.value = 0
    fen.value = ''
    turn.value = 'red'
    isCheck.value = false
    isCheckmate.value = false
    gameOverReason.value = ''
    winner.value = undefined
    lastMove.value = null
    errorMessage.value = ''
    drawOffered.value = false
    game = null
  }

  function generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  return {
    phase, roomId, myColor, opponentColor, playerCount,
    fen, turn, isCheck, isCheckmate, isMyTurn,
    gameOverReason, winner, lastMove, errorMessage, drawOffered,
    wsStatus: status,
    joinGame, sendMove, getLegalDests, isLegalMove, getPiece,
    resign, offerDraw, acceptDraw, backToLobby,
  }
})
