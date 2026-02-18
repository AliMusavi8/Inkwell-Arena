import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AuthModal from './components/AuthModal';
import Feed from './pages/Feed';
import MyPosts from './pages/MyPosts';
import Write from './pages/Write';
import Analytics from './pages/Analytics';
import PostDetail from './pages/PostDetail';
import Settings from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'guest') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function App() {
  const { status } = useAuth();

  return (
    <>
      {status === 'pending' && <AuthModal />}
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Feed />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/write" element={<ProtectedRoute><Write /></ProtectedRoute>} />
          <Route path="/write/:id" element={<ProtectedRoute><Write /></ProtectedRoute>} />
          <Route path="/my-posts" element={<ProtectedRoute><MyPosts /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
