import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { fmtDate, normalize } from '../lib/utils';

export default function ReadModal({ id, onClose }) {
  const ref = useRef(null);
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ref.current.open) ref.current.showModal();
    let live = true;
    api(`/posts/${id}`)
      .then((d) => live && setPost(normalize(d.post)))
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [id]);

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && ref.current.close()}
      className="m-auto rounded-xl bg-card text-ink p-0 w-[min(42rem,92vw)] max-h-[85vh] overflow-y-auto">
      <div className="p-6 sm:p-8">
        <div className="flex justify-between items-start gap-4">
          <span className="text-xs font-medium bg-soft text-brand rounded-full px-2.5 py-1">{post?.category || 'Post'}</span>
          <button className="btn btn-s !py-1.5" onClick={() => ref.current.close()}>Close</button>
        </div>
        {error && <p className="mt-6 text-err">{error}</p>}
        {!post && !error && <p className="mt-6 text-mute">Loading…</p>}
        {post && (
          <>
            <h2 className="font-serif text-3xl font-semibold leading-tight mt-4">{post.title}</h2>
            <div className="mt-3 flex flex-wrap gap-x-3 text-sm text-mute">
              <span>{post.author}</span><span>{fmtDate(post.date)}</span>
              <span>{post.mins} min read</span><span>{post.views.toLocaleString()} views</span>
            </div>
            <div className="mt-6 space-y-4 font-serif text-[1.075rem] leading-8">
              {post.body.split(/\n{2,}/).map((t, i) => <p key={i}>{t}</p>)}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
