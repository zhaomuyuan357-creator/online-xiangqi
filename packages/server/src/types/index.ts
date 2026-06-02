/**
 * WebSocket 消息协议类型定义
 * 基于 DESIGN.md 中的通信协议
 */

/** 棋盘坐标 - 代数记号，如 "a0", "h9" */
export type Square = string

/** 棋色 */
export type Color = 'red' | 'black'

// ============ 客户端 → 服务端消息 ============

export interface JoinMessage {
  type: 'join'
  roomId: string
}

export interface MoveMessage {
  type: 'move'
  from: Square
  to: Square
}

export interface ResignMessage {
  type: 'resign'
}

export interface DrawOfferMessage {
  type: 'draw_offer'
}

export interface DrawAcceptMessage {
  type: 'draw_accept'
}

export type ClientMessage =
  | JoinMessage
  | MoveMessage
  | ResignMessage
  | DrawOfferMessage
  | DrawAcceptMessage

// ============ 服务端 → 客户端消息 ============

export interface GameStartMessage {
  type: 'game_start'
  color: Color
}

export interface MoveBroadcastMessage {
  type: 'move'
  from: Square
  to: Square
  fen: string
}

export interface GameOverMessage {
  type: 'game_over'
  reason: string
  winner?: Color
}

export interface ErrorMessage {
  type: 'error'
  message: string
}

export interface OpponentDisconnectedMessage {
  type: 'opponent_disconnected'
}

export interface DrawOfferedMessage {
  type: 'draw_offered'
}

export interface RoomJoinedMessage {
  type: 'room_joined'
  roomId: string
  playerCount: number
}

export type ServerMessage =
  | GameStartMessage
  | MoveBroadcastMessage
  | GameOverMessage
  | ErrorMessage
  | OpponentDisconnectedMessage
  | DrawOfferedMessage
  | RoomJoinedMessage
