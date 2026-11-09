import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthCard from '../components/AuthCard';
import Field from '../components/Field';
import { emailOk, useTitle } from '../lib/utils';

export default function Login() {
  useTitle('Log in');
  const { login } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    const v = {};
    if (!emailOk(email)) v.email = 'Enter a valid email address.';
    if (!form.password) v.password = 'Enter your password.';
    setErrs(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    try {
      const user = await login(email, form.password);
      toast(`Welcome back, ${user.name.split(' ')[0]}`); // PublicOnly redirects once the user is set
    } catch (err) {
      setErrs(err.errors || { password: err.message });
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Log in" sub="Pick up where you left off."
      footer={<>New here? <Link to="/register" className="text-brand font-medium underline">Create an account</Link></>}>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set} error={errs.email} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" value={form.password} onChange={set} error={errs.password} />
        <button type="submit" disabled={busy} className="btn btn-p w-full">{busy ? 'Please wait…' : 'Log in'}</button>
      </form>
    </AuthCard>
  );
}
