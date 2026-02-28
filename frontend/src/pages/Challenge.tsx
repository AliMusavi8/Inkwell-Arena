import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { GiSwordClash } from 'react-icons/gi';
import { HiOutlineClock, HiOutlineX } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import {
    apiGetAllUsers,
    apiCreateChallenge,
    apiGetChallengeHistory,
    apiGetActiveChallenge,
    apiForfeitChallenge,
    apiGetUnderSiege,
    apiReleaseSiege,
    type UserData,
    type ChallengeData,
    type ConqueredAccountData,
} from '../api';
import TicTacToe from '../components/TicTacToe';
import ChickenRunner from '../components/ChickenRunner';
import StickFighter from '../components/StickFighter';
import './Challenge.css';

export default function Challenge() {
    const { user, refreshConquests, conqueredAccounts } = useAuth();
    const { lastMessage, sendMessage, onlineUserIds } = useWebSocket();
    const location = useLocation();
    const [users, setUsers] = useState<UserData[]>([]);
    const [history, setHistory] = useState<ChallengeData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeGame, setActiveGame] = useState<{
        challengeId: number;
        opponentId: number;
        opponentUsername: string;
        isChallenger: boolean;
        gameType: 'tictactoe' | 'chickenrunner' | 'stickfighter';
        cpuMode?: boolean;
    } | null>(null);

    // Waiting state for challenger
    const [waitingFor, setWaitingFor] = useState<{
        username: string;
        challengeId: number;
        gameType: 'tictactoe' | 'chickenrunner' | 'stickfighter';
    } | null>(null);

    // Existing active challenge from DB (for resume/forfeit)
    const [staleChallenge, setStaleChallenge] = useState<ChallengeData | null>(null);
    const [underSiege, setUnderSiege] = useState<ConqueredAccountData[]>([]);
    const [freedomMessage, setFreedomMessage] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [showPlayers, setShowPlayers] = useState(false);
    const [selectedGame, setSelectedGame] = useState<'tictactoe' | 'chickenrunner' | 'stickfighter' | null>(null);
    const [showPlayerListFor, setShowPlayerListFor] = useState<'tictactoe' | 'chickenrunner' | 'stickfighter' | null>(null);

    useEffect(() => {
        loadData();
        checkActiveChallenge();
    }, []);

    // Check if navigated here after accepting a challenge (defender side)
    useEffect(() => {
        const state = location.state as { acceptedChallenge?: { challengeId: number; opponentId: number; opponentUsername: string; gameType?: string } } | null;
        if (state?.acceptedChallenge) {
            setActiveGame({
                challengeId: state.acceptedChallenge.challengeId,
                opponentId: state.acceptedChallenge.opponentId,
                opponentUsername: state.acceptedChallenge.opponentUsername,
                isChallenger: false,
                gameType: (state.acceptedChallenge.gameType as 'tictactoe' | 'chickenrunner') || 'tictactoe',
            });
            window.history.replaceState({}, '');
        }
    }, [location.state]);

    // Listen for challenge accepted → start game (challenger side)
    useEffect(() => {
        if (!lastMessage) return;
        if (lastMessage.type === 'challenge_accepted') {
            setWaitingFor(null);
            setActiveGame({
                challengeId: lastMessage.challenge_id,
                opponentId: lastMessage.defender_id,
                opponentUsername: lastMessage.defender_username,
                isChallenger: true,
                gameType: (lastMessage.game_type as 'tictactoe' | 'chickenrunner') || 'tictactoe',
            });
        } else if (lastMessage.type === 'siege_released') {
            // Loser gets notified — show dramatic freedom message
            setFreedomMessage(lastMessage.winner_username || 'Your conqueror');
            loadData();
            refreshConquests();
            // Auto-dismiss after 5 seconds
            setTimeout(() => setFreedomMessage(null), 5000);
        }
    }, [lastMessage]);

    const loadData = async () => {
        try {
            const [u, h, siege] = await Promise.all([
                apiGetAllUsers(),
                apiGetChallengeHistory(),
                apiGetUnderSiege(),
            ]);
            setUsers(u);
            setHistory(h);
            setUnderSiege(siege);
        } catch { }
        setLoading(false);
    };

    const checkActiveChallenge = async () => {
        const active = await apiGetActiveChallenge();
        if (active) {
            setStaleChallenge(active);
        }
    };

    const handleChallenge = async (targetUser: UserData, gameType: 'tictactoe' | 'chickenrunner' | 'stickfighter') => {
        setShowPlayerListFor(null);
        try {
            const challenge = await apiCreateChallenge(targetUser.id);
            sendMessage({
                type: 'challenge_sent',
                defender_id: targetUser.id,
                challenge_id: challenge.id,
                game_type: gameType,
            });
            setWaitingFor({
                username: targetUser.display_name || targetUser.username,
                challengeId: challenge.id,
                gameType: gameType,
            });
        } catch (err: any) {
            alert(err.message || 'Failed to send challenge');
        }
    };

    const cancelWaiting = () => {
        setWaitingFor(null);
    };

    const handleResume = (challenge: ChallengeData) => {
        if (!user) return;
        const isChallenger = challenge.challenger_id === user.id;
        setActiveGame({
            challengeId: challenge.id,
            opponentId: isChallenger ? challenge.defender_id : challenge.challenger_id,
            opponentUsername: isChallenger ? challenge.defender_username : challenge.challenger_username,
            isChallenger,
            gameType: 'tictactoe', // default for legacy
        });
        setStaleChallenge(null);
    };

    const handleForfeit = async (challengeId: number) => {
        if (!confirm('Are you sure? You will lose and your opponent gets 10 minutes of access to your account.')) return;
        try {
            await apiForfeitChallenge(challengeId);
            setStaleChallenge(null);
            await refreshConquests();
            await loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to forfeit');
        }
    };

    const handleGameComplete = async (_winnerId: number | null) => {
        setActiveGame(null);
        setStaleChallenge(null);
        await refreshConquests();
        await loadData();
    };

    const handleRelease = async (acc: ConqueredAccountData) => {
        try {
            await apiReleaseSiege(acc.challenge_id);
            // Notify the loser via WebSocket
            sendMessage({
                type: 'siege_released',
                loser_id: acc.user_id,
                winner_username: user?.username,
            });
            await refreshConquests();
            await loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to release siege');
        }
    };

    if (loading) {
        return <div className="challenge-page animate-fade-in"><p>Loading...</p></div>;
    }

    return (
        <div className="challenge-page animate-fade-in">
            {/* Game Modal */}
            {activeGame && user && activeGame.gameType === 'chickenrunner' && (
                <ChickenRunner
                    challengeId={activeGame.challengeId}
                    currentUserId={user.id}
                    currentUsername={user.display_name || user.username}
                    opponentId={activeGame.opponentId}
                    opponentUsername={activeGame.opponentUsername}
                    isChallenger={activeGame.isChallenger}
                    onComplete={handleGameComplete}
                    cpuMode={activeGame.cpuMode}
                />
            )}
            {activeGame && user && activeGame.gameType === 'stickfighter' && (
                <StickFighter
                    challengeId={activeGame.challengeId}
                    currentUserId={user.id}
                    currentUsername={user.display_name || user.username}
                    opponentId={activeGame.opponentId}
                    opponentUsername={activeGame.opponentUsername}
                    isChallenger={activeGame.isChallenger}
                    onComplete={handleGameComplete}
                    cpuMode={activeGame.cpuMode}
                />
            )}
            {activeGame && user && activeGame.gameType !== 'chickenrunner' && activeGame.gameType !== 'stickfighter' && (
                <TicTacToe
                    challengeId={activeGame.challengeId}
                    currentUserId={user.id}
                    currentUsername={user.display_name || user.username}
                    opponentId={activeGame.opponentId}
                    opponentUsername={activeGame.opponentUsername}
                    isChallenger={activeGame.isChallenger}
                    onComplete={handleGameComplete}
                    cpuMode={activeGame.cpuMode}
                />
            )}

            {/* Active Challenge Banner (Resume/Forfeit) */}
            {staleChallenge && !activeGame && (
                <div className="card active-challenge-banner">
                    <div className="active-challenge-info">
                        <span className="active-challenge-icon">⚔️</span>
                        <div>
                            <h3>Active Game</h3>
                            <p>You have an ongoing game against <strong>@{staleChallenge.challenger_id === user?.id ? staleChallenge.defender_username : staleChallenge.challenger_username}</strong></p>
                        </div>
                    </div>
                    <div className="active-challenge-actions">
                        <button className="btn btn-primary" onClick={() => handleResume(staleChallenge)}>
                            ▶ Resume Game
                        </button>
                        <button className="btn waiting-cancel-btn" onClick={() => handleForfeit(staleChallenge.id)}>
                            🏳️ Forfeit
                        </button>
                    </div>
                </div>
            )}

            {/* Freedom Overlay — shown to loser when winner releases siege */}
            {freedomMessage && (
                <div className="freedom-overlay" onClick={() => setFreedomMessage(null)}>
                    <div className="freedom-content">
                        <div className="freedom-icon">🕊️</div>
                        <h2 className="freedom-title">You Have Been Freed!</h2>
                        <p className="freedom-subtitle">The siege has been lifted</p>
                        <p className="freedom-detail">
                            <strong>@{freedomMessage}</strong> has shown mercy and released control of your account.
                        </p>
                        <p className="freedom-tagline">Your kingdom stands once more.</p>
                        <button className="btn btn-primary freedom-dismiss" onClick={() => setFreedomMessage(null)}>
                            Reclaim My Throne
                        </button>
                    </div>
                </div>
            )}

            {/* Waiting Overlay */}
            {waitingFor && (
                <div className="waiting-overlay">
                    <div className="waiting-modal">
                        <div className="waiting-spinner" />
                        <h3>⚔️ Challenge Sent!</h3>
                        <p>
                            {waitingFor.gameType === 'chickenrunner' ? '🐔 Chicken Runner' : waitingFor.gameType === 'stickfighter' ? '⚔️ Stick Fighter' : '❌⭕ Tic Tac Toe'}
                            {' '}— Waiting for <strong>@{waitingFor.username}</strong> to accept...
                        </p>
                        <button className="btn waiting-cancel-btn" onClick={cancelWaiting}>
                            <HiOutlineX /> Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* ── Game Cards Grid ── */}
            <div className="games-grid">
                <div className="game-card-wrapper" onClick={() => setSelectedGame('tictactoe')}>
                    <div className="game-card">
                        <span className="game-card-emoji">❌⭕</span>
                    </div>
                    <span className="game-card-title">Tic Tac Toe</span>
                </div>
                <div className="game-card-wrapper" onClick={() => setSelectedGame('chickenrunner')}>
                    <div className="game-card">
                        <img src="/cover-images/Chicken Runner.png" alt="Chicken Runner" className="game-card-cover" />
                    </div>
                    <span className="game-card-title">Chicken Runner</span>
                </div>
                <div className="game-card-wrapper" onClick={() => setSelectedGame('stickfighter')}>
                    <div className="game-card">
                        <img src="/cover-images/Stickman Fighter.png" alt="Stick Fighter" className="game-card-cover" />
                    </div>
                    <span className="game-card-title">Stick Fighter</span>
                </div>
            </div>

            {/* ── Bottom Buttons ── */}
            <div className="challenge-bottom-bar">
                <button className="btn challenge-bottom-btn" onClick={() => setShowPlayers(true)}>
                    <GiSwordClash /> Players
                </button>
                <button className="btn challenge-bottom-btn" onClick={() => setShowHistory(true)}>
                    <HiOutlineClock /> Recent
                </button>
            </div>

            {/* ── Game Action Popup (Challenge / Practice) ── */}
            {selectedGame && (
                <div className="game-picker-overlay" onClick={() => setSelectedGame(null)}>
                    <div className="game-action-modal" onClick={e => e.stopPropagation()}>
                        <h3>{selectedGame === 'tictactoe' ? '❌⭕ Tic Tac Toe' : '🐔💨 Chicken Runner'}</h3>
                        <p>What would you like to do?</p>
                        <div className="game-action-options">
                            <button
                                className="game-action-btn challenge"
                                onClick={() => {
                                    const game = selectedGame;
                                    setSelectedGame(null);
                                    setShowPlayerListFor(game);
                                }}
                            >
                                <GiSwordClash className="game-action-icon" />
                                <span>Challenge a Player</span>
                            </button>
                            <button
                                className="game-action-btn practice"
                                onClick={() => {
                                    setActiveGame({
                                        challengeId: 0,
                                        opponentId: 0,
                                        opponentUsername: 'CPU',
                                        isChallenger: true,
                                        gameType: selectedGame,
                                        cpuMode: true,
                                    });
                                    setSelectedGame(null);
                                }}
                            >
                                <span className="game-action-icon">🤖</span>
                                <span>Practice vs CPU</span>
                            </button>
                        </div>
                        <button className="btn waiting-cancel-btn" style={{ marginTop: 12 }} onClick={() => setSelectedGame(null)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* ── Player List Popup ── */}
            {showPlayerListFor && (
                <div className="game-picker-overlay" onClick={() => setShowPlayerListFor(null)}>
                    <div className="history-modal" onClick={e => e.stopPropagation()}>
                        <div className="history-modal-header">
                            <h3>Choose an Opponent</h3>
                            <button className="history-modal-close" onClick={() => setShowPlayerListFor(null)}>
                                <HiOutlineX />
                            </button>
                        </div>
                        <div className="challenge-users-list">
                            {users.length === 0 ? (
                                <p className="challenge-empty">No other users yet. Invite your friends!</p>
                            ) : (
                                users.map((u) => {
                                    const isOnline = onlineUserIds.has(u.id);
                                    return (
                                        <div className="challenge-user-row" key={u.id}>
                                            <div className="challenge-user-left">
                                                <div className="challenge-user-avatar" style={{ background: u.avatar_color }}>
                                                    {(u.display_name || u.username).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                                </div>
                                                <div className="challenge-user-info">
                                                    <span className="challenge-user-name">{u.display_name || u.username}</span>
                                                    <span className="challenge-user-handle">@{u.username}</span>
                                                </div>
                                                <span className={`challenge-user-status ${isOnline ? 'online' : 'offline'}`}>
                                                    {isOnline ? '🟢 Online' : '⚫ Offline'}
                                                </span>
                                            </div>
                                            <button
                                                className="btn btn-primary challenge-btn"
                                                onClick={() => handleChallenge(u, showPlayerListFor)}
                                                disabled={!isOnline || !!waitingFor}
                                            >
                                                <GiSwordClash /> Challenge
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Players Popup ── */}
            {showPlayers && (
                <div className="game-picker-overlay" onClick={() => setShowPlayers(false)}>
                    <div className="history-modal" onClick={e => e.stopPropagation()}>
                        <div className="history-modal-header">
                            <h3>All Players</h3>
                            <button className="history-modal-close" onClick={() => setShowPlayers(false)}>
                                <HiOutlineX />
                            </button>
                        </div>
                        <div className="challenge-users-list">
                            {users.length === 0 ? (
                                <p className="challenge-empty">No other users yet.</p>
                            ) : (
                                users.map((u) => {
                                    const isOnline = onlineUserIds.has(u.id);
                                    return (
                                        <div className="challenge-user-row" key={u.id}>
                                            <div className="challenge-user-left">
                                                <div className="challenge-user-avatar" style={{ background: u.avatar_color }}>
                                                    {(u.display_name || u.username).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                                </div>
                                                <div className="challenge-user-info">
                                                    <span className="challenge-user-name">{u.display_name || u.username}</span>
                                                    <span className="challenge-user-handle">@{u.username}</span>
                                                </div>
                                                <span className={`challenge-user-status ${isOnline ? 'online' : 'offline'}`}>
                                                    {isOnline ? '🟢 Online' : '⚫ Offline'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── History Popup Modal ── */}
            {showHistory && (
                <div className="game-picker-overlay" onClick={() => setShowHistory(false)}>
                    <div className="history-modal" onClick={e => e.stopPropagation()}>
                        <div className="history-modal-header">
                            <h3>Recent Challenges</h3>
                            <button className="history-modal-close" onClick={() => setShowHistory(false)}>
                                <HiOutlineX />
                            </button>
                        </div>
                        <div className="history-list">
                            {history.length === 0 ? (
                                <p className="challenge-empty">No challenges yet.</p>
                            ) : (
                                history.map((c) => (
                                    <div className="history-item" key={c.id}>
                                        <div className="history-players">
                                            <span>@{c.challenger_username}</span>
                                            <span className="history-vs">vs</span>
                                            <span>@{c.defender_username}</span>
                                        </div>
                                        <div className="history-result">
                                            {c.status === 'completed' ? (
                                                c.winner_id ? (
                                                    <span className="history-winner">
                                                        🏆 @{c.winner_id === c.challenger_id ? c.challenger_username : c.defender_username} won
                                                    </span>
                                                ) : (
                                                    <span className="history-draw">🤝 Draw</span>
                                                )
                                            ) : (
                                                <span className="history-status">{c.status}</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const update = () => {
            const now = new Date();
            // Ensure UTC parsing — append Z if not already there
            const raw = expiresAt.endsWith('Z') || expiresAt.includes('+') ? expiresAt : expiresAt + 'Z';
            const expires = new Date(raw);
            const diff = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000));
            const min = Math.floor(diff / 60);
            const sec = diff % 60;
            setTimeLeft(`${min}:${sec.toString().padStart(2, '0')}`);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    return <span className="countdown">{timeLeft}</span>;
}

function CircularCountdown({ expiresAt, totalMinutes = 10, color = '#4F6AF6' }: {
    expiresAt: string;
    totalMinutes?: number;
    color?: string;
}) {
    const [progress, setProgress] = useState(1);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const totalSeconds = totalMinutes * 60;
        const update = () => {
            const now = new Date();
            const raw = expiresAt.endsWith('Z') || expiresAt.includes('+') ? expiresAt : expiresAt + 'Z';
            const expires = new Date(raw);
            const diff = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000));
            setProgress(diff / totalSeconds);
            const min = Math.floor(diff / 60);
            const sec = diff % 60;
            setTimeLeft(`${min}:${sec.toString().padStart(2, '0')}`);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [expiresAt, totalMinutes]);

    const size = 48;
    const stroke = 3.5;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress);

    return (
        <div className="circular-countdown" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={stroke}
                    opacity={0.12}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
            </svg>
            <span className="circular-countdown-text">{timeLeft}</span>
        </div>
    );
}
