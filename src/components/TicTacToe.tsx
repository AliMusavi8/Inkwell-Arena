import { useState, useEffect, useCallback } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import { useWebSocket } from '../context/WebSocketContext';
import { apiCompleteChallenge } from '../api';
import './TicTacToe.css';

type CellValue = 'X' | 'O' | null;

const WINNING_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6],            // diags
];

interface TicTacToeProps {
    challengeId: number;
    currentUserId: number;
    currentUsername: string;
    opponentId: number;
    opponentUsername: string;
    isChallenger: boolean; // true = X (goes first)
    onComplete: (winnerId: number | null) => void;
}

export default function TicTacToe({
    challengeId,
    currentUserId,
    currentUsername,
    opponentId,
    opponentUsername,
    isChallenger,
    onComplete,
}: TicTacToeProps) {
    const { sendMessage, lastMessage } = useWebSocket();
    const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState(true);
    const [winner, setWinner] = useState<CellValue>(null);
    const [winLine, setWinLine] = useState<number[] | null>(null);
    const [isDraw, setIsDraw] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    const mySymbol: CellValue = isChallenger ? 'X' : 'O';
    const isMyTurn = (mySymbol === 'X' && isXNext) || (mySymbol === 'O' && !isXNext);

    // Check for winner
    const checkWinner = useCallback((newBoard: CellValue[]) => {
        for (const [a, b, c] of WINNING_LINES) {
            if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
                return { winner: newBoard[a], line: [a, b, c] };
            }
        }
        if (newBoard.every(cell => cell !== null)) {
            return { winner: null, line: null }; // draw
        }
        return null; // game continues
    }, []);

    // Listen for opponent moves via WebSocket
    useEffect(() => {
        if (!lastMessage || lastMessage.type !== 'game_move') return;
        if (lastMessage.challenge_id !== challengeId) return;
        if (lastMessage.from_user_id !== opponentId) return;

        const pos = lastMessage.position;
        setBoard(prev => {
            const newBoard = [...prev];
            if (newBoard[pos] !== null) return prev;
            newBoard[pos] = mySymbol === 'X' ? 'O' : 'X';

            const result = checkWinner(newBoard);
            if (result) {
                setWinner(result.winner);
                setWinLine(result.line);
                if (!result.winner) setIsDraw(true);
                setGameOver(true);
            }

            return newBoard;
        });
        setIsXNext(prev => !prev);
    }, [lastMessage, challengeId, opponentId, mySymbol, checkWinner]);

    // Handle cell click
    const handleClick = (index: number) => {
        if (gameOver || !isMyTurn || board[index] !== null) return;

        const newBoard = [...board];
        newBoard[index] = mySymbol;
        setBoard(newBoard);
        setIsXNext(!isXNext);

        // Send move via WebSocket
        sendMessage({
            type: 'game_move',
            opponent_id: opponentId,
            position: index,
            challenge_id: challengeId,
        });

        const result = checkWinner(newBoard);
        if (result) {
            setWinner(result.winner);
            setWinLine(result.line);
            if (!result.winner) setIsDraw(true);
            setGameOver(true);
        }
    };

    // Complete game via API when game is over
    useEffect(() => {
        if (!gameOver) return;

        let winnerId = 0;
        if (winner === 'X') {
            winnerId = isChallenger ? currentUserId : opponentId;
        } else if (winner === 'O') {
            winnerId = isChallenger ? opponentId : currentUserId;
        }

        apiCompleteChallenge(challengeId, winnerId).catch(() => { });

        // Notify opponent
        sendMessage({
            type: 'game_over',
            opponent_id: opponentId,
            winner_id: winnerId || null,
            challenge_id: challengeId,
        });
    }, [gameOver]);

    const handleClose = () => {
        const winnerId = winner === 'X'
            ? (isChallenger ? currentUserId : opponentId)
            : winner === 'O'
                ? (isChallenger ? opponentId : currentUserId)
                : null;
        onComplete(winnerId);
    };

    const isWinCell = (index: number) => winLine?.includes(index);

    const getResultText = () => {
        if (isDraw) return '🤝 It\'s a Draw!';
        if (!winner) return '';
        const winnerIsMe = (winner === 'X' && isChallenger) || (winner === 'O' && !isChallenger);
        if (winnerIsMe) {
            return `🎉 You Won! You have 10 minutes of access to @${opponentUsername}'s account!`;
        }
        return `😔 You Lost! @${opponentUsername} now has 10 minutes of access to your account.`;
    };

    return (
        <div className="ttt-overlay">
            <div className="ttt-modal">
                <button className="ttt-close" onClick={handleClose}><HiOutlineX /></button>

                <div className="ttt-header">
                    <h2>⚔️ Tic Tac Toe</h2>
                    <div className="ttt-players">
                        <div className={`ttt-player ${isXNext && !gameOver ? 'active' : ''}`}>
                            <span className="ttt-player-symbol x">X</span>
                            <span className="ttt-player-name">{isChallenger ? currentUsername : opponentUsername}</span>
                        </div>
                        <span className="ttt-vs">VS</span>
                        <div className={`ttt-player ${!isXNext && !gameOver ? 'active' : ''}`}>
                            <span className="ttt-player-symbol o">O</span>
                            <span className="ttt-player-name">{isChallenger ? opponentUsername : currentUsername}</span>
                        </div>
                    </div>
                </div>

                {!gameOver && (
                    <div className="ttt-status">
                        {isMyTurn ? 'Your turn!' : `Waiting for @${opponentUsername}...`}
                    </div>
                )}

                <div className="ttt-board">
                    {board.map((cell, i) => (
                        <button
                            key={i}
                            className={`ttt-cell ${cell ? 'filled' : ''} ${cell === 'X' ? 'x' : ''} ${cell === 'O' ? 'o' : ''} ${isWinCell(i) ? 'win' : ''} ${isMyTurn && !cell && !gameOver ? 'clickable' : ''}`}
                            onClick={() => handleClick(i)}
                            disabled={gameOver || !isMyTurn || !!cell}
                        >
                            {cell}
                        </button>
                    ))}
                </div>

                {gameOver && (
                    <div className="ttt-result">
                        <div className="ttt-result-text">{getResultText()}</div>
                        <button className="btn btn-primary ttt-done-btn" onClick={handleClose}>
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
