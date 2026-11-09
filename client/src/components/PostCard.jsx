import { coverStyle, fmtDate } from '../lib/utils';

export default function PostCard({ post, onOpen }) {
  return (
    <article className="card overflow-hidden flex">
      <button onClick={() => onOpen(post.id)} className="text-left flex-1 flex flex-col w-full">
        <div className="h-36 flex items-end p-4" style={coverStyle(post.title)}>
          <span className="text-xs font-medium bg-card text-ink rounded-full px-2.5 py-1">{post.category}</span>
        </div>
        <div className="p-5 flex-1 flex flex-col">
          <h3 className="font-serif text-xl font-semibold leading-snug">{post.title}</h3>
          <p className="mt-2 text-sm text-mute line-clamp-3">{post.excerpt}</p>
          <div className="mt-auto pt-4 flex flex-wrap gap-x-3 text-xs text-mute">
            <span>{post.author}</span><span>{fmtDate(post.date)}</span><span>{post.mins} min read</span>
          </div>
        </div>
      </button>
    </article>
  );
}
