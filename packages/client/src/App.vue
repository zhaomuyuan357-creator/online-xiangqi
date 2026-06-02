<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useXiangqi } from './composables/useXiangqi'
import { useSound } from './composables/useSound'
import { BoardRenderer } from './canvas/boardRenderer'
import { PieceRenderer } from './canvas/pieceRenderer'
import { Interaction } from './canvas/interaction'
import { squareFile, squareRank } from 'elephantops'
import OnlineGame from './views/OnlineGame.vue'

// 模式切换
const mode = ref<'local' | 'online'>('online')

const canvasRef = ref<HTMLCanvasElement | null>(null)

const {
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
  getPiece,
  selectSquare,
  reset,
  getKingSquare,
  SquareSet
} = useXiangqi()

// 音效
const { enabled: soundEnabled, playMoveSound, playCheckSound, playGameOverSound, toggleSound, initSound } = useSound()

let boardRenderer: BoardRenderer
let pieceRenderer: PieceRenderer
let interaction: Interaction

/** Draw the entire scene */
function draw() {
  if (!boardRenderer || !pieceRenderer) return

  // Draw board (includes background clear)
  boardRenderer.draw()

  // Draw last move highlight (under pieces)
  if (lastMove.value) {
    pieceRenderer.drawLastMoveHighlight(
      squareFile(lastMove.value.from), squareRank(lastMove.value.from),
      squareFile(lastMove.value.to), squareRank(lastMove.value.to),
    )
  }

  // Draw check/checkmate highlight (under pieces)
  if (isCheck.value) {
    const kingSquare = getKingSquare(turn.value)
    if (kingSquare !== undefined) {
      if (isCheckmate.value) {
        pieceRenderer.drawCheckmateHighlight(squareFile(kingSquare), squareRank(kingSquare))
      } else {
        pieceRenderer.drawCheckHighlight(squareFile(kingSquare), squareRank(kingSquare))
      }
    }
  }

  // 获取动画中的棋子信息
  const animInfo = pieceRenderer.getAnimatingPiece()

  // Draw all pieces（跳过动画中的棋子）
  for (const [square, piece] of game.value.board) {
    const file = squareFile(square)
    const rank = squareRank(square)
    // 如果这个棋子正在动画中，跳过（稍后在动画位置绘制）
    if (animInfo && animInfo.toFile === file && animInfo.toRank === rank) continue
    pieceRenderer.drawPiece(piece, file, rank)
  }

  // 绘制动画中的棋子（在插值位置）
  if (animInfo) {
    const pos = pieceRenderer.getAnimatedPosition()
    if (pos) {
      pieceRenderer.drawPieceAt(animInfo.piece, pos.x, pos.y)
    }
  }

  // Draw selection highlight (on top of pieces)
  if (selectedSquare.value !== null) {
    pieceRenderer.drawSelectionHighlight(
      squareFile(selectedSquare.value),
      squareRank(selectedSquare.value),
    )
    // Draw legal move indicators
    for (const dest of legalDests.value) {
      pieceRenderer.drawLegalMoveDot(squareFile(dest), squareRank(dest), !!getPiece(dest))
    }
  }
}

/** Handle square selection from interaction */
function handleSelectSquare(file: number, rank: number) {
  const square = file + 9 * rank
  selectSquare(square)
}

function setupLocalBoard() {
  nextTick(() => {
    const canvas = canvasRef.value
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const gridSize = 60
    const padding = 40

    boardRenderer = new BoardRenderer({ ctx, gridSize, padding })
    pieceRenderer = new PieceRenderer({ ctx, boardRenderer })

    canvas.width = boardRenderer.width
    canvas.height = boardRenderer.height

    interaction = new Interaction({
      canvas,
      boardRenderer,
      onSelectSquare: handleSelectSquare
    })
    interaction.attach()

    draw()
  })
}

onMounted(() => {
  // 检查 URL 参数是否有房间号
  const urlParams = new URLSearchParams(window.location.search)
  const roomFromUrl = urlParams.get('room')
  if (roomFromUrl) {
    mode.value = 'online'
  }

  if (mode.value === 'local') {
    setupLocalBoard()
  }

  // 初始化音效（尝试加载自定义音频文件）
  initSound()
})

onUnmounted(() => {
  interaction?.detach()
})

// Redraw whenever game state changes
watch([game, selectedSquare, legalDests, lastMove, isCheck], () => {
  if (mode.value === 'local') draw()
})

// 切换模式时重新初始化本地棋盘
watch(mode, (newMode) => {
  if (newMode === 'local') {
    nextTick(() => setupLocalBoard())
  }
})

// 走棋动画 + 音效
watch(lastMove, (move) => {
  if (!move || mode.value !== 'local') return

  // 判断是否吃子：目标位置有棋子
  const capturedPiece = getPiece(move.to)
  const isCapture = !!capturedPiece

  // 播放音效
  playMoveSound(isCapture)

  // 启动走棋动画
  const piece = getPiece(move.to)
  if (piece && pieceRenderer) {
    pieceRenderer.animateMove(
      piece,
      squareFile(move.from), squareRank(move.from),
      squareFile(move.to), squareRank(move.to),
      () => draw(),  // 动画每帧重绘
      undefined,     // 动画结束回调
      200,           // 动画时长 200ms
    )
  }
})

// 音效：将军时播放
watch(isCheck, (check) => {
  if (check && mode.value === 'local') {
    playCheckSound()
  }
})

// 音效：游戏结束时播放
watch(isGameOver, (over) => {
  if (over && mode.value === 'local') {
    const won = outcome.value?.winner === turn.value
    playGameOverSound(!won) // turn 已经切换了，当前方是被将杀方
  }
})
</script>

<template>
  <div class="app">
    <h1 class="title">线上象棋</h1>

    <!-- 模式切换 -->
    <div class="mode-tabs">
      <button class="tab" :class="{ active: mode === 'online' }" @click="mode = 'online'">
        🌐 联网对战
      </button>
      <button class="tab" :class="{ active: mode === 'local' }" @click="mode = 'local'">
        🏠 本地对战
      </button>
    </div>

    <!-- 联网对战 -->
    <OnlineGame v-if="mode === 'online'" />

    <!-- 本地对战 -->
    <div v-else class="game-container">
      <div class="board-wrapper">
        <canvas ref="canvasRef" class="board-canvas" />
      </div>

      <div class="info-panel">
        <div class="status">
          <span v-if="isGameOver" class="game-over">
            游戏结束：
            <template v-if="outcome?.winner === 'red'">红方胜！</template>
            <template v-else-if="outcome?.winner === 'black'">黑方胜！</template>
            <template v-else>和棋</template>
          </span>
          <span v-else-if="isCheckmate" class="checkmate">将杀！</span>
          <span v-else-if="isCheck" class="check">将军！</span>
          <span v-else>
            当前回合：
            <span :class="turn === 'red' ? 'red-turn' : 'black-turn'">
              {{ turn === 'red' ? '红方' : '黑方' }}
            </span>
          </span>
        </div>

        <div class="fen-display">
          <small>FEN: {{ fen }}</small>
        </div>

        <div class="button-row">
          <button class="reset-btn" @click="reset">
            重新开始
          </button>
          <button class="sound-btn" @click="toggleSound" :title="soundEnabled ? '关闭音效' : '开启音效'">
            {{ soundEnabled ? '🔊' : '🔇' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 游戏结束弹窗 -->
    <Transition name="modal">
      <div v-if="isGameOver" class="game-over-modal" @click.self="reset">
        <div class="modal-content">
          <div class="modal-icon">
            <template v-if="outcome?.winner === 'red'">🏆</template>
            <template v-else-if="outcome?.winner === 'black'">🏆</template>
            <template v-else>🤝</template>
          </div>
          <h2 class="modal-title">
            <template v-if="outcome?.winner === 'red'">红方胜！</template>
            <template v-else-if="outcome?.winner === 'black'">黑方胜！</template>
            <template v-else>和棋</template>
          </h2>
          <p class="modal-subtitle">
            <template v-if="isCheckmate">将杀</template>
            <template v-else-if="isStalemate">困毙</template>
            <template v-else>游戏结束</template>
          </p>
          <button class="modal-btn" @click="reset">再来一局</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background: #1a1a2e;
  color: #eee;
  font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
  padding: 20px;
}

.title {
  font-size: 2rem;
  margin-bottom: 12px;
  color: #e8c97a;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.mode-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 4px;
}

.tab {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #888;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.tab:hover { color: #ccc; }

.tab.active {
  background: rgba(232, 201, 122, 0.15);
  color: #e8c97a;
  font-weight: bold;
}

.game-container {
  display: flex;
  gap: 30px;
  align-items: flex-start;
}

@media (max-width: 800px) {
  .game-container {
    flex-direction: column;
    align-items: center;
  }

  .board-wrapper {
    transform-origin: top center;
    max-width: 100vw;
    overflow: auto;
  }

  .info-panel {
    min-width: unset;
    width: 100%;
    max-width: 520px;
  }
}

.board-wrapper {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.board-canvas {
  display: block;
  cursor: pointer;
}

.info-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 180px;
}

.status {
  font-size: 1.2rem;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}

.red-turn {
  color: #e74c3c;
  font-weight: bold;
}

.black-turn {
  color: #3498db;
  font-weight: bold;
}

.check {
  color: #f39c12;
  font-weight: bold;
}

.checkmate {
  color: #e74c3c;
  font-weight: bold;
}

.game-over {
  color: #2ecc71;
  font-weight: bold;
}

.fen-display {
  font-family: monospace;
  font-size: 0.75rem;
  color: #888;
  word-break: break-all;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.button-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.reset-btn {
  padding: 10px 20px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.reset-btn:hover {
  background: #c0392b;
}

.sound-btn {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid #444;
  border-radius: 6px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
}

.sound-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: #666;
}

/* 游戏结束弹窗 */
.game-over-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: linear-gradient(135deg, #2a2a3e, #1a1a2e);
  border: 2px solid #e8c97a;
  border-radius: 16px;
  padding: 40px 50px;
  text-align: center;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
}

.modal-icon {
  font-size: 4rem;
  margin-bottom: 12px;
  animation: bounce 0.6s ease-out;
}

@keyframes bounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.modal-title {
  font-size: 2rem;
  color: #e8c97a;
  margin-bottom: 8px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.modal-subtitle {
  color: #aaa;
  font-size: 1rem;
  margin-bottom: 24px;
}

.modal-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.modal-btn:hover {
  background: linear-gradient(135deg, #c0392b, #a93226);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
}

/* 弹窗过渡动画 */
.modal-enter-active {
  transition: all 0.3s ease-out;
}

.modal-leave-active {
  transition: all 0.2s ease-in;
}

.modal-enter-from {
  opacity: 0;
}

.modal-enter-from .modal-content {
  transform: scale(0.8);
  opacity: 0;
}

.modal-leave-to {
  opacity: 0;
}

.modal-leave-to .modal-content {
  transform: scale(0.9);
  opacity: 0;
}
</style>
