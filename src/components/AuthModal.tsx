import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RiLeafLine } from 'react-icons/ri';
import { HiOutlineEye } from 'react-icons/hi';
import './AuthModal.css';

export default function AuthModal() {
    const { setStatus, setUserName } = useAuth();
    const [tab, setTab] = useState<'login' | 'signup'>('signup');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (tab === 'signup' && name.trim()) {
            setUserName(name.trim());
        } else {
            setUserName(email.split('@')[0] || 'User');
        }
        setStatus('authenticated');
    };

    return (
        <div className="auth-overlay">
            <div className="auth-modal">
                <div className="auth-modal-header">
                    <div className="auth-brand-icon">
                        <RiLeafLine />
                    </div>
                    <h2>Welcome to GreenLeaf</h2>
                    <p>Share your ideas with the world</p>
                </div>

                <div className="auth-modal-body">
                    <div className="auth-tabs">
                        <button
                            className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
                            onClick={() => setTab('signup')}
                        >
                            Sign Up
                        </button>
                        <button
                            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
                            onClick={() => setTab('login')}
                        >
                            Log In
                        </button>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        {tab === 'signup' && (
                            <div className="auth-field">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    className="auth-input"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                />
                            </div>
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
                        <button type="submit" className="auth-submit-btn">
                            {tab === 'signup' ? 'Create Account' : 'Log In'}
                        </button>
                    </form>

                    <div className="auth-divider">
                        <span>or</span>
                    </div>

                    <button className="auth-guest-btn" onClick={() => setStatus('guest')}>
                        <HiOutlineEye /> Continue as Guest
                    </button>
                </div>
            </div>
        </div>
    );
}
