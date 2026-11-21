// Placeholders shown while content loads, so the layout does not jump.
const bar = 'rounded bg-soft animate-pulse';

export const PostCardSkeleton = () => (
  <div className="card overflow-hidden" aria-hidden="true">
    <div className="h-36 bg-soft animate-pulse" />
    <div className="p-5 space-y-3">
      <div className={`h-5 w-4/5 ${bar}`} /><div className={`h-4 w-full ${bar}`} /><div className={`h-4 w-3/5 ${bar}`} />
    </div>
  </div>
);

export const CardGridSkeleton = ({ count = 6 }) => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading posts">
    {Array.from({ length: count }, (_, i) => <PostCardSkeleton key={i} />)}
  </div>
);

export const DetailSkeleton = () => (
  <div className="max-w-3xl mx-auto px-4 pt-8 space-y-4" role="status" aria-label="Loading post">
    <div className={`h-4 w-24 ${bar}`} /><div className="h-48 rounded-xl bg-soft animate-pulse" />
    <div className={`h-10 w-4/5 ${bar}`} /><div className={`h-4 w-1/2 ${bar}`} />
    <div className={`h-4 w-full ${bar}`} /><div className={`h-4 w-full ${bar}`} /><div className={`h-4 w-2/3 ${bar}`} />
  </div>
);
