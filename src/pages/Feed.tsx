import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    HiOutlineHeart,
    HiOutlineChatAlt,
    HiOutlineClock,
    HiOutlinePencilAlt,
} from 'react-icons/hi';
import './Feed.css';

interface Post {
    id: number;
    title: string;
    excerpt: string;
    category: string;
    author: { name: string; initials: string; color: string };
    date: string;
    readTime: string;
    likes: number;
    comments: number;
    coverGradient: string;
}

const posts: Post[] = [
    {
        id: 1,
        title: 'Building Scalable Web Applications with Modern Frameworks',
        excerpt: 'Explore the best practices and architectural patterns that help you build web apps that scale gracefully under heavy traffic.',
        category: 'Technology',
        author: { name: 'Ali Musavi', initials: 'AM', color: '#6B8E4E' },
        date: 'Feb 17, 2026',
        readTime: '8 min',
        likes: 124,
        comments: 18,
        coverGradient: 'linear-gradient(135deg, #3A5A40, #6B8E4E)',
    },
    {
        id: 2,
        title: 'The Art of Minimalist Design in Digital Products',
        excerpt: 'Less is more. Learn how reducing visual noise can dramatically improve user experience and engagement with your product.',
        category: 'Design',
        author: { name: 'Sara Chen', initials: 'SC', color: '#E8871E' },
        date: 'Feb 16, 2026',
        readTime: '5 min',
        likes: 89,
        comments: 7,
        coverGradient: 'linear-gradient(135deg, #E8871E, #D47A18)',
    },
    {
        id: 3,
        title: 'Understanding Async/Await in JavaScript: A Deep Dive',
        excerpt: 'Asynchronous programming doesn\'t have to be confusing. This guide breaks down async/await with practical examples and gotchas.',
        category: 'Technology',
        author: { name: 'David Park', initials: 'DP', color: '#3A5A40' },
        date: 'Feb 15, 2026',
        readTime: '12 min',
        likes: 203,
        comments: 31,
        coverGradient: 'linear-gradient(135deg, #2D4535, #3A5A40)',
    },
    {
        id: 4,
        title: 'Remote Work: How to Stay Productive and Healthy',
        excerpt: 'Working from home is the new normal. Here are proven strategies to maintain peak productivity while taking care of your wellbeing.',
        category: 'Lifestyle',
        author: { name: 'Emma Wilson', initials: 'EW', color: '#8CB369' },
        date: 'Feb 14, 2026',
        readTime: '6 min',
        likes: 156,
        comments: 22,
        coverGradient: 'linear-gradient(135deg, #8CB369, #6B8E4E)',
    },
    {
        id: 5,
        title: 'A Beginner\'s Guide to Machine Learning Concepts',
        excerpt: 'Machine learning is transforming every industry. Get started with the fundamental concepts you need to know before diving into code.',
        category: 'Technology',
        author: { name: 'Michael Torres', initials: 'MT', color: '#E8871E' },
        date: 'Feb 13, 2026',
        readTime: '10 min',
        likes: 178,
        comments: 14,
        coverGradient: 'linear-gradient(135deg, #DDD5B8, #C4B996)',
    },
    {
        id: 6,
        title: 'Color Theory for Developers: Choosing the Right Palette',
        excerpt: 'Colors evoke emotions and guide user actions. Learn color theory fundamentals that every developer should understand.',
        category: 'Design',
        author: { name: 'Lisa Huang', initials: 'LH', color: '#3A5A40' },
        date: 'Feb 12, 2026',
        readTime: '7 min',
        likes: 95,
        comments: 11,
        coverGradient: 'linear-gradient(135deg, #6B8E4E, #8CB369)',
    },
];

const categories = ['All', 'Technology', 'Design', 'Lifestyle', 'Business'];

export default function Feed() {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState('All');

    const filteredPosts = activeCategory === 'All'
        ? posts
        : posts.filter(p => p.category === activeCategory);

    return (
        <div className="feed-page animate-fade-in">
            <div className="feed-header">
                <div>
                    <h1>Explore Articles ✨</h1>
                    <p>Discover stories, ideas, and insights from our community</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/write')}>
                    <HiOutlinePencilAlt /> Write Post
                </button>
            </div>

            <div className="feed-categories">
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`feed-category-tab ${activeCategory === cat ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="feed-grid">
                {filteredPosts.map((post, i) => (
                    <div
                        className="card feed-post-card"
                        key={post.id}
                        style={{ animationDelay: `${i * 80}ms` }}
                        onClick={() => navigate(`/post/${post.id}`)}
                    >
                        <div className="feed-post-cover">
                            <div
                                className="feed-post-cover-gradient"
                                style={{ background: post.coverGradient }}
                            />
                            <span className="feed-post-category-badge">{post.category}</span>
                        </div>
                        <div className="feed-post-body">
                            <div className="feed-post-title">{post.title}</div>
                            <div className="feed-post-excerpt">{post.excerpt}</div>
                            <div className="feed-post-meta">
                                <div className="feed-post-author">
                                    <div
                                        className="feed-post-author-avatar"
                                        style={{ background: post.author.color }}
                                    >
                                        {post.author.initials}
                                    </div>
                                    <div className="feed-post-author-info">
                                        <span className="feed-post-author-name">{post.author.name}</span>
                                        <span className="feed-post-author-date">
                                            {post.date} · <HiOutlineClock style={{ display: 'inline', verticalAlign: 'middle', fontSize: '0.72rem' }} /> {post.readTime}
                                        </span>
                                    </div>
                                </div>
                                <div className="feed-post-stats">
                                    <span className="feed-post-stat">
                                        <HiOutlineHeart /> {post.likes}
                                    </span>
                                    <span className="feed-post-stat">
                                        <HiOutlineChatAlt /> {post.comments}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
