import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { HiOutlineHome, HiOutlineCog, HiOutlineLogout } from 'react-icons/hi';
import { GiSwordClash } from 'react-icons/gi';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { apiAcceptChallenge, apiDeclineChallenge } from '../api';
import inkwellLogo from '../assets/inkwell-logo.png';
import './TopBar.css';

interface PendingChallenge {
    challenge_id: number;
    challenger_id: number;
    challenger_username: string;
    game_type: 'tictactoe' | 'chickenrunner' | 'stickfighter';
}

export default function TopBar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { status, user, logout } = useAuth();
    const { lastMessage, sendMessage, isConnected } = useWebSocket();

    const [pendingChallenges, setPendingChallenges] = useState<PendingChallenge[]>([]);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Listen for incoming challenges via WebSocket
    useEffect(() => {
        if (!lastMessage) return;
        if (lastMessage.type === 'challenge_received') {
            setPendingChallenges(prev => [...prev, {
                challenge_id: lastMessage.challenge_id,
                challenger_id: lastMessage.challenger_id,
                challenger_username: lastMessage.challenger_username,
                game_type: (lastMessage.game_type as 'tictactoe' | 'chickenrunner' | 'stickfighter') || 'tictactoe',
            }]);
        }
    }, [lastMessage]);

    const handleAccept = async (challenge: PendingChallenge) => {
        try {
            await apiAcceptChallenge(challenge.challenge_id);
            setPendingChallenges(prev => prev.filter(c => c.challenge_id !== challenge.challenge_id));
            sendMessage({
                type: 'challenge_accepted',
                challenger_id: challenge.challenger_id,
                challenge_id: challenge.challenge_id,
                game_type: challenge.game_type,
            });
            navigate('/challenge', {
                state: {
                    acceptedChallenge: {
                        challengeId: challenge.challenge_id,
                        opponentId: challenge.challenger_id,
                        opponentUsername: challenge.challenger_username,
                        gameType: challenge.game_type,
                    },
                },
            });
        } catch { }
    };

    const handleDecline = async (challengeId: number) => {
        try {
            await apiDeclineChallenge(challengeId);
            setPendingChallenges(prev => prev.filter(c => c.challenge_id !== challengeId));
        } catch { }
    };

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const initials = user?.display_name
        ? user.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : user?.username?.slice(0, 2).toUpperCase() || '??';

    return (
        <>
            <nav className="topbar">
                {/* Logo */}
                <NavLink to="/" className="topbar-brand">
                    <img src={inkwellLogo} alt="Inkwell Arena" className="topbar-logo" />
                    <span className="topbar-brand-name">Inkwell Arena</span>
                </NavLink>

                {/* Nav Links */}
                <div className="topbar-links">
                    <NavLink
                        to="/"
                        end
                        className={`topbar-link ${isActive('/') ? 'active' : ''}`}
                    >
                        <HiOutlineHome className="topbar-link-icon" />
                        <span>Feed</span>
                    </NavLink>
                    <NavLink
                        to="/challenge"
                        className={`topbar-link ${isActive('/challenge') ? 'active' : ''}`}
                    >
                        <GiSwordClash className="topbar-link-icon" />
                        <span>Challenge</span>
                    </NavLink>
                </div>

                {/* Right Side */}
                <div className="topbar-right" ref={menuRef}>
                    {status === 'authenticated' && user ? (
                        <>
                            {/* Connection indicator */}
                            <span className={`topbar-status-dot ${isConnected ? 'online' : 'offline'}`} />

                            {/* Avatar Button */}
                            <button
                                className="topbar-avatar-btn"
                                onClick={() => setShowUserMenu(!showUserMenu)}
                            >
                                <div
                                    className="topbar-avatar"
                                    style={{ background: user.avatar_color || 'var(--color-primary-mid)' }}
                                >
                                    {initials}
                                </div>
                            </button>

                            {/* Dropdown Menu */}
                            {showUserMenu && (
                                <div className="topbar-menu">
                                    <div className="topbar-menu-user">
                                        <div
                                            className="topbar-menu-avatar"
                                            style={{ background: user.avatar_color || 'var(--color-primary-mid)' }}
                                        >
                                            {initials}
                                        </div>
                                        <div className="topbar-menu-user-info">
                                            <span className="topbar-menu-name">{user.display_name || user.username}</span>
                                            <span className="topbar-menu-username">@{user.username}</span>
                                        </div>
                                    </div>
                                    <div className="topbar-menu-divider" />
                                    <NavLink
                                        to="/settings"
                                        className="topbar-menu-item"
                                        onClick={() => setShowUserMenu(false)}
                                    >
                                        <HiOutlineCog />
                                        <span>Settings</span>
                                    </NavLink>
                                    <button className="topbar-menu-item logout" onClick={logout}>
                                        <HiOutlineLogout />
                                        <span>Log Out</span>
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <span className="topbar-guest-label">Guest</span>
                    )}
                </div>
            </nav>

            {/* Challenge toast notifications (appear below the bar) */}
            {pendingChallenges.length > 0 && (
                <div className="topbar-challenge-toasts">
                    {pendingChallenges.map(c => (
                        <div key={c.challenge_id} className="topbar-challenge-toast">
                            <div className="toast-text">
                                <strong>{c.challenger_username}</strong> challenged you to{' '}
                                {c.game_type === 'chickenrunner' ? '🐔 Chicken Runner' : c.game_type === 'stickfighter' ? '⚔️ Stick Fighter' : '❌⭕ Tic Tac Toe'}!
                            </div>
                            <div className="toast-actions">
                                <button className="toast-accept" onClick={() => handleAccept(c)}>Accept</button>
                                <button className="toast-decline" onClick={() => handleDecline(c.challenge_id)}>Decline</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
