<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useOnlineGameStore } from '../stores/onlineGame'
import { useSound } from '../composables/useSound'
import { BoardRenderer } from '../canvas/boardRenderer'
import { PieceRenderer } from '../canvas/pieceRenderer'
import { Interaction } from '../canvas/interaction'
import { squareFile, squareRank, SquareSet } from 'elephantops'
import type { Square } from 'elephantops'

const store = useOnlineGameStore()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const joinRoomId = ref('')
const copied = ref(false)

// 音效
const { enabled: soundEnabled, playMoveSound, playCheckSound, playGameOverSound, toggleSound, initSound } = useSound()

let boardRenderer: BoardRenderer
let pieceRenderer: PieceRenderer
let interaction: Interaction

const selectedSquare = ref<Square | null>(null)
const legalDests = ref<SquareSet>(SquareSet.empty())

function draw() {
  if (!boardRenderer || !pieceRenderer) return

  boardRenderer.draw()

  if (store.lastMove) {
    pieceRenderer.drawLastMoveHighlight(
      squareFile(store.lastMove.from), squareRank(store.lastMove.from),
      squareFile(store.lastMove.to), squareRank(store.lastMove.to),
    )
  }

  if (store.isCheck) {
    const kingSquare = findKingSquare(store.turn)
    if (kingSquare !== undefined) {
      pieceRenderer.drawCheckHighlight(squareFile(kingSquare), squareRank(kingSquare))
    }
  }

  // 获取动画中的棋子信息
  const animInfo = pieceRenderer.getAnimatingPiece()

  for (let rank = 0; rank <= 9; rank++) {
    for (let file = 0; file <= 8; file++) {
      const square = file + 9 * rank
      const piece = store.getPiece(square)
      if (piece) {
        // 跳过动画中的棋子
        if (animInfo && animInfo.toFile === file && animInfo.toRank === rank) continue
        pieceRenderer.drawPiece(piece, file, rank)
      }
    }
  }

  // 绘制动画中的棋子
  if (animInfo) {
    const pos = pieceRenderer.getAnimatedPosition()
    if (pos) {
      pieceRenderer.drawPieceAt(animInfo.piece, pos.x, pos.y)
    }
  }

  if (selectedSquare.value !== null) {
    pieceRenderer.drawSelectionHighlight(
      squareFile(selectedSquare.value),
      squareRank(selectedSquare.value),
    )
    for (const dest of legalDests.value) {
      pieceRenderer.drawLegalMoveDot(squareFile(dest), squareRank(dest), !!store.getPiece(dest))
    }
  }
}

function findKingSquare(color: string): Square | undefined {
  for (let rank = 0; rank <= 9; rank++) {
    for (let file = 0; file <= 8; file++) {
      const square = file + 9 * rank
      const piece = store.getPiece(square)
      if (piece && piece.role === 'king' && piece.color === color) {
        return square
      }
    }
  }
  return undefined
}

function handleSelectSquare(file: number, rank: number) {
  if (store.phase !== 'playing' || !store.isMyTurn) return

  const square = file + 9 * rank

  if (selectedSquare.value !== null) {
    if (legalDests.value.has(square)) {
      store.sendMove(selectedSquare.value, square)
      selectedSquare.value = null
      legalDests.value = SquareSet.empty()
      return
    }
  }

  const piece = store.getPiece(square)
  if (piece && piece.color === store.myColor) {
    selectedSquare.value = square
    legalDests.value = store.getLegalDests(square)
  } else {
    selectedSquare.value = null
    legalDests.value = SquareSet.empty()
  }
}

function createRoom() {
  store.joinGame()
}

function joinRoom() {
  if (!joinRoomId.value.trim()) return
  store.joinGame(joinRoomId.value.trim())
}

function copyRoomId() {
  navigator.clipboard.writeText(store.roomId)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

onMounted(async () => {
  initSound()

  await nextTick()

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
    onSelectSquare: handleSelectSquare,
  })
  interaction.attach()
})

onUnmounted(() => {
  interaction?.detach()
})

watch(
  () => [store.fen, store.lastMove, store.isCheck, store.phase, selectedSquare.value, legalDests.value],
  () => {
    if (store.phase === 'playing' || store.phase === 'finished') {
      draw()
    }
  },
  { deep: true }
)

// 走棋动画 + 音效
watch(
  () => store.lastMove,
  (move) => {
    if (!move || store.phase !== 'playing') return
    // 判断是否吃子
    const capturedPiece = store.getPiece(move.to)
    playMoveSound(!!capturedPiece)

    // 启动走棋动画
    const piece = store.getPiece(move.to)
    if (piece && pieceRenderer) {
      pieceRenderer.animateMove(
        piece,
        squareFile(move.from), squareRank(move.from),
        squareFile(move.to), squareRank(move.to),
        () => draw(),
        undefined,
        200,
      )
    }
  },
)

// 音效：将军时播放
watch(
  () => store.isCheck,
  (check) => {
    if (check && store.phase === 'playing') {
      playCheckSound()
    }
  },
)

// 音效：游戏结束时播放
watch(
  () => store.phase,
  (phase, oldPhase) => {
    if (phase === 'finished' && oldPhase === 'playing') {
      const won = store.winner === store.myColor
      playGameOverSound(won)
    }
  },
)
</script>

<template>
  <div class="online-game">
    <!-- 大厅 -->
    <div v-if="store.phase === 'lobby'" class="lobby">
      <h2 class="lobby-title">🀄 联网对战</h2>
      <div class="lobby-actions">
        <button class="btn btn-primary" @click="createRoom">创建房间</button>
        <div class="divider">或</div>
        <div class="join-form">
          <input
            v-model="joinRoomId"
            class="room-input"
            placeholder="输入房间号"
            maxlength="6"
            @keyup.enter="joinRoom"
          />
          <button class="btn btn-secondary" @click="joinRoom" :disabled="!joinRoomId.trim()">加入</button>
        </div>
      </div>
      <div v-if="store.errorMessage" class="error-msg">{{ store.errorMessage }}</div>
    </div>

    <!-- 等待 -->
    <div v-else-if="store.phase === 'waiting'" class="waiting">
      <h2>等待对手加入...</h2>
      <div class="room-info">
        <span class="room-label">房间号：</span>
        <span class="room-id">{{ store.roomId }}</span>
        <button class="btn btn-small" @click="copyRoomId">{{ copied ? '已复制 ✓' : '复制' }}</button>
      </div>
      <p class="hint">分享房间号给好友加入对战</p>
      <button class="btn btn-ghost" @click="store.backToLobby()">返回大厅</button>
    </div>

    <!-- 连接状态指示 -->
    <div v-if="store.wsStatus === 'connecting'" class="connection-banner connecting">
      正在连接服务器...
    </div>
    <div v-else-if="store.wsStatus === 'disconnected' && store.phase === 'playing'" class="connection-banner disconnected">
      连接断开，正在重连...
    </div>

    <!-- 游戏 -->
    <div v-else class="game-area">
      <div class="board-section">
        <canvas ref="canvasRef" class="board-canvas" />
      </div>

      <div class="info-panel">
        <div class="room-badge">
          房间：{{ store.roomId }}
          <div class="badge-actions">
            <button class="btn btn-tiny" @click="copyRoomId">{{ copied ? '✓' : '复制' }}</button>
            <button class="btn btn-tiny" @click="toggleSound" :title="soundEnabled ? '关闭音效' : '开启音效'">
              {{ soundEnabled ? '🔊' : '🔇' }}
            </button>
          </div>
        </div>

        <div class="color-info">
          你执：<span :class="store.myColor === 'red' ? 'text-red' : 'text-black'">
            {{ store.myColor === 'red' ? '红方' : '黑方' }}
          </span>
        </div>

        <div class="status-box">
          <template v-if="store.phase === 'finished'">
            <div class="game-over-text">
              <template v-if="store.winner === store.myColor">🎉 你赢了！</template>
              <template v-else-if="store.winner && store.winner !== store.myColor">😢 你输了</template>
              <template v-else>🤝 和棋</template>
            </div>
            <div class="reason">{{ store.gameOverReason }}</div>
          </template>
          <template v-else>
            <div v-if="store.isCheck" class="check-text">将军！</div>
            <div v-if="store.isMyTurn" class="turn-text your-turn">轮到你走棋</div>
            <div v-else class="turn-text waiting-turn">等待对手走棋...</div>
          </template>
        </div>

        <div v-if="store.errorMessage" class="error-msg">{{ store.errorMessage }}</div>

        <div class="actions" v-if="store.phase === 'playing'">
          <button class="btn btn-danger" @click="store.resign()">认输</button>
          <button class="btn btn-ghost" @click="store.offerDraw()" :disabled="store.drawOffered">提议和棋</button>
          <button
            v-if="store.drawOffered"
            class="btn btn-primary"
            @click="store.acceptDraw()"
          >
            接受和棋
          </button>
        </div>

        <div class="actions" v-if="store.phase === 'finished'">
          <button class="btn btn-primary" @click="store.backToLobby()">返回大厅</button>
        </div>

        <div class="fen-debug" v-if="store.fen">
          <small>FEN: {{ store.fen }}</small>
        </div>
      </div>
    </div>

    <!-- 游戏结束弹窗 -->
    <Transition name="modal">
      <div v-if="store.phase === 'finished'" class="game-over-modal" @click.self="store.backToLobby()">
        <div class="modal-content">
          <div class="modal-icon">
            <template v-if="store.winner === store.myColor">🏆</template>
            <template v-else-if="store.winner && store.winner !== store.myColor">😔</template>
            <template v-else>🤝</template>
          </div>
          <h2 class="modal-title">
            <template v-if="store.winner === store.myColor">你赢了！</template>
            <template v-else-if="store.winner && store.winner !== store.myColor">你输了</template>
            <template v-else>和棋</template>
          </h2>
          <p class="modal-subtitle">{{ store.gameOverReason }}</p>
          <button class="modal-btn" @click="store.backToLobby()">返回大厅</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.online-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 60vh;
  color: #eee;
  font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
  width: 100%;
}

.lobby {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  margin-top: 40px;
}

.lobby-title {
  font-size: 2.2rem;
  color: #e8c97a;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.lobby-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  min-width: 280px;
}

.divider {
  color: #666;
  font-size: 0.9rem;
}

.join-form {
  display: flex;
  gap: 8px;
}

.room-input {
  padding: 10px 16px;
  border: 2px solid #444;
  border-radius: 6px;
  background: #2a2a3e;
  color: #eee;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  width: 160px;
  text-align: center;
}

.room-input:focus {
  outline: none;
  border-color: #e8c97a;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-primary { background: #e74c3c; color: white; }
.btn-primary:hover { background: #c0392b; }

.btn-secondary { background: #3498db; color: white; }
.btn-secondary:hover { background: #2980b9; }
.btn-secondary:disabled { background: #555; cursor: not-allowed; }

.btn-danger { background: #e74c3c; color: white; }
.btn-danger:hover { background: #c0392b; }

.btn-ghost { background: transparent; color: #aaa; border: 1px solid #555; }
.btn-ghost:hover { border-color: #888; color: #eee; }

.btn-small {
  padding: 4px 12px;
  font-size: 0.85rem;
  background: #444;
  color: #eee;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-tiny {
  padding: 2px 8px;
  font-size: 0.75rem;
  background: #444;
  color: #eee;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  margin-left: 4px;
}

.waiting {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-top: 40px;
}

.waiting h2 { color: #e8c97a; font-size: 1.6rem; }

.room-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}

.room-label { color: #aaa; }

.room-id {
  font-size: 1.8rem;
  font-weight: bold;
  color: #e8c97a;
  letter-spacing: 4px;
  font-family: monospace;
}

.hint { color: #888; font-size: 0.9rem; }

.game-area {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

@media (max-width: 800px) {
  .game-area {
    flex-direction: column;
    align-items: center;
  }

  .board-section {
    max-width: 100vw;
    overflow: auto;
  }

  .info-panel {
    min-width: unset;
    width: 100%;
    max-width: 520px;
  }
}

.board-section {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.board-canvas { display: block; cursor: pointer; }

.info-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 180px;
}

.room-badge {
  font-size: 0.85rem;
  color: #aaa;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.badge-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.color-info {
  font-size: 1.1rem;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 6px;
}

.text-red { color: #e74c3c; font-weight: bold; }
.text-black { color: #3498db; font-weight: bold; }

.status-box {
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  text-align: center;
}

.game-over-text { font-size: 1.4rem; font-weight: bold; color: #2ecc71; }
.reason { color: #aaa; margin-top: 4px; }

.check-text {
  color: #f39c12;
  font-weight: bold;
  font-size: 1.2rem;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.turn-text { font-size: 1.1rem; }
.your-turn { color: #2ecc71; font-weight: bold; }
.waiting-turn { color: #888; }

.error-msg {
  color: #e74c3c;
  font-size: 0.9rem;
  padding: 8px 12px;
  background: rgba(231, 76, 60, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.actions { display: flex; flex-direction: column; gap: 8px; }

.fen-debug {
  margin-top: 8px;
  font-family: monospace;
  font-size: 0.7rem;
  color: #555;
  word-break: break-all;
  padding: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

/* 连接状态指示 */
.connection-banner {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 0.9rem;
  margin-bottom: 12px;
  text-align: center;
}

.connection-banner.connecting {
  background: rgba(52, 152, 219, 0.2);
  color: #3498db;
  border: 1px solid rgba(52, 152, 219, 0.3);
}

.connection-banner.disconnected {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
  border: 1px solid rgba(231, 76, 60, 0.3);
  animation: pulse 2s infinite;
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
