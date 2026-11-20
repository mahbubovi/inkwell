import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Field from '../components/Field';
import { useTitle } from '../lib/utils';

const when = (d) => new Date(d).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });

export default function Profile() {
  useTitle('Profile');
  const { user, setUser, logout, clearSession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [armedAll, setArmedAll] = useState(false);
  const timer = useRef();

  const [form, setForm] = useState({ name: user.name, bio: user.bio || '' });
  const [errs, setErrs] = useState({});
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwErrs, setPwErrs] = useState({});
  const [pwBusy, setPwBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([api('/auth/profile'), api('/auth/sessions')]);
      setStats(p.stats); setSessions(s.sessions);
    } catch (e) { toast(e.message); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  async function saveProfile(e) {
    e.preventDefault();
    const name = form.name.trim();
    if (name.length < 2) return setErrs({ name: 'Enter your full name.' });
    setErrs({}); setSaving(true);
    try {
      const d = await api('/auth/profile', { method: 'PATCH', body: { name, bio: form.bio.trim() } });
      setUser(d.user); toast('Profile updated');
    } catch (err) { setErrs(err.errors || {}); if (!err.errors) toast(err.message); }
    setSaving(false);
  }

  async function changePassword(e) {
    e.preventDefault();
    const v = {};
    if (!pw.currentPassword) v.currentPassword = 'Enter your current password.';
    if (pw.newPassword.length < 8 || !/\d/.test(pw.newPassword)) v.newPassword = 'Use at least 8 characters, including a number.';
    if (pw.confirm !== pw.newPassword) v.confirm = 'Passwords don’t match.';
    setPwErrs(v);
    if (Object.keys(v).length) return;
    setPwBusy(true);
    try {
      const d = await api('/auth/password', { method: 'PATCH', body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword } });
      setToken(d.token);                       // the server ended every old session and issued a fresh one for this device
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      toast('Password updated. Other devices were signed out.');
      load();
    } catch (err) { setPwErrs(err.errors || {}); if (!err.errors) toast(err.message); }
    setPwBusy(false);
  }

  async function endSession(id) {
    try { await api(`/auth/sessions/${id}`, { method: 'DELETE' }); toast('Device signed out'); load(); }
    catch (e) { toast(e.message); }
  }

  async function endAll() {
    if (!armedAll) { setArmedAll(true); clearTimeout(timer.current); timer.current = setTimeout(() => setArmedAll(false), 3000); return; }
    try { await api('/auth/logout-all', { method: 'POST' }); clearSession(); toast('Signed out of all devices'); navigate('/login'); }
    catch (e) { toast(e.message); setArmedAll(false); }
  }

  const statCards = stats && [['Posts', stats.posts], ['Published', stats.published], ['Drafts', stats.drafts], ['Total views', stats.views.toLocaleString()]];

  return (
    <section className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="card p-6 flex flex-wrap items-center gap-4">
        <span className="grid place-items-center h-16 w-16 rounded-full bg-soft text-brand font-serif text-3xl font-semibold">{user.name[0]}</span>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-3xl font-semibold truncate">{user.name}</h1>
          <p className="text-sm text-mute truncate">{user.email}</p>
          <p className="text-sm text-mute">Member since {new Date(user.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</p>
        </div>
        <button className="btn btn-s" onClick={async () => { await logout(); toast('You’re logged out'); navigate('/'); }}>Log out</button>
        {user.bio && <p className="w-full text-ink">{user.bio}</p>}
      </div>

      {statCards && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map(([label, value]) => (
            <div key={label} className="card p-5"><p className="text-sm text-mute">{label}</p><p className="mt-1 text-3xl font-semibold">{value}</p></div>
          ))}
        </div>
      )}

      <form onSubmit={saveProfile} noValidate className="card p-6 space-y-4">
        <h2 className="font-serif text-xl font-semibold">Edit profile</h2>
        <Field id="name" label="Full name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errs.name} />
        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-1.5">Bio <span className="text-mute font-normal">(optional)</span></label>
          <textarea id="bio" rows={3} maxLength={160} className="inp" placeholder="A line about you" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          {errs.bio && <p role="alert" className="text-sm text-err mt-1.5">{errs.bio}</p>}
          <p className="text-xs text-mute mt-1 text-right">{form.bio.length}/160</p>
        </div>
        <button type="submit" disabled={saving} className="btn btn-p">{saving ? 'Saving…' : 'Save changes'}</button>
      </form>

      <form onSubmit={changePassword} noValidate className="card p-6 space-y-4">
        <h2 className="font-serif text-xl font-semibold">Change password</h2>
        <Field id="currentPassword" label="Current password" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} error={pwErrs.currentPassword} />
        <Field id="newPassword" label="New password" type="password" autoComplete="new-password" placeholder="At least 8 characters, with a number" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} error={pwErrs.newPassword} />
        <Field id="confirm" label="Confirm new password" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={pwErrs.confirm} />
        <p className="text-sm text-mute">Changing your password signs you out on every other device.</p>
        <button type="submit" disabled={pwBusy} className="btn btn-p">{pwBusy ? 'Updating…' : 'Update password'}</button>
      </form>

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-semibold">Active sessions</h2>
            <p className="text-sm text-mute">Devices where you’re logged in.</p>
          </div>
          <button className="btn btn-s" onClick={endAll}>{armedAll ? 'Confirm sign out everywhere' : 'Sign out of all devices'}</button>
        </div>
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {!sessions && <li className="py-4 text-mute">Loading…</li>}
          {sessions?.map((s) => (
            <li key={s.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{s.device} {s.current && <span className="ml-2 text-xs font-medium rounded-full px-2.5 py-1 bg-soft text-brand">This device</span>}</p>
                <p className="text-sm text-mute">Last active {when(s.lastActive)}</p>
              </div>
              {!s.current && <button className="btn btn-s !py-1.5" onClick={() => endSession(s.id)}>Sign out</button>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
