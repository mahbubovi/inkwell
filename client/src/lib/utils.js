import { useEffect } from 'react';

export const CATEGORIES = ['Engineering', 'Design', 'Product', 'Career'];
export const emailOk = (e) => /^\S+@\S+\.\S+$/.test(e);
export const words = (t) => (t.trim().match(/\S+/g) || []).length;
export const readMins = (t) => Math.max(1, Math.round(words(t) / 200));
export const fmtDate = (d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });

export const coverStyle = (t) => {
  const h = [...t].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return { background: `linear-gradient(135deg,hsl(${h} 55% 42%),hsl(${(h + 45) % 360} 60% 28%))` };
};

// Maps an API post to the shape the UI uses.
export const normalize = (p) => ({
  id: p._id, title: p.title, category: p.category, excerpt: p.excerpt, body: p.body || '',
  status: p.status, views: p.views, mins: p.readMinutes || 1,
  author: p.author?.name || 'Unknown', date: p.updatedAt || p.createdAt,
});

export function useTitle(t) {
  useEffect(() => { document.title = `${t} | Inkwell`; }, [t]);
}
