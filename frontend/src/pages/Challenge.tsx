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
    } | null>(null);

    // Waiting state for challenger
    const [waitingFor, setWaitingFor] = useState<{
        username: string;
        challengeId: number;
    } | null>(null);

    // Existing active challenge from DB (for resume/forfeit)
    const [staleChallenge, setStaleChallenge] = useState<ChallengeData | null>(null);
    const [underSiege, setUnderSiege] = useState<ConqueredAccountData[]>([]);
    const [freedomMessage, setFreedomMessage] = useState<string | null>(null);

    useEffect(() => {
        loadData();
        checkActiveChallenge();
    }, []);

    // Check if navigated here after accepting a challenge (defender side)
    useEffect(() => {
        const state = location.state as { acceptedChallenge?: { challengeId: number; opponentId: number; opponentUsername: string } } | null;
        if (state?.acceptedChallenge) {
            setActiveGame({
                challengeId: state.acceptedChallenge.challengeId,
                opponentId: state.acceptedChallenge.opponentId,
                opponentUsername: state.acceptedChallenge.opponentUsername,
                isChallenger: false, // defender
            });
            // Clear the state so it doesn't re-trigger on navigation
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

    const handleChallenge = async (targetUser: UserData) => {
        try {
            const challenge = await apiCreateChallenge(targetUser.id);
            // Notify opponent via WebSocket
            sendMessage({
                type: 'challenge_sent',
                defender_id: targetUser.id,
                challenge_id: challenge.id,
            });
            // Show waiting overlay instead of alert
            setWaitingFor({
                username: targetUser.display_name || targetUser.username,
                challengeId: challenge.id,
            });
        } catch (err: any) {
            // Only use alert for actual errors
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
            {/* TicTacToe Game Modal */}
            {activeGame && user && (
                <TicTacToe
                    challengeId={activeGame.challengeId}
                    currentUserId={user.id}
                    currentUsername={user.display_name || user.username}
                    opponentId={activeGame.opponentId}
                    opponentUsername={activeGame.opponentUsername}
                    isChallenger={activeGame.isChallenger}
                    onComplete={handleGameComplete}
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
                        <p>Waiting for <strong>@{waitingFor.username}</strong> to accept...</p>
                        <button className="btn waiting-cancel-btn" onClick={cancelWaiting}>
                            <HiOutlineX /> Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="challenge-header">
                <div>
                    <h1>Challenge Arena ⚔️</h1>
                    <p>Challenge other users to Tic Tac Toe. Win and post on their account for 10 minutes!</p>
                </div>
            </div>

            {/* Active Conquests */}
            {conqueredAccounts.length > 0 && (
                <div className="card challenge-conquests">
                    <h3>🏆 Active Conquests</h3>
                    <div className="conquest-list">
                        {conqueredAccounts.map((acc: ConqueredAccountData) => (
                            <div key={acc.user_id} className="conquest-item">
                                <CircularCountdown expiresAt={acc.expires_at} totalMinutes={10} />
                                <div className="conquest-info">
                                    <span className="conquest-name">@{acc.username}</span>
                                    <span className="conquest-timer">
                                        <HiOutlineClock /> Expires: <CountdownTimer expiresAt={acc.expires_at} />
                                    </span>
                                </div>
                                <button
                                    className="btn release-btn"
                                    onClick={() => handleRelease(acc)}
                                    title="End siege early"
                                >
                                    🏳️ Release
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Under Siege - someone has access to YOUR account */}
            {underSiege.length > 0 && (
                <div className="card challenge-under-siege">
                    <h3>⚠️ Under Siege</h3>
                    <p className="siege-desc">These users can post on your account!</p>
                    <div className="conquest-list">
                        {underSiege.map((acc: ConqueredAccountData) => (
                            <div key={acc.user_id} className="conquest-item siege-item">
                                <CircularCountdown expiresAt={acc.expires_at} totalMinutes={10} color="#E74C6F" />
                                <div className="conquest-info">
                                    <span className="conquest-name">@{acc.username}</span>
                                    <span className="conquest-timer siege-timer">
                                        <HiOutlineClock /> Access ends in: <CountdownTimer expiresAt={acc.expires_at} />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Online Users */}
            <div className="card challenge-users-section">
                <h3>Users</h3>
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
                                        onClick={() => handleChallenge(u)}
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

            {/* Challenge History */}
            {history.length > 0 && (
                <div className="card challenge-history">
                    <h3>Recent Challenges</h3>
                    <div className="history-list">
                        {history.map((c) => (
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
                        ))}
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
