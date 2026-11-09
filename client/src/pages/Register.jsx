import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthCard from '../components/AuthCard';
import Field from '../components/Field';
import { emailOk, useTitle } from '../lib/utils';

export default function Register() {
  useTitle('Create account');
  const { register } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const v = {};
    if (name.length < 2) v.name = 'Enter your full name.';
    if (!emailOk(email)) v.email = 'Enter a valid email address.';
    if (form.password.length < 8 || !/\d/.test(form.password)) v.password = 'Use at least 8 characters, including a number.';
    if (form.confirm !== form.password) v.confirm = 'Passwords don’t match.';
    setErrs(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    try {
      await register(name, email, form.password);
      toast('Account created. Welcome to Inkwell!');
    } catch (err) {
      setErrs(err.errors || {});
      if (!err.errors) toast(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Create your account" sub="Start writing in under a minute."
      footer={<>Already registered? <Link to="/login" className="text-brand font-medium underline">Log in</Link></>}>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <Field id="name" label="Full name" autoComplete="name" placeholder="Ada Lovelace" value={form.name} onChange={set} error={errs.name} />
        <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set} error={errs.email} />
        <Field id="password" label="Password" type="password" autoComplete="new-password" placeholder="At least 8 characters, with a number" value={form.password} onChange={set} error={errs.password} />
        <Field id="confirm" label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set} error={errs.confirm} />
        <button type="submit" disabled={busy} className="btn btn-p w-full">{busy ? 'Please wait…' : 'Create account'}</button>
      </form>
    </AuthCard>
  );
}
