/**
 * useSound - 音效管理
 *
 * 使用 Web Audio API 合成落子音效，同时支持加载自定义音频文件。
 * 每步棋落子时播放音效："牢第坐下"。
 */

import { ref } from 'vue'

/** 全局音频上下文（所有 composable 实例共享） */
let audioCtx: AudioContext | null = null

/** 预加载的自定义音频 buffer */
let customBuffer: AudioBuffer | null = null
let customBufferLoading = false
let customBufferLoaded = false

/** 音效启用状态（全局） */
const enabled = ref(true)

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  // 浏览器要求用户交互后才能播放音频
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

/**
 * 合成落子音效 — 模拟棋子落在木质棋盘上的声音
 *
 * 由两个音层组成：
 * 1. 木质碰撞声（短促的低频 burst + noise）
 * 2. 棋子共振（轻微的 tonal decay）
 */
function playSyntheticMoveSound() {
  const ctx = getAudioContext()
  const now = ctx.currentTime

  // === 层 1: 木质碰撞 ===
  // 低频 burst
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(180, now)
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.08)
  oscGain.gain.setValueAtTime(0.35, now)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.15)

  // 噪声 burst（模拟木质碰撞的高频成分）
  const bufferSize = ctx.sampleRate * 0.06
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15))
  }
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.15, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

  // 带通滤波，让噪声听起来更像木质
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 800
  filter.Q.value = 1.5

  noise.connect(filter)
  filter.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(now)
  noise.stop(now + 0.08)

  // === 层 2: 棋子共振 ===
  const resonance = ctx.createOscillator()
  const resGain = ctx.createGain()
  resonance.type = 'triangle'
  resonance.frequency.setValueAtTime(420, now)
  resonance.frequency.exponentialRampToValueAtTime(280, now + 0.15)
  resGain.gain.setValueAtTime(0.08, now)
  resGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  resonance.connect(resGain)
  resGain.connect(ctx.destination)
  resonance.start(now)
  resonance.stop(now + 0.25)
}

/**
 * 播放吃子音效 — 比普通落子更重、更短促
 */
function playCaptureSound() {
  const ctx = getAudioContext()
  const now = ctx.currentTime

  // 更重的低频
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(250, now)
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.1)
  oscGain.gain.setValueAtTime(0.5, now)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.18)

  // 更强的噪声
  const bufferSize = ctx.sampleRate * 0.08
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1))
  }
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.25, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1000
  filter.Q.value = 1

  noise.connect(filter)
  filter.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(now)
  noise.stop(now + 0.1)
}

/**
 * 播放将军音效 — 短促的警示音
 */
function playCheckSound() {
  const ctx = getAudioContext()
  const now = ctx.currentTime

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(880, now)
  osc.frequency.setValueAtTime(660, now + 0.1)
  gain.gain.setValueAtTime(0.12, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.3)
}

/**
 * 播放游戏结束音效
 */
function playGameOverSound(won: boolean) {
  const ctx = getAudioContext()
  const now = ctx.currentTime

  if (won) {
    // 胜利：上行音阶
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.15, now + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.35)
    })
  } else {
    // 失败：下行音阶
    const notes = [523, 392, 330, 262]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.12, now + i * 0.15)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.15)
      osc.stop(now + i * 0.15 + 0.45)
    })
  }
}

/**
 * 尝试加载自定义音频文件（放在 public/sounds/move.mp3）
 */
async function loadCustomSound(url: string) {
  if (customBufferLoading || customBufferLoaded) return
  customBufferLoading = true

  try {
    const ctx = getAudioContext()
    const response = await fetch(url)
    if (!response.ok) return
    const arrayBuffer = await response.arrayBuffer()
    customBuffer = await ctx.decodeAudioData(arrayBuffer)
    customBufferLoaded = true
    console.log('[Sound] 自定义音效已加载')
  } catch {
    console.log('[Sound] 未找到自定义音效，使用合成音效')
  } finally {
    customBufferLoading = false
  }
}

/** 播放自定义音频 buffer */
function playCustomBuffer() {
  if (!customBuffer) return
  const ctx = getAudioContext()
  const source = ctx.createBufferSource()
  source.buffer = customBuffer
  const gain = ctx.createGain()
  gain.gain.value = 0.6
  source.connect(gain)
  gain.connect(ctx.destination)
  source.start()
}

export function useSound() {
  /**
   * 播放落子音效
   * @param isCapture 是否吃子
   */
  function playMoveSound(isCapture = false) {
    if (!enabled.value) return

    if (customBufferLoaded && customBuffer) {
      playCustomBuffer()
    } else if (isCapture) {
      playCaptureSound()
    } else {
      playSyntheticMoveSound()
    }
  }

  /** 播放将军音效 */
  function playCheckSoundEffect() {
    if (!enabled.value) return
    playCheckSound()
  }

  /** 播放游戏结束音效 */
  function playGameOverSoundEffect(won: boolean) {
    if (!enabled.value) return
    playGameOverSound(won)
  }

  /** 切换音效开关 */
  function toggleSound() {
    enabled.value = !enabled.value
  }

  /** 初始化：尝试加载自定义音效 */
  function initSound() {
    loadCustomSound('/sounds/move.mp3')
  }

  return {
    enabled,
    playMoveSound,
    playCheckSound: playCheckSoundEffect,
    playGameOverSound: playGameOverSoundEffect,
    toggleSound,
    initSound,
  }
}
