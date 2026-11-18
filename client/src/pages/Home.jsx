import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CATEGORIES, normalize, useTitle } from '../lib/utils';
import PostCard from '../components/PostCard';

const PAGE_SIZE = 6;

export default function Home() {
  useTitle('Home');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');      // debounced search text
  const [cat, setCat] = useState('All');
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState(null);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => { setDq(q.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // Page 1 replaces the list; later pages are appended ("Load more").
  useEffect(() => {
    const ctrl = new AbortController();
    setError(''); setLoading(true);
    const params = new URLSearchParams({ q: dq, category: cat === 'All' ? '' : cat, page, limit: PAGE_SIZE });
    api(`/posts?${params}`, { signal: ctrl.signal })
      .then((d) => {
        const list = d.posts.map(normalize);
        setPosts((prev) => (page === 1 || !prev ? list : [...prev, ...list]));
        setMeta({ total: d.total, pages: d.pages });
        setLoading(false);
      })
      .catch((e) => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false); } });
    return () => ctrl.abort();
  }, [dq, cat, page, attempt]);

  const pick = (c) => { setCat(c); setPage(1); };

  return (
    <>
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold max-w-2xl leading-tight">
          Practical writing from people who build things.
        </h1>
        <p className="mt-3 text-mute max-w-xl">Notes on engineering, design and product from our community of working writers.</p>
        <div className="mt-6 max-w-md">
          <label htmlFor="q" className="sr-only">Search posts</label>
          <input id="q" type="search" className="inp" placeholder="Search posts by title or summary" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['All', ...CATEGORIES].map((c) => (
            <button key={c} aria-pressed={c === cat} onClick={() => pick(c)}
              className={`rounded-full border px-3.5 py-1.5 text-sm ${c === cat ? 'bg-brand text-onbrand border-brand' : 'border-line text-mute hover:text-ink'}`}>
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        {error && (
          <div className="card p-10 text-center">
            <p className="font-medium">{error}</p>
            <button className="btn btn-s mt-4" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
          </div>
        )}
        {!error && !posts && <p className="text-mute">Loading posts…</p>}
        {!error && posts?.length === 0 && (
          <div className="card p-10 text-center">
            <p className="font-medium">No posts found</p>
            <p className="text-sm text-mute mt-1">Try a different keyword or choose another category.</p>
          </div>
        )}
        {!error && posts?.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="text-sm text-mute">Showing {posts.length} of {meta.total} posts</p>
              {page < meta.pages && (
                <button className="btn btn-s" disabled={loading} onClick={() => setPage((n) => n + 1)}>
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}
