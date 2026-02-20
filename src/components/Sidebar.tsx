import { NavLink, useLocation } from 'react-router-dom';
import {
    HiOutlineHome,
    HiOutlinePencilAlt,
    HiOutlineCollection,
    HiOutlineChartBar,
    HiOutlineCog,
    HiOutlineLockClosed,
} from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import inkwellLogo from '../assets/inkwell-logo.png';
import './Sidebar.css';

const navItems = [
    {
        section: 'Browse',
        links: [
            { to: '/', icon: <HiOutlineHome />, label: 'Feed', guestAllowed: true },
            { to: '/write', icon: <HiOutlinePencilAlt />, label: 'Write', guestAllowed: false },
        ],
    },
    {
        section: 'Your Content',
        links: [
            { to: '/my-posts', icon: <HiOutlineCollection />, label: 'My Posts', badge: 8, guestAllowed: false },
            { to: '/analytics', icon: <HiOutlineChartBar />, label: 'Analytics', guestAllowed: false },
        ],
    },
    {
        section: 'Account',
        links: [
            { to: '/settings', icon: <HiOutlineCog />, label: 'Settings', guestAllowed: false },
        ],
    },
];

export default function Sidebar() {
    const location = useLocation();
    const { status } = useAuth();
    const isGuest = status === 'guest';

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const handleClick = (e: React.MouseEvent, link: typeof navItems[0]['links'][0]) => {
        if (isGuest && !link.guestAllowed) {
            e.preventDefault();
            // Do nothing — guest can't navigate, route guard handles redirect anyway
        }
    };

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
                        {section.links.map((link) => {
                            const locked = isGuest && !link.guestAllowed;
                            return (
                                <NavLink
                                    key={link.to}
                                    to={locked ? '#' : link.to}
                                    className={`sidebar-link ${isActive(link.to) ? 'active' : ''} ${locked ? 'locked' : ''}`}
                                    end={link.to === '/'}
                                    onClick={(e) => handleClick(e, link)}
                                >
                                    <span className="sidebar-link-icon">{link.icon}</span>
                                    <span>{link.label}</span>
                                    {locked && (
                                        <HiOutlineLockClosed className="sidebar-link-lock" />
                                    )}
                                    {!locked && link.badge && (
                                        <span className="sidebar-link-badge">{link.badge}</span>
                                    )}
                                </NavLink>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                {isGuest ? (
                    <div className="sidebar-guest-cta">
                        <span className="sidebar-guest-text">Sign up to unlock all features</span>
                        <button className="sidebar-guest-btn" onClick={() => window.location.reload()}>
                            Sign Up
                        </button>
                    </div>
                ) : (
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">AM</div>
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-name">Ali Musavi</span>
                            <span className="sidebar-user-role">Writer</span>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
