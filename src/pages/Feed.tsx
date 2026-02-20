import { useState, useEffect } from 'react';
import {
    HiOutlineHeart,
    HiHeart,
    HiOutlineClock,
} from 'react-icons/hi';
import { GiSwordClash } from 'react-icons/gi';
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

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const update = () => {
            const now = new Date();
            const expires = new Date(expiresAt);
            const diff = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000));
            const min = Math.floor(diff / 60);
            const sec = diff % 60;
            setTimeLeft(`${min}:${sec.toString().padStart(2, '0')}`);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    return <span className="countdown">{timeLeft}</span>;
}

export default function Feed() {
    const { user, conqueredAccounts } = useAuth();
    const [posts, setPosts] = useState<PostData[]>([]);
    const [newPost, setNewPost] = useState('');
    const [postAsUserId, setPostAsUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);

    const selectedConquest = conqueredAccounts.find(a => a.user_id === postAsUserId) || null;

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

            {/* Conquered Accounts Banner */}
            {conqueredAccounts.length > 0 && (
                <div className="conquest-banner">
                    <div className="conquest-banner-header">
                        <GiSwordClash className="conquest-banner-icon" />
                        <span>You have conquered accounts!</span>
                    </div>
                    <div className="conquest-banner-accounts">
                        {conqueredAccounts.map((acc: ConqueredAccountData) => (
                            <button
                                key={acc.user_id}
                                className={`conquest-chip ${postAsUserId === acc.user_id ? 'active' : ''}`}
                                onClick={() => setPostAsUserId(postAsUserId === acc.user_id ? null : acc.user_id)}
                            >
                                <div className="conquest-chip-avatar" style={{ background: acc.avatar_color }}>
                                    {(acc.display_name || acc.username).slice(0, 2).toUpperCase()}
                                </div>
                                <span className="conquest-chip-name">@{acc.username}</span>
                                <span className="conquest-chip-timer">
                                    <HiOutlineClock />
                                    <CountdownTimer expiresAt={acc.expires_at} />
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Compose Box */}
            <div className={`card compose-box ${selectedConquest ? 'compose-as-other' : ''}`}>
                {/* "Posting as" indicator */}
                {selectedConquest && (
                    <div className="compose-as-banner">
                        <GiSwordClash />
                        <span>Posting as <strong>@{selectedConquest.username}</strong></span>
                        <span className="compose-as-timer">
                            <HiOutlineClock /> <CountdownTimer expiresAt={selectedConquest.expires_at} />
                        </span>
                        <button className="compose-as-cancel" onClick={() => setPostAsUserId(null)}>
                            ✕ Cancel
                        </button>
                    </div>
                )}
                <div className="compose-row">
                    <div
                        className="compose-avatar"
                        style={{ background: selectedConquest?.avatar_color || user?.avatar_color || '#4F6AF6' }}
                    >
                        {selectedConquest
                            ? (selectedConquest.display_name || selectedConquest.username).slice(0, 2).toUpperCase()
                            : userInitials}
                    </div>
                    <textarea
                        className="compose-input"
                        placeholder={
                            selectedConquest
                                ? `Write something as @${selectedConquest.username}...`
                                : "What's on your mind?"
                        }
                        value={newPost}
                        onChange={e => setNewPost(e.target.value)}
                        maxLength={280}
                        rows={3}
                    />
                </div>
                <div className="compose-footer">
                    <span className="compose-char-count">{newPost.length}/280</span>
                    <button
                        className={`btn compose-btn ${selectedConquest ? 'compose-btn-conquest' : 'btn-primary'}`}
                        onClick={handlePost}
                        disabled={!newPost.trim() || posting}
                    >
                        {posting ? 'Posting...' : selectedConquest ? `⚔️ Post as @${selectedConquest.username}` : 'Post'}
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
                        <div className={`card tweet-card ${post.posted_by_username ? 'tweet-conquered' : ''}`} key={post.id}>
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
                                        <GiSwordClash /> conquered by <strong>@{post.posted_by_username}</strong>
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
