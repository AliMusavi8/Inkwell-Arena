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

  // Show splash screen if not yet completed and user isn't authenticated
  const showSplash = !splashDone && status !== 'authenticated';

  // If loading and no splash yet, show the splash (it handles the loading state)
  if (status === 'loading') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // If unauthenticated and splash not done → show splash with auth
  if (status === 'unauthenticated' && !splashDone && !isGuest) {
    return <SplashScreen onComplete={() => { setSplashDone(true); setIsGuest(true); }} />;
  }

  // If unauthenticated but splash is done (logged out after entering) → show auth modal again
  if (status === 'unauthenticated' && !isGuest) {
    return (
      <div style={{ height: '100vh', background: 'var(--color-bg)' }}>
        <AuthModal />
      </div>
    );
  }

  return (
    <>
      {/* Splash exit animation — overlays briefly while gates open */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Feed isGuest={isGuest} />} />
          <Route path="/challenge" element={
            isGuest ? <Navigate to="/" replace /> : <ProtectedRoute><Challenge /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            isGuest ? <Navigate to="/" replace /> : <ProtectedRoute><Settings /></ProtectedRoute>
          } />
        </Route>
      </Routes>
    </>
  );
}

export default App;
