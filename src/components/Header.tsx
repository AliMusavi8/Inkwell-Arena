import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    HiOutlineSearch,
    HiOutlineBell,
    HiOutlineMoon,
    HiOutlineSun,
    HiOutlineDocumentText,
    HiOutlinePhotograph,
    HiOutlineCog,
} from 'react-icons/hi';
import './Header.css';

const routeNames: Record<string, string> = {
    '/': 'Feed',
    '/write': 'Write',
    '/my-posts': 'My Posts',
    '/analytics': 'Analytics',
    '/settings': 'Settings',
};

interface Notification {
    id: number;
    text: React.ReactNode;
    time: string;
    icon: React.ReactNode;
    iconColor: string;
    unread: boolean;
}

const initialNotifications: Notification[] = [
    {
        id: 1,
        text: <><strong>Sara Chen</strong> liked your post "Building Scalable Web Apps"</>,
        time: '2 minutes ago',
        icon: <HiOutlineDocumentText />,
        iconColor: 'green',
        unread: true,
    },
    {
        id: 2,
        text: <><strong>David Park</strong> commented on your article</>,
        time: '1 hour ago',
        icon: <HiOutlinePhotograph />,
        iconColor: 'orange',
        unread: true,
    },
    {
        id: 3,
        text: <>Your post <strong>"Async/Await Deep Dive"</strong> reached 2,000 views!</>,
        time: '3 hours ago',
        icon: <HiOutlineDocumentText />,
        iconColor: 'green',
        unread: true,
    },
    {
        id: 4,
        text: <><strong>Emma Wilson</strong> started following you</>,
        time: '5 hours ago',
        icon: <HiOutlineCog />,
        iconColor: 'dark',
        unread: false,
    },
    {
        id: 5,
        text: <>Draft <strong>"Getting Started with TypeScript"</strong> auto-saved</>,
        time: 'Yesterday',
        icon: <HiOutlineDocumentText />,
        iconColor: 'green',
        unread: false,
    },
];

export default function Header() {
    const location = useLocation();
    const currentRoute = routeNames[location.pathname] || 'Page Editor';

    const [darkMode, setDarkMode] = useState(() => {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    });
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState(initialNotifications);

    const unreadCount = notifications.filter(n => n.unread).length;

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    };

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
                        placeholder="Search pages, media..."
                    />
                </div>
            </div>

            <div className="header-right">
                {/* Dark Mode Toggle */}
                <button
                    className={`header-icon-btn ${darkMode ? 'theme-active' : ''}`}
                    title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    onClick={() => setDarkMode(!darkMode)}
                >
                    {darkMode ? <HiOutlineSun /> : <HiOutlineMoon />}
                </button>

                {/* Notifications */}
                <div className="header-notifications-wrapper">
                    <button
                        className="header-icon-btn"
                        title="Notifications"
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <HiOutlineBell />
                        {unreadCount > 0 && <span className="header-notification-dot" />}
                    </button>

                    {showNotifications && (
                        <>
                            <div className="notifications-overlay" onClick={() => setShowNotifications(false)} />
                            <div className="notifications-dropdown">
                                <div className="notifications-header">
                                    <h3>Notifications {unreadCount > 0 && `(${unreadCount})`}</h3>
                                    {unreadCount > 0 && (
                                        <button onClick={handleMarkAllRead}>Mark all read</button>
                                    )}
                                </div>
                                <div className="notifications-list">
                                    {notifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={`notification-item ${notif.unread ? 'unread' : ''}`}
                                        >
                                            <div className={`notification-icon ${notif.iconColor}`}>
                                                {notif.icon}
                                            </div>
                                            <div className="notification-content">
                                                <div className="notification-text">{notif.text}</div>
                                                <div className="notification-time">{notif.time}</div>
                                            </div>
                                            {notif.unread && <div className="notification-unread-dot" />}
                                        </div>
                                    ))}
                                </div>
                                <div className="notifications-footer">
                                    <button onClick={() => setShowNotifications(false)}>
                                        View all notifications
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="header-divider" />
                <button className="header-user-btn">
                    <div className="header-user-avatar">AM</div>
                </button>
            </div>
        </header>
    );
}
