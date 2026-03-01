import { useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import AuthModal from './components/AuthModal';
import Feed from './pages/Feed';
import Challenge from './pages/Challenge';
import Settings from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'unauthenticated') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function App() {
  const { status } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  const handleSplashComplete = useCallback(() => {
    setSplashDone(true);
  }, []);

  const handleGuestSplashComplete = useCallback(() => {
    setSplashDone(true);
    setIsGuest(true);
  }, []);

  // Show splash overlay until the gate animation finishes
  const showSplash = !splashDone;

  // While loading auth state, just show the splash
  if (status === 'loading') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // If unauthenticated and splash not done (and not guest) → full-screen splash with auth
  if (status === 'unauthenticated' && !splashDone && !isGuest) {
    return <SplashScreen onComplete={handleGuestSplashComplete} />;
  }

  // If unauthenticated, splash is done, and not a guest → show auth modal (e.g. logged out)
  if (status === 'unauthenticated' && splashDone && !isGuest) {
    return (
      <div style={{ height: '100vh', background: 'var(--color-bg)' }}>
        <AuthModal />
      </div>
    );
  }

  return (
    <>
      {/* Splash stays as overlay until gate animation completes */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Feed isGuest={isGuest} />} />
          <Route path="/challenge" element={<Challenge isGuest={isGuest} />} />
          <Route path="/settings" element={
            isGuest ? <Navigate to="/" replace /> : <ProtectedRoute><Settings /></ProtectedRoute>
          } />
        </Route>
      </Routes>
    </>
  );
}

export default App;
