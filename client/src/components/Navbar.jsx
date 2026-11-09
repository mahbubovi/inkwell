import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const link = ({ isActive }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-soft text-brand' : 'text-mute hover:text-ink'}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const items = (
    <>
      <NavLink to="/" end className={link}>Home</NavLink>
      {user ? (
        <>
          <NavLink to="/dashboard" className={link}>Dashboard</NavLink>
          <NavLink to="/create" className={link}>Create blog</NavLink>
          <button
            onClick={() => { logout(); toast('You’re logged out'); navigate('/'); }}
            className="px-3 py-2 rounded-md text-sm font-medium text-mute hover:text-ink text-left">
            Log out
          </button>
        </>
      ) : (
        <>
          <NavLink to="/login" className={link}>Log in</NavLink>
          <Link to="/register" className="btn btn-p md:ml-1">Sign up</Link>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-20 bg-card border-b border-line">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-serif text-xl font-semibold">
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-brand text-onbrand text-base">I</span>Inkwell
        </Link>
        <nav className="hidden md:flex items-center gap-1" aria-label="Main">{items}</nav>
        <button className="md:hidden btn btn-s" aria-expanded={open} aria-controls="mm" onClick={() => setOpen((o) => !o)}>Menu</button>
      </div>
      {open && <nav id="mm" className="md:hidden border-t border-line px-4 py-3 flex flex-col gap-1" aria-label="Mobile">{items}</nav>}
    </header>
  );
}
