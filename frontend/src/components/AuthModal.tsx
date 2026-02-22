import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HiOutlineEye, HiOutlineX } from 'react-icons/hi';

import inkwellLogo from '../assets/inkwell-logo.png';
import './AuthModal.css';

interface AuthModalProps {
    onGuestMode?: () => void;
    onClose?: () => void;
}

export default function AuthModal({ onGuestMode, onClose }: AuthModalProps) {
    const { login, register } = useAuth();
    const [tab, setTab] = useState<'login' | 'signup'>('signup');
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (tab === 'signup') {
                await register(username.trim(), email, password, name.trim() || undefined);
            } else {
                await login(email, password);
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-overlay">
            <div className="auth-modal">
                <div className="auth-modal-header">
                    {onClose && (
                        <button className="auth-close-btn" onClick={onClose} aria-label="Close">
                            <HiOutlineX />
                        </button>
                    )}
                    <div className="auth-brand-icon">
                        <img src={inkwellLogo} alt="Inkwell" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} />
                    </div>
                    <h2>Welcome to Inkwell</h2>
                    <p>Share your thoughts with the world</p>
                </div>

                <div className="auth-modal-body">
                    <div className="auth-tabs">
                        <button
                            className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
                            onClick={() => { setTab('signup'); setError(''); }}
                        >
                            Sign Up
                        </button>
                        <button
                            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
                            onClick={() => { setTab('login'); setError(''); }}
                        >
                            Log In
                        </button>
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <form className="auth-form" onSubmit={handleSubmit}>
                        {tab === 'signup' && (
                            <>
                                <div className="auth-field">
                                    <label>Username</label>
                                    <input
                                        type="text"
                                        className="auth-input"
                                        placeholder="johndoe"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        required
                                        minLength={3}
                                    />
                                </div>
                                <div className="auth-field">
                                    <label>Display Name</label>
                                    <input
                                        type="text"
                                        className="auth-input"
                                        placeholder="John Doe"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>
                            </>
                        )}
                        <div className="auth-field">
                            <label>Email</label>
                            <input
                                type="email"
                                className="auth-input"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="auth-field">
                            <label>Password</label>
                            <input
                                type="password"
                                className="auth-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? 'Please wait...' : tab === 'signup' ? 'Create Account' : 'Log In'}
                        </button>
                    </form>

                    {onGuestMode && (
                        <div className="auth-guest-wrapper">
                            <div className="auth-divider">
                                <span>or</span>
                            </div>
                            <button className="auth-guest-btn" onClick={onGuestMode}>
                                <HiOutlineEye /> Take a tour
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
