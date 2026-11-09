import { Link, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import { ProtectedRoute, PublicOnly } from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreatePost from './pages/CreatePost';
import { useTitle } from './lib/utils';

function NotFound() {
  useTitle('Page not found');
  return (
    <section className="max-w-6xl mx-auto px-4 py-20 text-center">
      <h1 className="font-serif text-3xl font-semibold">Page not found</h1>
      <p className="text-mute mt-2">The page you’re looking for doesn’t exist or has moved.</p>
      <Link to="/" className="btn btn-p mt-6">Back to home</Link>
    </section>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<PublicOnly />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<CreatePost key="new" />} />
            <Route path="/edit/:id" element={<CreatePost key="edit" />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="border-t border-line text-sm text-mute">
        <div className="max-w-6xl mx-auto px-4 py-6">© 2026 Inkwell. Write something worth reading.</div>
      </footer>
    </div>
  );
}
