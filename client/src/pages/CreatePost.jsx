import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { CATEGORIES, readMins, useTitle, words } from '../lib/utils';

const Err = ({ children }) => children && <p role="alert" className="text-sm text-err mt-1.5">{children}</p>;

// Used for both /create and /edit/:id
export default function CreatePost() {
  const { id } = useParams();
  useTitle(id ? 'Edit post' : 'Create blog');
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ title: '', body: '', excerpt: '', category: CATEGORIES[0] });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState('');          // 'published' | 'draft' while saving
  const [loading, setLoading] = useState(!!id);
  const [loadError, setLoadError] = useState('');
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  useEffect(() => {
    if (!id) return;
    let live = true;
    api('/posts/mine')
      .then((d) => {
        if (!live) return;
        const p = d.posts.find((x) => x._id === id);
        if (!p) setLoadError('We couldn’t find that post. It may have been deleted.');
        else setForm({ title: p.title, body: p.body, excerpt: p.excerpt, category: p.category });
      })
      .catch((e) => live && setLoadError(e.message))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [id]);

  async function save(status) {
    const title = form.title.trim();
    const body = form.body.trim();
    const wc = words(body);
    const v = {};
    if (title.length < 5) v.title = 'Add a title of at least 5 characters.';
    if (status === 'published' && wc < 50) v.body = `Write at least 50 words to publish. You have ${wc}.`;
    setErrs(v);
    if (Object.keys(v).length) return;

    setBusy(status);
    try {
      await api(id ? `/posts/${id}` : '/posts', {
        method: id ? 'PUT' : 'POST',
        body: { title, body, excerpt: form.excerpt.trim(), category: form.category, status },
      });
      toast(status === 'published' ? 'Post published' : 'Draft saved');
      navigate('/dashboard');
    } catch (e) {
      setErrs(e.errors || {});
      if (!e.errors) toast(e.message);
      setBusy('');
    }
  }

  if (loading) return <p className="max-w-5xl mx-auto px-4 py-10 text-mute">Loading post…</p>;
  if (loadError) return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <p className="text-err">{loadError}</p>
      <Link to="/dashboard" className="btn btn-s mt-4">Back to dashboard</Link>
    </div>
  );

  return (
    <form onSubmit={(e) => e.preventDefault()} noValidate className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_18rem] gap-8 items-start">
      <div className="space-y-5">
        <h1 className="font-serif text-3xl font-semibold">{id ? 'Edit post' : 'New post'}</h1>
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1.5">Title</label>
          <input id="title" name="title" className="inp !text-lg font-medium" placeholder="A clear, specific headline" value={form.title} onChange={set} />
          <Err>{errs.title}</Err>
        </div>
        <div>
          <label htmlFor="body" className="block text-sm font-medium mb-1.5">Content</label>
          <textarea id="body" name="body" className="inp min-h-[22rem] font-serif !text-base leading-7"
            placeholder="Tell your story. Separate paragraphs with a blank line." value={form.body} onChange={set} />
          <div className="flex justify-between mt-1.5">
            <Err>{errs.body}</Err>
            <p className="text-xs text-mute ml-auto">{words(form.body)} words, {readMins(form.body)} min read</p>
          </div>
        </div>
      </div>

      <aside className="card p-5 space-y-4 lg:sticky lg:top-24">
        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-1.5">Category</label>
          <select id="category" name="category" className="inp" value={form.category} onChange={set}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <Err>{errs.category}</Err>
        </div>
        <div>
          <label htmlFor="excerpt" className="block text-sm font-medium mb-1.5">Summary <span className="text-mute font-normal">(optional)</span></label>
          <textarea id="excerpt" name="excerpt" rows={3} maxLength={160} className="inp"
            placeholder="Shown on the home page. We’ll use your opening if left blank." value={form.excerpt} onChange={set} />
          <Err>{errs.excerpt}</Err>
          <p className="text-xs text-mute mt-1 text-right">{form.excerpt.length}/160</p>
        </div>
        <button type="button" disabled={!!busy} onClick={() => save('published')} className="btn btn-p w-full">
          {busy === 'published' ? 'Please wait…' : 'Publish'}
        </button>
        <button type="button" disabled={!!busy} onClick={() => save('draft')} className="btn btn-s w-full">
          {busy === 'draft' ? 'Please wait…' : 'Save draft'}
        </button>
        <Link to="/dashboard" className="block text-center text-sm text-mute hover:text-ink">Cancel</Link>
      </aside>
    </form>
  );
}
