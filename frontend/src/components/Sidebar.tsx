import { NavLink, useLocation } from 'react-router-dom';
import {
    HiOutlineHome,
    HiOutlineCog,
    HiOutlineLogout,
} from 'react-icons/hi';
import { GiSwordClash } from 'react-icons/gi';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import inkwellLogo from '../assets/inkwell-logo.png';
import './Sidebar.css';

const navItems = [
    {
        section: 'Menu',
        links: [
            { to: '/', icon: <HiOutlineHome />, label: 'Feed' },
            { to: '/challenge', icon: <GiSwordClash />, label: 'Challenge' },
        ],
    },
    {
        section: 'Account',
        links: [
            { to: '/settings', icon: <HiOutlineCog />, label: 'Settings' },
        ],
    },
];

export default function Sidebar() {
    const location = useLocation();
    const { status, user, logout } = useAuth();
    const { isConnected } = useWebSocket();

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const initials = user?.display_name
        ? user.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : user?.username?.slice(0, 2).toUpperCase() || '??';

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-brand-icon">
                    <img src={inkwellLogo} alt="Inkwell" className="sidebar-brand-logo" />
                </div>
                <div className="sidebar-brand-text">
                    <span className="sidebar-brand-name">Inkwell</span>
                    <span className="sidebar-brand-tagline">Write & Share</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((section) => (
                    <div key={section.section}>
                        <div className="sidebar-section-label">{section.section}</div>
                        {section.links.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={`sidebar-link ${isActive(link.to) ? 'active' : ''}`}
                                end={link.to === '/'}
                            >
                                <span className="sidebar-link-icon">{link.icon}</span>
                                <span>{link.label}</span>
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                {status === 'authenticated' && user ? (
                    <div className="sidebar-user">
                        <div className="sidebar-avatar" style={{ background: user.avatar_color }}>
                            {initials}
                        </div>
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-name">{user.display_name || user.username}</span>
                            <span className="sidebar-user-role">
                                {isConnected ? '🟢 Online' : '⚫ Offline'}
                            </span>
                        </div>
                        <button
                            className="sidebar-logout-btn"
                            onClick={logout}
                            title="Log out"
                        >
                            <HiOutlineLogout />
                        </button>
                    </div>
                ) : (
                    <div className="sidebar-guest-cta">
                        <span className="sidebar-guest-text">Sign in to start posting</span>
                    </div>
                )}
            </div>
        </aside>
    );
}
