'use client';

import { useEffect, useState } from 'react';
import { API, api, assetUrl } from '../lib/api';

export default function LoginForm({ storeSlug = '' }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState(null);
  const [loadingStore, setLoadingStore] = useState(!!storeSlug);

  useEffect(() => {
    if (!storeSlug) return;
    let active = true;
    fetch(`${API}/r/${encodeURIComponent(storeSlug)}`).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Store portal not found.');
      return data;
    }).then(data => { if (active) setStore(data); }).catch(err => { if (active) setError(err.message || 'Store portal not found.'); }).finally(() => { if (active) setLoadingStore(false); });
    return () => { active = false; };
  }, [storeSlug]);

  const signIn = async event => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const result = await api('/auth/login', { method: 'POST', body: { ...form, ...(storeSlug ? { storeSlug } : {}) } });
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      location.href = storeSlug ? `/${storeSlug}` : '/';
    } catch (err) {
      setError(err.message || 'We could not sign you in. Check your details and try again.');
      setLoading(false);
    }
  };

  const brandColor = /^#[0-9a-f]{6}$/i.test(store?.brandColor || '') ? store.brandColor : '#315a40';
  const style = storeSlug ? { '--store-brand': brandColor } : undefined;

  return <main className={`login-page ${storeSlug ? 'store-login-page' : ''}`} style={style}>
    <section className="login-card">
      <div className="admin-brand">
        <div className="admin-brand-mark">{store?.logoUrl ? <img src={assetUrl(store.logoUrl)} alt="" /> : store?.name?.slice(0, 1)?.toUpperCase() || 'S'}</div>
        <div className="admin-brand-name">{storeSlug ? store?.name || storeSlug : 'Storecraft'}<span>{storeSlug ? 'STORE ADMIN' : 'COMMERCE PLATFORM'}</span></div>
      </div>
      <h1>{storeSlug ? `Sign in to ${store?.name || 'your store'}` : 'Super admin sign in'}</h1>
      <p>{storeSlug ? 'Use a staff account assigned to this store.' : 'Sign in to manage all stores on the platform.'}</p>
      {loadingStore ? <div className="skeleton" /> : !storeSlug || store ? <form className="login-form" onSubmit={signIn}>
        <label className="field">Email address<input type="email" autoComplete="username" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" /></label>
        <label className="field">Password<input type="password" autoComplete="current-password" required value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="Enter your password" /></label>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <button className="button primary" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </form> : error && <div className="error-banner" role="alert">{error}</div>}
    </section>
  </main>;
}
