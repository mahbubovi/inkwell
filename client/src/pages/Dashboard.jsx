import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CATEGORIES, fmtDate, normalize, useTitle } from '../lib/utils';

const COLS = 'sm:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_6.5rem_17.5rem]';
const STATUS = [['all', 'All'], ['published', 'Published'], ['draft', 'Drafts']];

export default function Dashboard() {
  useTitle('Dashboard');
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [armed, setArmed] = useState(null);   // post id waiting for delete confirmation
  const [busyId, setBusyId] = useState(null); // post id with a request in flight
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [cat, setCat] = useState('All');
  const timer = useRef();

  useEffect(() => {
    const ctrl = new AbortController();
    setError('');
    api('/posts/mine', { signal: ctrl.signal })
      .then((d) => setPosts(d.posts.map(normalize)))
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => ctrl.abort();
  }, [attempt]);

  const shown = useMemo(() => (posts || []).filter((p) =>
    (status === 'all' || p.status === status) &&
    (cat === 'All' || p.category === cat) &&
    (!q.trim() || p.title.toLowerCase().includes(q.trim().toLowerCase()))), [posts, status, cat, q]);

  async function remove(id) {
    if (armed !== id) {
      setArmed(id);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setArmed(null), 3000);
      return;
    }
    setBusyId(id);
    try {
      await api(`/posts/${id}`, { method: 'DELETE' });
      setPosts((p) => p.filter((x) => x.id !== id));
      toast('Post deleted');
    } catch (e) { toast(e.message); }
    setArmed(null); setBusyId(null);
  }

  async function toggle(p) {
    const next = p.status === 'published' ? 'draft' : 'published';
    setBusyId(p.id);
    try {
      const d = await api(`/posts/${p.id}/status`, { method: 'PATCH', body: { status: next } });
      setPosts((list) => list.map((x) => (x.id === p.id ? normalize(d.post) : x)));
      toast(next === 'published' ? 'Post published' : 'Moved to drafts');
    } catch (e) { toast(e.errors?.status || e.message); }
    setBusyId(null);
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
          <p className="text-sm text-mute">Create, edit, publish and delete your posts.</p>
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

          {posts.length > 0 && (
            <div className="mt-6 flex flex-col lg:flex-row gap-3 lg:items-center">
              <div className="flex gap-2">
                {STATUS.map(([k, label]) => (
                  <button key={k} aria-pressed={status === k} onClick={() => setStatus(k)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm ${status === k ? 'bg-brand text-onbrand border-brand' : 'border-line text-mute hover:text-ink'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <label htmlFor="dq" className="sr-only">Search your posts</label>
              <input id="dq" type="search" className="inp lg:max-w-xs" placeholder="Search your posts" value={q} onChange={(e) => setQ(e.target.value)} />
              <label htmlFor="dcat" className="sr-only">Filter by category</label>
              <select id="dcat" className="inp lg:w-44" value={cat} onChange={(e) => setCat(e.target.value)}>
                {['All', ...CATEGORIES].map((c) => <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>)}
              </select>
            </div>
          )}

          <div className="card mt-4 overflow-hidden">
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
            {posts.length > 0 && shown.length === 0 && (
              <div className="p-10 text-center">
                <p className="font-medium">No posts match these filters</p>
                <button className="btn btn-s mt-4" onClick={() => { setQ(''); setStatus('all'); setCat('All'); }}>Clear filters</button>
              </div>
            )}
            {shown.map((p) => (
              <div key={p.id} className={`grid gap-2 ${COLS} sm:items-center px-5 py-4 border-t border-line first:border-0`}>
                <div className="min-w-0">
                  <Link to={`/blog/${p.id}`} className="font-medium truncate block hover:underline">{p.title}</Link>
                  <p className="text-xs text-mute">{p.category}</p>
                </div>
                <div>
                  <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${p.status === 'published' ? 'bg-soft text-brand' : 'border border-line text-mute'}`}>
                    {p.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-sm text-mute">{p.views.toLocaleString()} {p.views === 1 ? 'view' : 'views'}</p>
                <p className="text-sm text-mute">{fmtDate(p.date)}</p>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button className="btn btn-s !py-1.5" onClick={() => navigate(`/edit/${p.id}`)}>Edit</button>
                  <button className="btn btn-s !py-1.5" disabled={busyId === p.id} onClick={() => toggle(p)}>{p.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                  <button className="btn btn-s !py-1.5" disabled={busyId === p.id} onClick={() => remove(p.id)}>{armed === p.id ? 'Confirm delete' : 'Delete'}</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
