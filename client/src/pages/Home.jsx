import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { CATEGORIES, normalize, useTitle } from '../lib/utils';
import PostCard from '../components/PostCard';

const PAGE_SIZE = 6;
const SORTS = { newest: 'Newest', oldest: 'Oldest', popular: 'Most viewed' };

export default function Home() {
  useTitle('Home');
  // Search, category and sort live in the URL (?q=&category=&sort=), so filtered views can be shared and survive refresh/back.
  const [sp, setSp] = useSearchParams();
  const dq = sp.get('q') || '';
  const cat = CATEGORIES.includes(sp.get('category')) ? sp.get('category') : 'All';
  const sort = SORTS[sp.get('sort')] ? sp.get('sort') : 'newest';

  const [input, setInput] = useState(dq);
  const sig = `${dq}|${cat}|${sort}`;
  const [pg, setPg] = useState({ sig, page: 1 });
  const page = pg.sig === sig ? pg.page : 1;         // changing any filter starts again at page 1
  const [posts, setPosts] = useState(null);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const update = (patch) => setSp((prev) => {
    const n = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(patch)) (!v || v === 'All' || v === 'newest') ? n.delete(k) : n.set(k, v);
    return n;
  }, { replace: true });

  useEffect(() => {
    const t = setTimeout(() => { if (input.trim() !== dq) update({ q: input.trim() }); }, 300);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    const ctrl = new AbortController();
    setError(''); setLoading(true);
    const params = new URLSearchParams({ q: dq, category: cat === 'All' ? '' : cat, sort, page, limit: PAGE_SIZE });
    api(`/posts?${params}`, { signal: ctrl.signal })
      .then((d) => {
        const list = d.posts.map(normalize);
        setPosts((prev) => (page === 1 || !prev ? list : [...prev, ...list]));
        setMeta({ total: d.total, pages: d.pages });
        setLoading(false);
      })
      .catch((e) => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false); } });
    return () => ctrl.abort();
  }, [dq, cat, sort, page, attempt]);

  const filtered = dq || cat !== 'All' || sort !== 'newest';
  const clear = () => { setInput(''); setSp({}, { replace: true }); };

  return (
    <>
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold max-w-2xl leading-tight">
          Practical writing from people who build things.
        </h1>
        <p className="mt-3 text-mute max-w-xl">Notes on engineering, design and product from our community of working writers.</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl">
          <div className="flex-1">
            <label htmlFor="q" className="sr-only">Search posts</label>
            <input id="q" type="search" className="inp" placeholder="Search titles, summaries and content" value={input} onChange={(e) => setInput(e.target.value)} />
          </div>
          <div>
            <label htmlFor="sort" className="sr-only">Sort posts</label>
            <select id="sort" className="inp sm:w-40" value={sort} onChange={(e) => update({ sort: e.target.value })}>
              {Object.entries(SORTS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {['All', ...CATEGORIES].map((c) => (
            <button key={c} aria-pressed={c === cat} onClick={() => update({ category: c })}
              className={`rounded-full border px-3.5 py-1.5 text-sm ${c === cat ? 'bg-brand text-onbrand border-brand' : 'border-line text-mute hover:text-ink'}`}>
              {c}
            </button>
          ))}
          {filtered && <button onClick={clear} className="text-sm text-brand font-medium underline ml-1">Clear filters</button>}
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
            {filtered && <button onClick={clear} className="btn btn-s mt-4">Clear filters</button>}
          </div>
        )}
        {!error && posts?.length > 0 && (
          <>
            <p className="text-sm text-mute mb-4" aria-live="polite">
              {meta.total} {meta.total === 1 ? 'post' : 'posts'}{dq && <> matching “{dq}”</>}{cat !== 'All' && <> in {cat}</>}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="text-sm text-mute">Showing {posts.length} of {meta.total}</p>
              {page < meta.pages && (
                <button className="btn btn-s" disabled={loading} onClick={() => setPg({ sig, page: page + 1 })}>
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
