# 🐵 SL Wukong Engine

A powerful TypeScript Xiangqi (Chinese Chess) engine with advanced AI search algorithms.

## 🚀 Installation

```bash
npm install sl-wukong-engine
```

## 📖 Usage

### Basic Example

```javascript
const engine = require('sl-wukong-engine');

// Initialize with starting position
engine.setBoard(engine.START_FEN);

// Print the board
engine.printBoard();

// Generate legal moves
const moves = engine.generateMoves();
console.log(`Legal moves: ${moves.length}`);

// Make a move
const move = moves[0].move;
if (engine.makeMove(move)) {
  console.log(`Move made: ${engine.moveToString(move)}`);
  engine.printBoard();
}

// Take back the move
engine.takeBack();
```

### TypeScript Example

```typescript
import engine from 'sl-wukong-engine';

// Set custom position using FEN notation
engine.setBoard('rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1');

// Evaluate position
const score = engine.evaluate();
console.log(`Position score: ${score}`);

// Get board state
const state = engine.getBoardState();
console.log(`Current side: ${state.side === 0 ? 'Red' : 'Black'}`);
```

## 🎮 API Reference

### Board Management

- `setBoard(fen: string)` - Set board position from FEN notation
- `getBoard()` - Get current board array
- `printBoard()` - Print board to console
- `getBoardState()` - Get complete board state
- `resetBoard()` - Reset to starting position

### Move Generation & Execution

- `generateMoves(type?: number)` - Generate legal moves (0 = all, 1 = captures only)
- `makeMove(move: number)` - Make a move (returns true if legal)
- `takeBack()` - Undo last move
- `moveToString(move: number)` - Convert move to algebraic notation
- `isSquareAttacked(square: number, side: number)` - Check if square is attacked

### Evaluation

- `evaluate()` - Evaluate current position (positive = Red advantage)
- `isInCheck(side: number)` - Check if side is in check

### FEN & Notation

- `getFen()` - Get current position as FEN string
- `START_FEN` - Starting position FEN constant

### Move Encoding

Moves are encoded as 32-bit integers containing:
- Source square
- Target square
- Piece type
- Captured piece (if any)
- Special flags

Use `moveToString()` to convert to human-readable format.

## 🎯 Features

- ✅ Full Xiangqi rules implementation
- ✅ Legal move generation
- ✅ Position evaluation
- ✅ FEN notation support
- ✅ Move validation
- ✅ Check detection
- ✅ Perpetual check/chase detection
- ✅ TypeScript type definitions

## 📝 FEN Notation

FEN (Forsyth-Edwards Notation) format for Xiangqi:
```
rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1
```

Piece notation:
- Uppercase = Red pieces (R=Rook, N=Knight, B=Bishop, A=Advisor, K=King, C=Cannon, P=Pawn)
- Lowercase = Black pieces

## 🔒 License

MIT License - See LICENSE file for details

## 👨‍💻 Author

Created with ❤️ for Xiangqi enthusiasts

## 🐛 Issues

Report issues at: https://github.com/yourusername/sl-wukong-engine/issues
