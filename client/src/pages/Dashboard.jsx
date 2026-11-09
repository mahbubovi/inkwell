import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fmtDate, normalize, useTitle } from '../lib/utils';

const COLS = 'sm:grid-cols-[minmax(0,1fr)_6.5rem_6rem_6.5rem_10rem]';

export default function Dashboard() {
  useTitle('Dashboard');
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [armed, setArmed] = useState(null); // post id waiting for delete confirmation
  const timer = useRef();

  useEffect(() => {
    const ctrl = new AbortController();
    setError('');
    api('/posts/mine', { signal: ctrl.signal })
      .then((d) => setPosts(d.posts.map(normalize)))
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => ctrl.abort();
  }, [attempt]);

  async function remove(id) {
    if (armed !== id) {
      setArmed(id);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setArmed(null), 3000);
      return;
    }
    try {
      await api(`/posts/${id}`, { method: 'DELETE' });
      setPosts((p) => p.filter((x) => x.id !== id));
      toast('Post deleted');
    } catch (e) { toast(e.message); }
    setArmed(null);
  }

  const published = posts?.filter((p) => p.status === 'published').length ?? 0;
  const stats = posts && [
    ['Total posts', posts.length], ['Published', published], ['Drafts', posts.length - published],
    ['Total views', posts.reduce((a, p) => a + p.views, 0).toLocaleString()],
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Hello, {user.name.split(' ')[0]}</h1>
          <p className="text-sm text-mute">Manage your posts and see how they’re doing.</p>
        </div>
        <Link to="/create" className="btn btn-p">New post</Link>
      </div>

      {error && (
        <div className="card p-10 text-center mt-6">
          <p className="font-medium">{error}</p>
          <button className="btn btn-s mt-4" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
        </div>
      )}
      {!error && !posts && <p className="mt-6 text-mute">Loading your posts…</p>}

      {!error && posts && (
        <>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(([label, value]) => (
              <div key={label} className="card p-5">
                <p className="text-sm text-mute">{label}</p>
                <p className="mt-1 text-3xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="card mt-6 overflow-hidden">
            <div className={`hidden sm:grid ${COLS} px-5 py-3 text-sm text-mute bg-soft`}>
              <span>Title</span><span>Status</span><span>Views</span><span>Updated</span><span />
            </div>
            {posts.length === 0 && (
              <div className="p-10 text-center">
                <p className="font-medium">You haven’t written anything yet</p>
                <p className="text-sm text-mute mt-1">Start with a draft. You can publish whenever it’s ready.</p>
                <Link to="/create" className="btn btn-p mt-4">Write your first post</Link>
              </div>
            )}
            {posts.map((p) => (
              <div key={p.id} className={`grid gap-2 ${COLS} sm:items-center px-5 py-4 border-t border-line first:border-0`}>
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.title}</p>
                  <p className="text-xs text-mute">{p.category}</p>
                </div>
                <div>
                  <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${p.status === 'published' ? 'bg-soft text-brand' : 'border border-line text-mute'}`}>
                    {p.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-sm text-mute">{p.views.toLocaleString()} views</p>
                <p className="text-sm text-mute">{fmtDate(p.date)}</p>
                <div className="flex gap-2 sm:justify-end">
                  <button className="btn btn-s !py-1.5" onClick={() => navigate(`/edit/${p.id}`)}>Edit</button>
                  <button className="btn btn-s !py-1.5" onClick={() => remove(p.id)}>{armed === p.id ? 'Confirm delete' : 'Delete'}</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
