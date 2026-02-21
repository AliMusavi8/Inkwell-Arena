import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HiOutlineClock } from 'react-icons/hi';
import type { ConqueredAccountData } from '../api';
import './Settings.css';

export default function Settings() {
    const { user, conqueredAccounts, logout } = useAuth();
    const [displayName, setDisplayName] = useState(user?.display_name || '');
    const [bio, setBio] = useState(user?.bio || '');

    return (
        <div className="settings-page animate-fade-in">
            <div className="settings-header">
                <h1>Settings</h1>
                <p>Manage your account</p>
            </div>

            <div className="card settings-section">
                <h3>Profile</h3>
                <div className="settings-form">
                    <div className="settings-field">
                        <label>Display Name</label>
                        <input
                            type="text"
                            className="settings-input"
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            placeholder="Your display name"
                        />
                    </div>
                    <div className="settings-field">
                        <label>Bio</label>
                        <textarea
                            className="settings-input"
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            placeholder="Tell people about yourself"
                            rows={3}
                        />
                    </div>
                    <button className="btn btn-primary settings-save-btn">
                        Save Changes
                    </button>
                </div>
            </div>

            {conqueredAccounts.length > 0 && (
                <div className="card settings-section">
                    <h3>🏆 Active Conquests</h3>
                    <p className="settings-section-desc">Accounts you've won access to via challenges</p>
                    <div className="conquest-list-settings">
                        {conqueredAccounts.map((acc: ConqueredAccountData) => (
                            <div key={acc.user_id} className="conquest-row">
                                <div className="conquest-avatar-sm" style={{ background: acc.avatar_color }}>
                                    {(acc.display_name || acc.username).slice(0, 2).toUpperCase()}
                                </div>
                                <span className="conquest-name-sm">@{acc.username}</span>
                                <span className="conquest-timer-sm">
                                    <HiOutlineClock /> Expires in 10 min
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="card settings-section">
                <h3>Account</h3>
                <p className="settings-section-desc">Manage your account</p>
                <button className="btn settings-logout-btn" onClick={logout}>
                    Log Out
                </button>
            </div>
        </div>
    );
}
