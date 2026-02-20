import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    HiOutlineSearch,
    HiOutlineBell,
    HiOutlineMoon,
    HiOutlineSun,
} from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { apiAcceptChallenge, apiDeclineChallenge } from '../api';
import './Header.css';

const routeNames: Record<string, string> = {
    '/': 'Feed',
    '/challenge': 'Challenge',
    '/settings': 'Settings',
};

interface PendingChallenge {
    challenge_id: number;
    challenger_id: number;
    challenger_username: string;
}

export default function Header() {
    const location = useLocation();
    const navigate = useNavigate();
    const currentRoute = routeNames[location.pathname] || 'Feed';
    const { user } = useAuth();
    const { lastMessage, sendMessage } = useWebSocket();

    const [darkMode, setDarkMode] = useState(() => {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    });
    const [pendingChallenges, setPendingChallenges] = useState<PendingChallenge[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    // Listen for incoming challenges via WebSocket
    useEffect(() => {
        if (!lastMessage) return;
        if (lastMessage.type === 'challenge_received') {
            setPendingChallenges(prev => [...prev, {
                challenge_id: lastMessage.challenge_id,
                challenger_id: lastMessage.challenger_id,
                challenger_username: lastMessage.challenger_username,
            }]);
            setShowNotifications(true);
        }
    }, [lastMessage]);

    const handleAccept = async (challenge: PendingChallenge) => {
        try {
            await apiAcceptChallenge(challenge.challenge_id);
            setPendingChallenges(prev => prev.filter(c => c.challenge_id !== challenge.challenge_id));
            setShowNotifications(false);

            // Notify the challenger via WebSocket that we accepted
            sendMessage({
                type: 'challenge_accepted',
                challenger_id: challenge.challenger_id,
                challenge_id: challenge.challenge_id,
            });

            // Navigate to Challenge page and start the game (defender side)
            navigate('/challenge', {
                state: {
                    acceptedChallenge: {
                        challengeId: challenge.challenge_id,
                        opponentId: challenge.challenger_id,
                        opponentUsername: challenge.challenger_username,
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

    const initials = user?.display_name
        ? user.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : user?.username?.slice(0, 2).toUpperCase() || '??';

    return (
        <header className="header">
            <div className="header-left">
                <div className="header-breadcrumb">
                    <span>Inkwell</span>
                    <span className="header-breadcrumb-separator">/</span>
                    <span className="header-breadcrumb-current">{currentRoute}</span>
                </div>

                <div className="header-search">
                    <HiOutlineSearch className="header-search-icon" />
                    <input
                        type="text"
                        className="header-search-input"
                        placeholder="Search posts..."
                    />
                </div>
            </div>

            <div className="header-right">
                <button
                    className={`header-icon-btn ${darkMode ? 'theme-active' : ''}`}
                    title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    onClick={() => setDarkMode(!darkMode)}
                >
                    {darkMode ? <HiOutlineSun /> : <HiOutlineMoon />}
                </button>

                <div className="header-notifications-wrapper">
                    <button
                        className="header-icon-btn"
                        title="Notifications"
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <HiOutlineBell />
                        {pendingChallenges.length > 0 && <span className="header-notification-dot" />}
                    </button>

                    {showNotifications && (
                        <>
                            <div className="notifications-overlay" onClick={() => setShowNotifications(false)} />
                            <div className="notifications-dropdown">
                                <div className="notifications-header">
                                    <h3>Challenges {pendingChallenges.length > 0 && `(${pendingChallenges.length})`}</h3>
                                </div>
                                <div className="notifications-list">
                                    {pendingChallenges.length === 0 ? (
                                        <div className="notification-empty">No pending challenges</div>
                                    ) : (
                                        pendingChallenges.map((c) => (
                                            <div key={c.challenge_id} className="notification-item unread">
                                                <div className="notification-content">
                                                    <div className="notification-text">
                                                        <strong>{c.challenger_username}</strong> challenged you to Tic Tac Toe! ⚔️
                                                    </div>
                                                    <div className="notification-actions">
                                                        <button
                                                            className="notif-accept-btn"
                                                            onClick={() => handleAccept(c)}
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            className="notif-decline-btn"
                                                            onClick={() => handleDecline(c.challenge_id)}
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="header-divider" />
                <button className="header-user-btn">
                    <div className="header-user-avatar" style={{ background: user?.avatar_color || 'var(--color-primary-mid)' }}>
                        {initials}
                    </div>
                </button>
            </div>
        </header>
    );
}
