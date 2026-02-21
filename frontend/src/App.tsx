import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
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

  if (status === 'loading') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--color-bg)',
        color: 'var(--color-text-secondary)',
        fontSize: '0.9rem',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      {status === 'unauthenticated' && <AuthModal />}
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Feed />} />
          <Route path="/challenge" element={<ProtectedRoute><Challenge /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
