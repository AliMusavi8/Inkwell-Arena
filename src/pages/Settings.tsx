import { useState } from 'react';
import {
    HiOutlineUser,
    HiOutlineBell,
    HiOutlineShieldCheck,
    HiOutlineLink,
} from 'react-icons/hi';
import './Settings.css';

export default function Settings() {
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [weeklyDigest, setWeeklyDigest] = useState(false);
    const [twoFactor, setTwoFactor] = useState(false);

    return (
        <div className="settings-page animate-fade-in">
            <div className="settings-header">
                <h1>Settings</h1>
                <p>Manage your profile and preferences</p>
            </div>

            {/* Profile Settings */}
            <div className="card settings-section">
                <div className="settings-section-header">
                    <div className="settings-section-icon">
                        <HiOutlineUser />
                    </div>
                    <h2>Profile</h2>
                </div>
                <div className="settings-form">
                    <div className="settings-row">
                        <div className="settings-field">
                            <label>Display Name</label>
                            <input type="text" className="settings-input" defaultValue="Ali Musavi" />
                        </div>
                        <div className="settings-field">
                            <label>Username</label>
                            <input type="text" className="settings-input" defaultValue="@alimusavi" />
                        </div>
                    </div>
                    <div className="settings-field">
                        <label>Bio</label>
                        <textarea
                            className="settings-textarea"
                            defaultValue="Writer, developer, and lifelong learner. I write about web development, design, and technology."
                        />
                        <span className="settings-field-hint">
                            Shown on your public profile. Max 160 characters.
                        </span>
                    </div>
                    <div className="settings-field">
                        <label>Email</label>
                        <input type="email" className="settings-input" defaultValue="ali@example.com" />
                    </div>
                </div>
            </div>

            {/* Social Links */}
            <div className="card settings-section">
                <div className="settings-section-header">
                    <div className="settings-section-icon">
                        <HiOutlineLink />
                    </div>
                    <h2>Social Links</h2>
                </div>
                <div className="settings-form">
                    <div className="settings-row">
                        <div className="settings-field">
                            <label>Website</label>
                            <input type="url" className="settings-input" placeholder="https://yoursite.com" />
                        </div>
                        <div className="settings-field">
                            <label>Twitter / X</label>
                            <input type="text" className="settings-input" placeholder="@username" />
                        </div>
                    </div>
                    <div className="settings-row">
                        <div className="settings-field">
                            <label>GitHub</label>
                            <input type="text" className="settings-input" placeholder="username" />
                        </div>
                        <div className="settings-field">
                            <label>LinkedIn</label>
                            <input type="url" className="settings-input" placeholder="https://linkedin.com/in/..." />
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Settings */}
            <div className="card settings-section">
                <div className="settings-section-header">
                    <div className="settings-section-icon">
                        <HiOutlineBell />
                    </div>
                    <h2>Notifications</h2>
                </div>
                <div className="settings-form">
                    <div className="settings-toggle-row">
                        <div className="settings-toggle-info">
                            <span className="settings-toggle-label">Email Notifications</span>
                            <span className="settings-toggle-desc">
                                Get notified when someone likes or comments on your posts
                            </span>
                        </div>
                        <button
                            className={`settings-toggle ${emailNotifications ? 'active' : ''}`}
                            onClick={() => setEmailNotifications(!emailNotifications)}
                        />
                    </div>
                    <div className="settings-toggle-row">
                        <div className="settings-toggle-info">
                            <span className="settings-toggle-label">Weekly Digest</span>
                            <span className="settings-toggle-desc">
                                Receive a weekly summary of your post performance
                            </span>
                        </div>
                        <button
                            className={`settings-toggle ${weeklyDigest ? 'active' : ''}`}
                            onClick={() => setWeeklyDigest(!weeklyDigest)}
                        />
                    </div>
                </div>
            </div>

            {/* Security Settings */}
            <div className="card settings-section">
                <div className="settings-section-header">
                    <div className="settings-section-icon">
                        <HiOutlineShieldCheck />
                    </div>
                    <h2>Security</h2>
                </div>
                <div className="settings-form">
                    <div className="settings-toggle-row">
                        <div className="settings-toggle-info">
                            <span className="settings-toggle-label">Two-Factor Authentication</span>
                            <span className="settings-toggle-desc">
                                Add an extra layer of security to your account
                            </span>
                        </div>
                        <button
                            className={`settings-toggle ${twoFactor ? 'active' : ''}`}
                            onClick={() => setTwoFactor(!twoFactor)}
                        />
                    </div>
                    <div className="settings-row">
                        <div className="settings-field">
                            <label>Password</label>
                            <input type="password" className="settings-input" defaultValue="••••••••••" />
                        </div>
                        <div className="settings-field">
                            <label>Confirm Password</label>
                            <input type="password" className="settings-input" placeholder="Confirm new password" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-footer">
                <button className="btn btn-outline">Cancel</button>
                <button className="btn btn-primary">Save Changes</button>
            </div>
        </div>
    );
}
