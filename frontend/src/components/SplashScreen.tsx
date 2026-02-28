import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import './SplashScreen.css';

type Phase = 'arriving' | 'gate-closed' | 'auth' | 'opening' | 'done';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
    const { status } = useAuth();
    const [phase, setPhase] = useState<Phase>('arriving');

    // Phase 1 → 2: Gate arrives and closes (2s)
    useEffect(() => {
        const t1 = setTimeout(() => setPhase('gate-closed'), 2000);
        return () => { clearTimeout(t1); };
    }, []);

    // When user authenticates → open the gate
    const handleAuthenticated = useCallback(() => {
        // Play the deep gate/stone sound effect
        const audio = new Audio('/sounds/large-underwater-explosion.mp3');
        audio.volume = 0.6;
        audio.play().catch(e => console.error("Audio playback failed:", e));

        setPhase('opening');
        setTimeout(() => {
            setPhase('done');
            onComplete();
        }, 1800);
    }, [onComplete]);

    // Watch for auth status change
    useEffect(() => {
        if (status === 'authenticated' && (phase === 'auth' || phase === 'gate-closed')) {
            handleAuthenticated();
        }
    }, [status, phase, handleAuthenticated]);

    const handleGuestMode = () => {
        handleAuthenticated();
    };

    const handleEnterPress = () => {
        setPhase('auth');
    };

    if (phase === 'done') return null;

    return (
        <div className={`splash-screen splash-${phase}`}>
            {/* Deep ocean background */}
            <div className="splash-ocean">
                {/* Light rays from surface */}
                <div className="splash-rays">
                    <div className="ray ray-1" />
                    <div className="ray ray-2" />
                    <div className="ray ray-3" />
                    <div className="ray ray-4" />
                    <div className="ray ray-5" />
                </div>

                {/* Floating bubbles */}
                <div className="splash-bubbles">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="bubble"
                            style={{
                                left: `${5 + Math.random() * 90}%`,
                                animationDelay: `${Math.random() * 6}s`,
                                animationDuration: `${4 + Math.random() * 4}s`,
                                width: `${3 + Math.random() * 8}px`,
                                height: `${3 + Math.random() * 8}px`,
                            }}
                        />
                    ))}
                </div>

                {/* Floating particles (plankton) */}
                <div className="splash-particles">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div
                            key={i}
                            className="particle"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 5}s`,
                                animationDuration: `${3 + Math.random() * 4}s`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* The Gate */}
            <div className="splash-gate-container">
                {/* Left gate half */}
                <div className="gate-half gate-left">
                    <svg width="100%" height="100%" className="gate-svg" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="stoneL" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#1a2530" />
                                <stop offset="50%" stopColor="#14202b" />
                                <stop offset="100%" stopColor="#0d1822" />
                            </linearGradient>
                            <linearGradient id="glowL" x1="1" y1="0" x2="0" y2="0">
                                <stop offset="0%" stopColor="#00B4D8" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#00B4D8" stopOpacity="0" />
                            </linearGradient>
                            <filter id="parietal-texture-L" x="0%" y="0%" width="100%" height="100%">
                                <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="4" result="noise" />
                                <feColorMatrix type="matrix" values="1 0 0 0 0   0 0.8 0 0 0   0 0 0.6 0 0  0 0 0 0.3 0" in="noise" result="coloredNoise" />
                                <feBlend mode="multiply" in="SourceGraphic" in2="coloredNoise" />
                            </filter>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Main stone panel with rock texture */}
                        <rect x="0" y="0" width="100%" height="100%" fill="url(#stoneL)" filter="url(#parietal-texture-L)" />

                        {/* Glowing edge (the crack between gates) */}
                        <rect x="calc(100% - 4px)" y="0" width="4" height="100%" fill="url(#glowL)" filter="url(#glow)" />
                    </svg>

                    {/* CSS Elements positioned on Left Gate */}
                    <div className="gate-runes-left">
                        <div className="rune-diamond" style={{ top: '35%', right: '15%' }} />
                        <div className="rune-diamond" style={{ top: '65%', right: '15%' }} />
                    </div>

                    {/* Left Full Concentric Circle */}
                    <div className="gate-circle-full">
                        <div className="circle-ring circle-outer parietal-ink" />
                        <div className="circle-ring circle-mid parietal-ink" />
                        <div className="circle-ring circle-inner parietal-ink" />
                    </div>

                    {/* Left rivets */}
                    <div className="gate-rivets-left">
                        {[10, 30, 50, 70, 90].map((top, i) => (
                            <div key={`l-${i}`} className="rivet parietal-ink" style={{ top: `${top}%`, left: 'calc(100% - 25px)' }} />
                        ))}
                    </div>
                </div>

                {/* Right gate half */}
                <div className="gate-half gate-right">
                    <svg width="100%" height="100%" className="gate-svg" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="stoneR" x1="1" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#1a2530" />
                                <stop offset="50%" stopColor="#14202b" />
                                <stop offset="100%" stopColor="#0d1822" />
                            </linearGradient>
                            <linearGradient id="glowR" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#00B4D8" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#00B4D8" stopOpacity="0" />
                            </linearGradient>
                            <filter id="parietal-texture-R" x="0%" y="0%" width="100%" height="100%">
                                <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="4" result="noise" />
                                <feColorMatrix type="matrix" values="1 0 0 0 0   0 0.8 0 0 0   0 0 0.6 0 0  0 0 0 0.3 0" in="noise" result="coloredNoise" />
                                <feBlend mode="multiply" in="SourceGraphic" in2="coloredNoise" />
                            </filter>
                        </defs>

                        {/* Main stone panel with rock texture */}
                        <rect x="0" y="0" width="100%" height="100%" fill="url(#stoneR)" filter="url(#parietal-texture-R)" />

                        <rect x="0" y="0" width="4" height="100%" fill="url(#glowR)" filter="url(#glow)" />
                    </svg>

                    {/* CSS Elements positioned on Right Gate */}
                    <div className="gate-runes-right">
                        <div className="rune-diamond" style={{ top: '35%', left: '15%' }} />
                        <div className="rune-diamond" style={{ top: '65%', left: '15%' }} />
                    </div>

                    {/* Right Full Concentric Circle */}
                    <div className="gate-circle-full">
                        <div className="circle-ring circle-outer parietal-ink" />
                        <div className="circle-ring circle-mid parietal-ink" />
                        <div className="circle-ring circle-inner parietal-ink" />
                    </div>

                    {/* Right rivets */}
                    <div className="gate-rivets-right">
                        {[10, 30, 50, 70, 90].map((top, i) => (
                            <div key={`r-${i}`} className="rivet parietal-ink" style={{ top: `${top}%`, left: '9px' }} />
                        ))}
                    </div>
                </div>

                {/* Center glow seam */}
                <div className="gate-seam" />
            </div>

            {/* Title text — slightly above midpoint */}
            <div className="splash-title">
                <h1 className="splash-brand pattern-text" data-text="Inkwell Arena">Inkwell Arena</h1>
                <p className="splash-tagline pattern-text" data-text="The Depths Await">The Depths Await</p>
            </div>

            {/* Enter button — visible when gate is closed, placed at bottom */}
            {phase === 'gate-closed' && (
                <button className="splash-enter-btn" onClick={handleEnterPress}>
                    Enter the Depths
                </button>
            )}

            {/* Auth content — appears only after user clicks Enter */}
            {phase === 'auth' && (
                <div className="splash-auth-wrapper">
                    <AuthModal onGuestMode={handleGuestMode} onClose={() => setPhase('gate-closed')} />
                </div>
            )}
        </div>
    );
}
