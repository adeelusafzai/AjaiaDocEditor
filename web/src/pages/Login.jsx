import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';

const DEMO_ACCOUNTS = [
  { email: 'alice@demo.com', label: 'Alice (owner)' },
  { email: 'bob@demo.com', label: 'Bob (editor)' },
  { email: 'carol@demo.com', label: 'Carol (viewer)' },
];

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = (demoEmail) => {
    setMode('login');
    setEmail(demoEmail);
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="logo-dot" /> Ajaia Docs
        </div>
        <h1>{mode === 'login' ? 'Sign in' : 'Create an account'}</h1>
        <p className="muted">A lightweight collaborative document editor.</p>

        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <div className="alert error">{error}</div>}

          <button className="btn primary block" disabled={busy} type="submit">
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <button className="link" onClick={() => setMode('register')}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button className="link" onClick={() => setMode('login')}>
                Sign in
              </button>
            </>
          )}
        </div>

        <div className="demo-box">
          <div className="demo-title">Demo accounts (password: <code>password123</code>)</div>
          <div className="demo-buttons">
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.email} className="btn small" onClick={() => fillDemo(a.email)}>
                {a.label}
              </button>
            ))}
          </div>
          <div className="muted tiny">
            Tip: open two browsers (or a private window) as different users to see sharing live.
          </div>
        </div>
      </div>
    </div>
  );
}
