'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDER = [1, 2, 3, 4, 5, 6, 0]; // show Monday first

export default function HoursSettings() {
  const [hours, setHours] = useState(null);
  const [configured, setConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setError('');
    try { const data = await api('/staff/hours'); setHours(data.hours); setConfigured(data.configured); }
    catch (err) { setError(err.message || 'Could not load opening hours.'); }
  };
  useEffect(() => { load(); }, []);

  const setDay = (index, patch) => setHours(h => ({ ...h, days: h.days.map((d, i) => i === index ? { ...d, ...patch } : d) }));
  const copyMonday = () => setHours(h => ({ ...h, days: h.days.map(() => ({ ...h.days[1] })) }));

  const save = async event => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try { await api('/staff/hours', { method: 'PATCH', body: hours }); setConfigured(true); setMessage('Opening hours saved. Customers see them right away.'); }
    catch (err) { setError(err.message || 'Could not save opening hours.'); }
    finally { setSaving(false); }
  };
  const turnOff = async () => {
    setSaving(true); setError(''); setMessage('');
    try { await api('/staff/hours', { method: 'DELETE' }); setConfigured(false); setMessage('Hours turned off. The store accepts orders at any time.'); }
    catch (err) { setError(err.message || 'Could not turn off opening hours.'); }
    finally { setSaving(false); }
  };

  if (!hours) return <section className="panel">{error ? <div className="error-banner" role="alert">{error}<button className="button" type="button" onClick={load}>Try again</button></div> : <p>Loading…</p>}</section>;

  const row = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' };
  return <>
    <div className="page-heading"><div><h2>Opening hours</h2><p>Times are in Pakistan time. A close time earlier than the open time means the store closes after midnight, like 11:00 to 02:00.</p></div></div>
    {error && <div className="error-banner" role="alert">{error}</div>}
    {message && <div className="status-message" role="status">{message}</div>}
    <section className="panel">
      <div className="panel-header"><h3>Weekly hours</h3><span>{configured ? 'Hours are on' : 'No hours saved: the store is always open'}</span></div>
      <form onSubmit={save}>
        {ORDER.map(i => {
          const d = hours.days[i];
          return <div style={row} key={i}>
            <b>{NAMES[i]}</b>
            <label><input type="checkbox" checked={d.closed} onChange={e => setDay(i, { closed: e.target.checked })} /> Closed</label>
            <input type="time" aria-label={`${NAMES[i]} opens`} value={d.open} disabled={d.closed} onChange={e => setDay(i, { open: e.target.value })} />
            <input type="time" aria-label={`${NAMES[i]} closes`} value={d.close} disabled={d.closed} onChange={e => setDay(i, { close: e.target.value })} />
          </div>;
        })}
        <div style={{ margin: '14px 0' }}>
          <label><input type="checkbox" checked={hours.tempClosed} onChange={e => setHours({ ...hours, tempClosed: e.target.checked })} /> Temporarily closed (pauses all orders now)</label>
          <label className="field">Message for customers (optional)<input maxLength={160} value={hours.closedMessage} onChange={e => setHours({ ...hours, closedMessage: e.target.value })} placeholder="Closed for Eid. Back on Monday." /></label>
        </div>
        <div className="form-actions">
          <button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Save hours'}</button>
          <button className="button" type="button" onClick={copyMonday}>Copy Monday to all days</button>
          {configured && <button className="button" type="button" onClick={turnOff} disabled={saving}>Turn off hours</button>}
        </div>
      </form>
    </section>
  </>;
}
