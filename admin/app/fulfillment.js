'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const emptyArea = { name: '', deliveryFee: '', minimumOrder: '' };
const emptyBranch = { name: '', address: '', phone: '', openingHours: '' };
const money = value => `Rs ${Number(value || 0).toLocaleString('en-PK')}`;

function Switch({ checked, label, disabled, onChange }) {
  return <button className="toggle" type="button" role="switch" aria-label={label} aria-checked={!!checked} disabled={disabled} onClick={onChange}><span /></button>;
}

export default function FulfillmentSettings({ canToggleFeatures }) {
  const [settings, setSettings] = useState({ features: {}, deliveryAreas: [], pickupBranches: [], suggestedAreas: [] });
  const [areaForm, setAreaForm] = useState(emptyArea);
  const [branchForm, setBranchForm] = useState(emptyBranch);
  const [editingArea, setEditingArea] = useState('');
  const [editingBranch, setEditingBranch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setSettings(await api('/staff/fulfillment')); }
    catch (err) { setError(err.message || 'Could not load delivery and pickup settings.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const saveArea = async event => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const body = { ...areaForm, deliveryFee: Number(areaForm.deliveryFee), minimumOrder: Number(areaForm.minimumOrder) };
      if (editingArea) await api(`/staff/delivery-areas/${editingArea}`, { method: 'PATCH', body });
      else await api('/staff/delivery-areas', { method: 'POST', body });
      setAreaForm(emptyArea); setEditingArea(''); setMessage(editingArea ? 'Delivery area updated.' : 'Delivery area added.'); await load();
    } catch (err) { setError(err.message || 'Could not save the delivery area.'); }
    finally { setSaving(false); }
  };

  const saveBranch = async event => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      if (editingBranch) await api(`/staff/pickup-branches/${editingBranch}`, { method: 'PATCH', body: branchForm });
      else await api('/staff/pickup-branches', { method: 'POST', body: branchForm });
      setBranchForm(emptyBranch); setEditingBranch(''); setMessage(editingBranch ? 'Pickup branch updated.' : 'Pickup branch added.'); await load();
    } catch (err) { setError(err.message || 'Could not save the pickup branch.'); }
    finally { setSaving(false); }
  };

  const updateFeature = async key => {
    setPending(key); setError(''); setMessage('');
    try { await api('/staff/store/fulfillment-features', { method: 'PATCH', body: { key, value: !settings.features?.[key] } }); await load(); }
    catch (err) { setError(err.message || 'Could not update this setting.'); }
    finally { setPending(''); }
  };

  const toggleLocation = async (kind, item) => {
    const path = kind === 'area' ? '/staff/delivery-areas' : '/staff/pickup-branches';
    setPending(String(item._id)); setError('');
    try { await api(`${path}/${item._id}`, { method: 'PATCH', body: { enabled: !item.enabled } }); await load(); }
    catch (err) { setError(err.message || 'Could not update this location.'); }
    finally { setPending(''); }
  };

  const deleteLocation = async (kind, item) => {
    const path = kind === 'area' ? '/staff/delivery-areas' : '/staff/pickup-branches';
    setPending(String(item._id)); setError(''); setMessage('');
    try { await api(`${path}/${item._id}`, { method: 'DELETE' }); setMessage(kind === 'area' ? 'Delivery area deleted.' : 'Pickup branch deleted.'); await load(); }
    catch (err) { setError(err.message || 'Could not delete this location.'); }
    finally { setPending(''); }
  };

  const startEditArea = area => { setEditingArea(area._id); setAreaForm({ name: area.name, deliveryFee: String(area.deliveryFee), minimumOrder: String(area.minimumOrder) }); };
  const startEditBranch = branch => { setEditingBranch(branch._id); setBranchForm({ name: branch.name, address: branch.address, phone: branch.phone, openingHours: branch.openingHours }); };

  return <>
    <div className="page-heading"><div><h2>Delivery &amp; pickup</h2><p>Set the areas you deliver to and the branches customers can collect orders from.</p></div><button className="button" type="button" onClick={load} disabled={loading}>Refresh</button></div>
    {error && <div className="error-banner" role="alert">{error}<button className="button" type="button" onClick={load}>Try again</button></div>}
    {message && <div className="status-message" role="status">{message}</div>}
    {canToggleFeatures && <section className="panel fulfillment-switch-panel">
      <div className="panel-header"><h3>Customer checkout options</h3><span>Owners can turn these options on or off</span></div>
      <div className="fulfillment-switches">{[['delivery', 'Delivery'], ['pickup', 'Pickup']].map(([key, label]) => <div className="feature-item" key={key}><span>{label}</span><Switch label={`${label} checkout`} checked={settings.features?.[key] !== false} disabled={pending === key || loading} onChange={() => updateFeature(key)} /></div>)}</div>
    </section>}

    <section className="panel fulfillment-panel">
      <div className="panel-header"><h3>{editingArea ? 'Edit delivery area' : 'Add a delivery area'}</h3><span>Fees and minimums are in Rs</span></div>
      <form className="fulfillment-form" onSubmit={saveArea}>
        <label className="field">Area name<input list="karachi-area-suggestions" required maxLength={100} value={areaForm.name} onChange={event => setAreaForm({ ...areaForm, name: event.target.value })} placeholder="For example, DHA" /><datalist id="karachi-area-suggestions">{settings.suggestedAreas.map(area => <option value={area} key={area} />)}</datalist></label>
        <label className="field">Delivery fee<input required type="number" min="0" step="1" value={areaForm.deliveryFee} onChange={event => setAreaForm({ ...areaForm, deliveryFee: event.target.value })} placeholder="150" /></label>
        <label className="field">Minimum order<input required type="number" min="0" step="1" value={areaForm.minimumOrder} onChange={event => setAreaForm({ ...areaForm, minimumOrder: event.target.value })} placeholder="500" /></label>
        <div className="form-actions"><button className="button primary" disabled={saving}>{saving ? 'Saving…' : editingArea ? 'Save area' : 'Add area'}</button>{editingArea && <button type="button" className="button" onClick={() => { setEditingArea(''); setAreaForm(emptyArea); }}>Cancel</button>}</div>
      </form>
      <div className="fulfillment-list-heading"><b>Delivery areas</b><span>{settings.deliveryAreas.length} configured</span></div>
      {loading ? <div className="empty-state">Loading delivery areas…</div> : settings.deliveryAreas.length === 0 ? <div className="empty-state">No delivery areas yet. Add the areas your store serves.</div> : <div className="fulfillment-list">
        {settings.deliveryAreas.map(area => <article className="fulfillment-row" key={area._id}>
          <div className="fulfillment-row-copy"><b>{area.name}</b><span>{money(area.deliveryFee)} delivery · {money(area.minimumOrder)} minimum</span></div>
          <span className={`location-state ${area.enabled ? 'enabled' : ''}`}>{area.enabled ? 'Active' : 'Disabled'}</span>
          <Switch label={`${area.enabled ? 'Disable' : 'Enable'} ${area.name}`} checked={area.enabled} disabled={pending === String(area._id)} onChange={() => toggleLocation('area', area)} />
          <button className="button" type="button" onClick={() => startEditArea(area)}>Edit</button>
          <button className="button danger-button" type="button" disabled={pending === String(area._id)} onClick={() => deleteLocation('area', area)}>Delete</button>
        </article>)}
      </div>}
    </section>

    <section className="panel fulfillment-panel">
      <div className="panel-header"><h3>{editingBranch ? 'Edit pickup branch' : 'Add a pickup branch'}</h3><span>Show customers where and when to collect</span></div>
      <form className="fulfillment-form branch-form" onSubmit={saveBranch}>
        <label className="field">Branch name<input required maxLength={120} value={branchForm.name} onChange={event => setBranchForm({ ...branchForm, name: event.target.value })} placeholder="Clifton branch" /></label>
        <label className="field">Full Karachi address<input required maxLength={500} value={branchForm.address} onChange={event => setBranchForm({ ...branchForm, address: event.target.value })} placeholder="Shop, street, area, Karachi" /></label>
        <label className="field">Phone number<input required maxLength={40} type="tel" value={branchForm.phone} onChange={event => setBranchForm({ ...branchForm, phone: event.target.value })} placeholder="021-xxxxxxx" /></label>
        <label className="field">Opening hours<input required maxLength={160} value={branchForm.openingHours} onChange={event => setBranchForm({ ...branchForm, openingHours: event.target.value })} placeholder="Daily, 10:00 am – 10:00 pm" /></label>
        <div className="form-actions"><button className="button primary" disabled={saving}>{saving ? 'Saving…' : editingBranch ? 'Save branch' : 'Add branch'}</button>{editingBranch && <button type="button" className="button" onClick={() => { setEditingBranch(''); setBranchForm(emptyBranch); }}>Cancel</button>}</div>
      </form>
      <div className="fulfillment-list-heading"><b>Pickup branches</b><span>{settings.pickupBranches.length} configured</span></div>
      {loading ? <div className="empty-state">Loading pickup branches…</div> : settings.pickupBranches.length === 0 ? <div className="empty-state">No pickup branches yet. Add a branch customers can visit.</div> : <div className="fulfillment-list">
        {settings.pickupBranches.map(branch => <article className="fulfillment-row branch-row" key={branch._id}>
          <div className="fulfillment-row-copy"><b>{branch.name}</b><span>{branch.address}</span><span>{branch.phone} · {branch.openingHours}</span></div>
          <span className={`location-state ${branch.enabled ? 'enabled' : ''}`}>{branch.enabled ? 'Active' : 'Disabled'}</span>
          <Switch label={`${branch.enabled ? 'Disable' : 'Enable'} ${branch.name}`} checked={branch.enabled} disabled={pending === String(branch._id)} onChange={() => toggleLocation('branch', branch)} />
          <button className="button" type="button" onClick={() => startEditBranch(branch)}>Edit</button>
          <button className="button danger-button" type="button" disabled={pending === String(branch._id)} onClick={() => deleteLocation('branch', branch)}>Delete</button>
        </article>)}
      </div>}
    </section>
  </>;
}
