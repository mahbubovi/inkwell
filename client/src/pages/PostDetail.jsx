import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { coverStyle, fmtDate, normalize, useTitle } from '../lib/utils';
import PostCard from '../components/PostCard';

// Individual blog page: /blog/:id. Authors can also open their own drafts here (preview).
export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState(null);   // { message, status }
  const [copied, setCopied] = useState(false);
  const [armed, setArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const timer = useRef();
  useTitle(post?.title || 'Post');

  useEffect(() => {
    const ctrl = new AbortController();
    setPost(null); setRelated([]); setError(null); setArmed(false);
    window.scrollTo(0, 0);
    api(`/posts/${id}`, { signal: ctrl.signal })
      .then((d) => { setPost(normalize(d.post)); setRelated(d.related.map(normalize)); })
      .catch((e) => { if (e.name !== 'AbortError') setError({ message: e.message, status: e.status }); });
    return () => ctrl.abort();
  }, [id, user?.id]);

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  }

  async function remove() {
    if (!armed) { setArmed(true); clearTimeout(timer.current); timer.current = setTimeout(() => setArmed(false), 3000); return; }
    setDeleting(true);
    try { await api(`/posts/${id}`, { method: 'DELETE' }); toast('Post deleted'); navigate('/dashboard'); }
    catch (e) { toast(e.message); setDeleting(false); setArmed(false); }
  }

  if (error) {
    const missing = error.status === 404 || error.status === 422;
    return (
      <section className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="font-serif text-3xl font-semibold">{missing ? 'Post not found' : 'Something went wrong'}</h1>
        <p className="text-mute mt-2">{missing ? 'This post doesn’t exist, or it hasn’t been published yet.' : error.message}</p>
        <Link to="/" className="btn btn-p mt-6">Back to all posts</Link>
      </section>
    );
  }
  if (!post) return <p className="max-w-3xl mx-auto px-4 py-10 text-mute">Loading post…</p>;

  const isOwner = user && user.id === post.authorId;
  const isDraft = post.status !== 'published';
  return (
    <>
      <article className="max-w-3xl mx-auto px-4 pt-8 pb-12">
        <Link to={isOwner ? '/dashboard' : '/'} className="text-sm text-mute hover:text-ink">← {isOwner ? 'Dashboard' : 'All posts'}</Link>
        {isDraft && (
          <p role="status" className="mt-4 rounded-md border border-line bg-soft px-4 py-3 text-sm">
            <span className="font-medium">Draft preview.</span> Only you can see this post until you publish it.
          </p>
        )}
        <div className="mt-6 h-40 sm:h-56 rounded-xl" style={coverStyle(post.title)} role="img" aria-label={`${post.category} cover`} />
        <span className="inline-block mt-6 text-xs font-medium bg-soft text-brand rounded-full px-2.5 py-1">{post.category}</span>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold leading-tight mt-3">{post.title}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-mute">
          <span className="flex items-center gap-2">
            <span className="grid place-items-center h-8 w-8 rounded-full bg-soft text-brand font-medium">{post.author[0]}</span>
            <span className="text-ink font-medium">{post.author}</span>
          </span>
          <span>{fmtDate(post.date)}</span><span>{post.mins} min read</span>
          <span>{post.views.toLocaleString()} {post.views === 1 ? 'view' : 'views'}</span>
        </div>
        <div className="mt-8 space-y-5 font-serif text-lg leading-8">
          {post.body.split(/\n{2,}/).map((t, i) => <p key={i}>{t}</p>)}
        </div>
        <div className="mt-10 pt-6 border-t border-line flex flex-wrap gap-3">
          {!isDraft && <button onClick={copyLink} className="btn btn-s">{copied ? 'Link copied' : 'Copy link'}</button>}
          {isOwner && <Link to={`/edit/${post.id}`} className="btn btn-s">Edit post</Link>}
          {isOwner && <button onClick={remove} disabled={deleting} className="btn btn-s">{armed ? 'Confirm delete' : 'Delete post'}</button>}
        </div>
      </article>

      {related.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <h2 className="font-serif text-2xl font-semibold mb-5">More in {post.category}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{related.map((p) => <PostCard key={p.id} post={p} />)}</div>
        </section>
      )}
    </>
  );
}
