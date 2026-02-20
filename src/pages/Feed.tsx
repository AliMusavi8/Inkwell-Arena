import { useState, useEffect } from 'react';
import {
    HiOutlineHeart,
    HiHeart,
} from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { apiGetPosts, apiCreatePost, apiToggleLike, type PostData, type ConqueredAccountData } from '../api';
import './Feed.css';

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function Feed() {
    const { user, conqueredAccounts } = useAuth();
    const [posts, setPosts] = useState<PostData[]>([]);
    const [newPost, setNewPost] = useState('');
    const [postAsUserId, setPostAsUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            const data = await apiGetPosts();
            setPosts(data);
        } catch { }
        setLoading(false);
    };

    const handlePost = async () => {
        if (!newPost.trim() || posting) return;
        setPosting(true);
        try {
            const post = await apiCreatePost(newPost.trim(), postAsUserId || undefined);
            setPosts(prev => [post, ...prev]);
            setNewPost('');
            setPostAsUserId(null);
        } catch (err: any) {
            alert(err.message || 'Failed to post');
        }
        setPosting(false);
    };

    const handleLike = async (postId: number) => {
        try {
            const result = await apiToggleLike(postId);
            setPosts(prev => prev.map(p =>
                p.id === postId
                    ? { ...p, liked_by_me: result.liked, likes_count: result.likes_count }
                    : p
            ));
        } catch { }
    };

    const userInitials = user?.display_name
        ? user.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : user?.username?.slice(0, 2).toUpperCase() || '??';

    return (
        <div className="feed-page animate-fade-in">
            <div className="feed-header">
                <div>
                    <h1>Feed</h1>
                    <p>Share your thoughts with the world</p>
                </div>
            </div>

            {/* Compose Box */}
            <div className="card compose-box">
                <div className="compose-row">
                    <div className="compose-avatar" style={{ background: user?.avatar_color || '#4F6AF6' }}>
                        {userInitials}
                    </div>
                    <textarea
                        className="compose-input"
                        placeholder="What's on your mind?"
                        value={newPost}
                        onChange={e => setNewPost(e.target.value)}
                        maxLength={280}
                        rows={3}
                    />
                </div>
                <div className="compose-footer">
                    <div className="compose-footer-left">
                        <span className="compose-char-count">{newPost.length}/280</span>
                        {conqueredAccounts.length > 0 && (
                            <select
                                className="compose-as-select"
                                value={postAsUserId || ''}
                                onChange={e => setPostAsUserId(e.target.value ? Number(e.target.value) : null)}
                            >
                                <option value="">Post as yourself</option>
                                {conqueredAccounts.map((acc: ConqueredAccountData) => (
                                    <option key={acc.user_id} value={acc.user_id}>
                                        Post as @{acc.username} ⏱️ {getTimeLeft(acc.expires_at)}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <button
                        className="btn btn-primary compose-btn"
                        onClick={handlePost}
                        disabled={!newPost.trim() || posting}
                    >
                        {posting ? 'Posting...' : 'Post'}
                    </button>
                </div>
            </div>

            {/* Timeline */}
            <div className="feed-timeline">
                {loading ? (
                    <div className="feed-empty">Loading posts...</div>
                ) : posts.length === 0 ? (
                    <div className="feed-empty">No posts yet. Be the first to share something!</div>
                ) : (
                    posts.map((post) => (
                        <div className="card tweet-card" key={post.id}>
                            <div className="tweet-avatar" style={{ background: post.author_avatar_color }}>
                                {(post.author_display_name || post.author_username)
                                    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div className="tweet-content">
                                <div className="tweet-header">
                                    <span className="tweet-author">
                                        {post.author_display_name || post.author_username}
                                    </span>
                                    <span className="tweet-username">@{post.author_username}</span>
                                    <span className="tweet-dot">·</span>
                                    <span className="tweet-time">{timeAgo(post.created_at)}</span>
                                </div>
                                {post.posted_by_username && (
                                    <div className="tweet-via">
                                        ⚔️ posted via <strong>@{post.posted_by_username}</strong>
                                    </div>
                                )}
                                <div className="tweet-text">{post.text}</div>
                                <div className="tweet-actions">
                                    <button
                                        className={`tweet-action-btn ${post.liked_by_me ? 'liked' : ''}`}
                                        onClick={() => handleLike(post.id)}
                                    >
                                        {post.liked_by_me ? <HiHeart /> : <HiOutlineHeart />}
                                        <span>{post.likes_count}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function getTimeLeft(isoStr: string): string {
    const now = new Date();
    const expires = new Date(isoStr);
    const diff = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000));
    const min = Math.floor(diff / 60);
    const sec = diff % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
}
