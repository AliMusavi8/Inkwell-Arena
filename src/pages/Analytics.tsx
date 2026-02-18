import {
    HiOutlineEye,
    HiOutlineHeart,
    HiOutlineChatAlt,
    HiOutlineUserGroup,
    HiArrowSmUp,
} from 'react-icons/hi';
import './Analytics.css';

const stats = [
    { label: 'Total Views', value: '6,745', change: '+12%', icon: <HiOutlineEye /> },
    { label: 'Total Likes', value: '627', change: '+8%', icon: <HiOutlineHeart /> },
    { label: 'Comments', value: '93', change: '+15%', icon: <HiOutlineChatAlt /> },
    { label: 'Followers', value: '284', change: '+5%', icon: <HiOutlineUserGroup /> },
];

const weeklyViews = [
    { day: 'Mon', views: 420 },
    { day: 'Tue', views: 680 },
    { day: 'Wed', views: 530 },
    { day: 'Thu', views: 890 },
    { day: 'Fri', views: 1120 },
    { day: 'Sat', views: 760 },
    { day: 'Sun', views: 540 },
];

const topPosts = [
    { title: 'Understanding Async/Await in JavaScript', views: 2105 },
    { title: 'Building a REST API with Node.js', views: 1532 },
    { title: 'Building Scalable Web Applications', views: 1243 },
    { title: 'React Performance Optimization', views: 989 },
    { title: 'CSS Grid vs Flexbox', views: 876 },
];

const rankColors = ['gold', 'silver', 'bronze', 'other', 'other'];

export default function Analytics() {
    const maxViews = Math.max(...weeklyViews.map(d => d.views));

    return (
        <div className="analytics-page animate-fade-in">
            <div className="analytics-header">
                <h1>Analytics</h1>
                <p>Track how your content is performing</p>
            </div>

            <div className="analytics-stats">
                {stats.map((stat, i) => (
                    <div className="card analytics-stat-card" key={i}>
                        <div className="analytics-stat-icon">{stat.icon}</div>
                        <div className="analytics-stat-value">{stat.value}</div>
                        <div className="analytics-stat-label">{stat.label}</div>
                        <span className="analytics-stat-change up">
                            <HiArrowSmUp /> {stat.change}
                        </span>
                    </div>
                ))}
            </div>

            <div className="analytics-grid">
                <div className="card analytics-chart-card">
                    <h3>Views — Last 7 Days</h3>
                    <div className="analytics-bar-chart">
                        {weeklyViews.map((day, i) => (
                            <div className="analytics-bar-wrapper" key={i}>
                                <span className="analytics-bar-value">{day.views}</span>
                                <div
                                    className="analytics-bar"
                                    style={{
                                        height: `${(day.views / maxViews) * 100}%`,
                                        background: i === 4
                                            ? 'linear-gradient(to top, var(--color-accent-orange), #F0A050)'
                                            : 'linear-gradient(to top, var(--color-primary-dark), var(--color-primary-mid))',
                                    }}
                                />
                                <span className="analytics-bar-label">{day.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card analytics-top-card">
                    <h3>Top Performing Posts</h3>
                    <div className="analytics-top-list">
                        {topPosts.map((post, i) => (
                            <div className="analytics-top-item" key={i}>
                                <div className={`analytics-top-rank ${rankColors[i]}`}>{i + 1}</div>
                                <div className="analytics-top-info">
                                    <div className="analytics-top-title">{post.title}</div>
                                    <div className="analytics-top-views">{post.views.toLocaleString()} views</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
