import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    HiOutlineArrowLeft,
    HiOutlineHeart,
    HiHeart,
    HiOutlineChatAlt,
    HiOutlineShare,
    HiOutlineBookmark,
    HiOutlineClock,
} from 'react-icons/hi';
import './PostDetail.css';

// Mock post data — in a real app this would come from an API
const postsData: Record<string, {
    title: string;
    category: string;
    author: { name: string; initials: string; color: string };
    date: string;
    readTime: string;
    likes: number;
    comments: number;
    tags: string[];
    coverGradient: string;
    content: string;
}> = {
    '1': {
        title: 'Building Scalable Web Applications with Modern Frameworks',
        category: 'Technology',
        author: { name: 'Ali Musavi', initials: 'AM', color: '#6B8E4E' },
        date: 'February 17, 2026',
        readTime: '8 min read',
        likes: 124,
        comments: 18,
        tags: ['JavaScript', 'React', 'Architecture', 'Web Dev'],
        coverGradient: 'linear-gradient(135deg, #3A5A40, #6B8E4E)',
        content: `<p>Building web applications that can handle thousands — or even millions — of users requires careful planning and the right architectural decisions from day one.</p>

<h2>Choosing the Right Framework</h2>
<p>The framework you choose sets the foundation for your entire application. React, Vue, and Angular each have their strengths, but the key is understanding your team's expertise and the specific requirements of your project.</p>

<blockquote>The best framework is the one your team can maintain and scale effectively over time.</blockquote>

<h2>Component Architecture</h2>
<p>A well-structured component hierarchy is crucial for maintainability. Follow these principles:</p>
<ul>
<li>Keep components small and focused on a single responsibility</li>
<li>Use composition over inheritance whenever possible</li>
<li>Separate presentational components from container components</li>
<li>Create reusable design system components early</li>
</ul>

<h2>State Management</h2>
<p>As your application grows, state management becomes increasingly important. Consider using context for simple cases and dedicated state management libraries for complex applications with lots of shared state.</p>

<h3>Local vs Global State</h3>
<p>Not every piece of state needs to be global. Keep state as close to where it's used as possible. Only lift state up when multiple components need access to the same data.</p>

<h2>Performance Optimization</h2>
<p>Performance should be considered from the start, not as an afterthought. Use code splitting with <code>React.lazy()</code> and <code>Suspense</code> to reduce initial bundle size. Implement virtualization for long lists and memoize expensive computations.</p>

<p>By following these practices, you'll build applications that not only work well today but can scale gracefully as your user base grows.</p>`,
    },
    '2': {
        title: 'The Art of Minimalist Design in Digital Products',
        category: 'Design',
        author: { name: 'Sara Chen', initials: 'SC', color: '#E8871E' },
        date: 'February 16, 2026',
        readTime: '5 min read',
        likes: 89,
        comments: 7,
        tags: ['Design', 'UI/UX', 'Minimalism'],
        coverGradient: 'linear-gradient(135deg, #E8871E, #D47A18)',
        content: `<p>In a world full of noise, minimalist design cuts through the clutter and delivers clarity to your users.</p>

<h2>Less is More</h2>
<p>Every element on your page should earn its place. If something doesn't serve a clear purpose — whether functional or aesthetic — consider removing it entirely.</p>

<blockquote>Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away. — Antoine de Saint-Exupéry</blockquote>

<h2>The Power of Whitespace</h2>
<p>Whitespace isn't empty space — it's a powerful design tool. It guides the eye, creates hierarchy, and gives your content room to breathe.</p>

<p>Embracing minimalism doesn't mean your designs should be boring. It means every choice is intentional and every pixel serves a purpose.</p>`,
    },
};

export default function PostDetail() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [liked, setLiked] = useState(false);

    const post = postsData[id || '1'] || postsData['1'];
    const likeCount = liked ? post.likes + 1 : post.likes;

    return (
        <div className="post-detail animate-fade-in">
            <button className="post-detail-back" onClick={() => navigate('/')}>
                <HiOutlineArrowLeft /> Back to Feed
            </button>

            <div className="post-detail-cover">
                <div
                    className="post-detail-cover-gradient"
                    style={{ background: post.coverGradient }}
                />
            </div>

            <div className="post-detail-info">
                <span className="post-detail-category">{post.category}</span>
                <h1 className="post-detail-title">{post.title}</h1>

                <div className="post-detail-meta">
                    <div className="post-detail-author">
                        <div
                            className="post-detail-author-avatar"
                            style={{ background: post.author.color }}
                        >
                            {post.author.initials}
                        </div>
                        <div className="post-detail-author-info">
                            <span className="post-detail-author-name">{post.author.name}</span>
                            <span className="post-detail-author-date">{post.date}</span>
                        </div>
                    </div>
                    <span className="post-detail-read-time">
                        <HiOutlineClock /> {post.readTime}
                    </span>
                </div>

                <div className="post-detail-tags">
                    {post.tags.map(tag => (
                        <span key={tag} className="post-detail-tag">{tag}</span>
                    ))}
                </div>
            </div>

            <div className="card post-detail-content">
                <div
                    className="post-detail-body"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />
            </div>

            <div className="post-detail-actions">
                <div className="post-detail-actions-left">
                    <button
                        className={`post-detail-action-btn ${liked ? 'liked' : ''}`}
                        onClick={() => setLiked(!liked)}
                    >
                        {liked ? <HiHeart /> : <HiOutlineHeart />} {likeCount}
                    </button>
                    <button className="post-detail-action-btn">
                        <HiOutlineChatAlt /> {post.comments}
                    </button>
                </div>
                <div className="post-detail-actions-left">
                    <button className="post-detail-action-btn">
                        <HiOutlineBookmark /> Save
                    </button>
                    <button className="post-detail-action-btn">
                        <HiOutlineShare /> Share
                    </button>
                </div>
            </div>
        </div>
    );
}
