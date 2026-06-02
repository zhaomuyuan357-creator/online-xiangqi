/**
 * useWebSocket - WebSocket 连接管理
 *
 * 提供连接、断开、发送消息、自动重连功能。
 */

import { ref, onUnmounted } from 'vue'

export type WsStatus = 'connecting' | 'connected' | 'disconnected'

export function useWebSocket() {
  const status = ref<WsStatus>('disconnected')
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 10
  let messageHandlers: Array<(data: any) => void> = []
  let currentUrl = ''

  function connect(url: string) {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    currentUrl = url
    status.value = 'connecting'
    ws = new WebSocket(url)

    ws.onopen = () => {
      status.value = 'connected'
      reconnectAttempts = 0
      console.log('[WS] 已连接')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        for (const handler of messageHandlers) {
          handler(data)
        }
      } catch (e) {
        console.error('[WS] 消息解析失败:', e)
      }
    }

    ws.onclose = () => {
      status.value = 'disconnected'
      ws = null
      console.log('[WS] 连接断开')
      scheduleReconnect()
    }

    ws.onerror = (err) => {
      console.error('[WS] 连接错误:', err)
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    reconnectAttempts = maxReconnectAttempts
    if (ws) {
      ws.close()
      ws = null
    }
    status.value = 'disconnected'
  }

  function send(message: object) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    } else {
      console.warn('[WS] 无法发送消息，连接未就绪')
    }
  }

  function onMessage(handler: (data: any) => void) {
    messageHandlers.push(handler)
    return () => {
      messageHandlers = messageHandlers.filter(h => h !== handler)
    }
  }

  function scheduleReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) return

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
    reconnectAttempts++

    reconnectTimer = setTimeout(() => {
      if (currentUrl && status.value === 'disconnected') {
        connect(currentUrl)
      }
    }, delay)
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    status,
    connect,
    disconnect,
    send,
    onMessage,
  }
}
