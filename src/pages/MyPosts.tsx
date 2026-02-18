import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    HiOutlinePencilAlt,
    HiOutlineEye,
    HiOutlineHeart,
    HiOutlineChatAlt,
    HiOutlineTrash,
    HiOutlinePencil,
    HiOutlineDocumentText,
    HiOutlineGlobeAlt,
    HiOutlineCollection,
} from 'react-icons/hi';
import './MyPosts.css';

type PostStatus = 'published' | 'draft';

interface MyPost {
    id: number;
    title: string;
    category: string;
    status: PostStatus;
    views: number;
    likes: number;
    comments: number;
    date: string;
}

const myPosts: MyPost[] = [
    { id: 1, title: 'Building Scalable Web Applications with Modern Frameworks', category: 'Technology', status: 'published', views: 1243, likes: 124, comments: 18, date: 'Feb 17' },
    { id: 3, title: 'Understanding Async/Await in JavaScript: A Deep Dive', category: 'Technology', status: 'published', views: 2105, likes: 203, comments: 31, date: 'Feb 15' },
    { id: 7, title: 'Getting Started with TypeScript in 2026', category: 'Technology', status: 'draft', views: 0, likes: 0, comments: 0, date: 'Feb 14' },
    { id: 8, title: 'CSS Grid vs Flexbox: When to Use Which', category: 'Design', status: 'published', views: 876, likes: 67, comments: 9, date: 'Feb 12' },
    { id: 9, title: 'The Future of AI-Assisted Coding', category: 'Technology', status: 'draft', views: 0, likes: 0, comments: 0, date: 'Feb 11' },
    { id: 10, title: 'Building a REST API with Node.js and Express', category: 'Technology', status: 'published', views: 1532, likes: 145, comments: 23, date: 'Feb 9' },
    { id: 11, title: 'React Performance Optimization Tips', category: 'Technology', status: 'published', views: 989, likes: 88, comments: 12, date: 'Feb 7' },
    { id: 12, title: 'An Introduction to Docker for Beginners', category: 'Technology', status: 'draft', views: 0, likes: 0, comments: 0, date: 'Feb 5' },
];

export default function MyPosts() {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

    const filteredPosts = filter === 'all' ? myPosts : myPosts.filter(p => p.status === filter);
    const totalViews = myPosts.reduce((sum, p) => sum + p.views, 0);
    const totalLikes = myPosts.reduce((sum, p) => sum + p.likes, 0);
    const publishedCount = myPosts.filter(p => p.status === 'published').length;

    return (
        <div className="myposts-page animate-fade-in">
            <div className="myposts-header">
                <div className="myposts-header-left">
                    <h1>My Posts</h1>
                    <p>Manage and track your published articles</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/write')}>
                    <HiOutlinePencilAlt /> New Post
                </button>
            </div>

            <div className="myposts-summary">
                <div className="card myposts-summary-card">
                    <div className="myposts-summary-icon green"><HiOutlineDocumentText /></div>
                    <div className="myposts-summary-info">
                        <span className="myposts-summary-value">{myPosts.length}</span>
                        <span className="myposts-summary-label">Total Posts</span>
                    </div>
                </div>
                <div className="card myposts-summary-card">
                    <div className="myposts-summary-icon dark"><HiOutlineGlobeAlt /></div>
                    <div className="myposts-summary-info">
                        <span className="myposts-summary-value">{publishedCount}</span>
                        <span className="myposts-summary-label">Published</span>
                    </div>
                </div>
                <div className="card myposts-summary-card">
                    <div className="myposts-summary-icon orange"><HiOutlineEye /></div>
                    <div className="myposts-summary-info">
                        <span className="myposts-summary-value">{totalViews.toLocaleString()}</span>
                        <span className="myposts-summary-label">Total Views</span>
                    </div>
                </div>
                <div className="card myposts-summary-card">
                    <div className="myposts-summary-icon cream"><HiOutlineHeart /></div>
                    <div className="myposts-summary-info">
                        <span className="myposts-summary-value">{totalLikes}</span>
                        <span className="myposts-summary-label">Total Likes</span>
                    </div>
                </div>
            </div>

            <div className="myposts-filters">
                <div className="myposts-filter-tabs">
                    {(['all', 'published', 'draft'] as const).map((f) => (
                        <button
                            key={f}
                            className={`myposts-filter-tab ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card myposts-table-wrapper">
                <table className="myposts-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Views</th>
                            <th>Likes</th>
                            <th>Comments</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPosts.map((post) => (
                            <tr key={post.id}>
                                <td>
                                    <div className="myposts-title-cell">
                                        <span>{post.title}</span>
                                        <small>{post.category}</small>
                                    </div>
                                </td>
                                <td>
                                    <span className={`badge badge-${post.status}`}>
                                        {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                                    </span>
                                </td>
                                <td>
                                    <div className="myposts-stat-cell">
                                        <HiOutlineEye /> {post.views.toLocaleString()}
                                    </div>
                                </td>
                                <td>
                                    <div className="myposts-stat-cell">
                                        <HiOutlineHeart /> {post.likes}
                                    </div>
                                </td>
                                <td>
                                    <div className="myposts-stat-cell">
                                        <HiOutlineChatAlt /> {post.comments}
                                    </div>
                                </td>
                                <td>{post.date}</td>
                                <td>
                                    <div className="myposts-actions">
                                        <button
                                            className="myposts-action-btn"
                                            title="Edit"
                                            onClick={() => navigate(`/write/${post.id}`)}
                                        >
                                            <HiOutlinePencil />
                                        </button>
                                        <button className="myposts-action-btn" title="View">
                                            <HiOutlineEye />
                                        </button>
                                        <button className="myposts-action-btn delete" title="Delete">
                                            <HiOutlineTrash />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
