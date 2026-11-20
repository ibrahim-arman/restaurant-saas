'use client';

import { useEffect, useRef, useState } from 'react';
import { api, assetUrl } from '../lib/api';
import FulfillmentSettings from './fulfillment';

const ORDER_STATUSES = ['new', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
const STATUS_LABELS = { new: 'New', preparing: 'Preparing', ready: 'Ready', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled' };
const INQUIRY_STATUSES = ['new', 'contacted', 'converted', 'archived'];
const INQUIRY_STATUS_LABELS = { new: 'New', contacted: 'Contacted', converted: 'Converted', archived: 'Archived' };
const FEATURE_LABELS = { onlineOrdering: 'Online ordering', cod: 'Cash on delivery', cardPayments: 'Card payments', coupons: 'Coupons', loyalty: 'Loyalty', reviews: 'Reviews', tableQr: 'Table QR', delivery: 'Delivery', pickup: 'Pickup' };
const ROLES = [
  { role: 'owner', label: 'Owner' }, { role: 'manager', label: 'Manager' },
  { role: 'cashier', label: 'Cashier' }, { role: 'kitchen', label: 'Kitchen' }, { role: 'rider', label: 'Rider' },
];
const money = value => `Rs ${Number(value || 0).toLocaleString('en-PK')}`;
const errorText = error => error?.message || 'Something went wrong. Please try again.';

function playOrderSound(context) {
  if (!context) return;
  try {
    if (context.state === 'suspended') context.resume();
    const start = context.currentTime + 0.02;
    [880, 1175].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + index * 0.17;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.12, noteStart + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.24);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.25);
    });
  } catch { /* Audio may be unavailable in this browser. */ }
}

function Toggle({ checked, disabled, label, onChange }) {
  return <button className="toggle" type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled} onClick={onChange}><span /></button>;
}

function LoadingRows({ count = 4 }) {
  return <div className="loading-block" aria-label="Loading"><div className="skeleton" />{Array.from({ length: count - 1 }, (_, index) => <div className="skeleton" key={index} />)}</div>;
}

function ErrorBanner({ children, onRetry }) {
  if (!children) return null;
  return <div className="error-banner" role="alert"><span>{children}</span>{onRetry && <button className="button" type="button" onClick={onRetry}>Try again</button>}</div>;
}

const emptyStoreForm = { name: '', slug: '', ownerEmail: '', ownerPassword: '', inquiryId: '' };
const storeFormFromInquiry = inquiry => ({
  name: inquiry?.business || '',
  slug: (inquiry?.business || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  ownerEmail: inquiry?.email || '',
  ownerPassword: '',
  inquiryId: inquiry?._id || '',
});

function SuperAdmin({ initialInquiry, onInquiryCreated }) {
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState(() => initialInquiry ? storeFormFromInquiry(initialInquiry) : emptyStoreForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadStores = async () => {
    setLoading(true);
    setError('');
    try { setStores(await api('/super/tenants')); }
    catch (err) { setError(errorText(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadStores(); }, []);

  const createStore = async event => {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      await api('/super/tenants', { method: 'POST', body: form });
      const inquiryId = form.inquiryId;
      setForm(emptyStoreForm);
      if (inquiryId) {
        try {
          await api(`/super/inquiries/${inquiryId}/status`, { method: 'PATCH', body: { status: 'converted' } });
          onInquiryCreated?.(inquiryId);
          setMessage('Store created and inquiry marked as converted. Its owner can now sign in.');
        } catch {
          setMessage('Store created. Update the inquiry status manually; its owner can now sign in.');
        }
      } else setMessage('Store created. Its owner can now sign in.');
      await loadStores();
    } catch (err) { setError(errorText(err)); }
    finally { setSaving(false); }
  };

  const updateFeature = async (store, key) => {
    const operation = `${store._id}:${key}`;
    setPending(operation); setError(''); setMessage('');
    try {
      await api(`/super/tenants/${store._id}/features`, { method: 'PATCH', body: { key, value: !store.features?.[key] } });
      await loadStores();
    } catch (err) { setError(errorText(err)); }
    finally { setPending(''); }
  };

  return <>
    <div className="page-heading"><div><h2>Stores</h2><p>Create storefronts and choose which features each one can use.</p></div></div>
    <ErrorBanner onRetry={loadStores}>{error}</ErrorBanner>
    {message && <div className="status-message" role="status">{message}</div>}
    <section className="panel" style={{ marginBottom: 17 }}>
      <div className="panel-header"><h3>Create a store</h3><span>Set up the first owner account</span></div>
      <form style={{ padding: 18 }} onSubmit={createStore}>
        {form.inquiryId && <p className="form-note" style={{ margin: '0 0 12px' }}>Started from a business inquiry. Confirm the store details and set a temporary password for its owner.</p>}
        <div className="form-grid">
          <label className="field">Store name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Kababjees" /></label>
          <label className="field">Store URL slug<input required pattern="[a-zA-Z0-9-]+" value={form.slug} onChange={event => setForm({ ...form, slug: event.target.value.toLowerCase() })} placeholder="kababjees" /></label>
          <label className="field">Owner email<input required type="email" autoComplete="email" value={form.ownerEmail} onChange={event => setForm({ ...form, ownerEmail: event.target.value })} placeholder="owner@example.com" /></label>
          <label className="field">Temporary password<input required type="password" autoComplete="new-password" minLength={6} value={form.ownerPassword} onChange={event => setForm({ ...form, ownerPassword: event.target.value })} placeholder="At least 6 characters" /></label>
        </div>
        <div className="form-actions"><button className="button primary" disabled={saving}>{saving ? 'Creating…' : 'Create store'}</button><span className="form-note">The owner can add staff after signing in.</span></div>
      </form>
    </section>

    <section className="panel">
      <div className="panel-header"><h3>All stores</h3><span>{loading ? 'Loading…' : `${stores.length} stores`}</span></div>
      {loading ? <LoadingRows /> : stores.length === 0 ? <div className="empty-state"><strong>No stores yet</strong>Create a store above to get started.</div> :
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Store</th><th>Features</th><th>Store portal</th></tr></thead><tbody>
          {stores.map(store => <tr key={store._id}>
            <td><div className="store-ident"><div className="store-avatar">{store.name?.slice(0, 1)?.toUpperCase()}</div><div><b>{store.name}</b><small>/{store.slug}</small></div></div></td>
            <td><div className="feature-list">{Object.entries(FEATURE_LABELS).map(([key, label]) => <div className={`feature-item ${store.features?.[key] ? 'enabled' : ''}`} key={key}>
              <span>{label}</span><Toggle label={`${label} for ${store.name}`} checked={store.features?.[key]} disabled={pending === `${store._id}:${key}`} onChange={() => updateFeature(store, key)} />
            </div>)}</div></td><td><a className="button" href={`/${store.slug}`}>Open portal</a></td>
          </tr>)}
        </tbody></table></div>}
    </section>
  </>;
}

function InquiryInbox({ onUseInquiry }) {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');

  const loadInquiries = async () => {
    setLoading(true); setError('');
    try { setInquiries(await api('/super/inquiries')); }
    catch (err) { setError(errorText(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadInquiries(); }, []);

  const updateStatus = async (inquiry, status) => {
    setPending(inquiry._id); setError('');
    try {
      const updated = await api(`/super/inquiries/${inquiry._id}/status`, { method: 'PATCH', body: { status } });
      setInquiries(current => current.map(item => item._id === inquiry._id ? updated : item));
    } catch (err) { setError(errorText(err)); }
    finally { setPending(''); }
  };

  return <>
    <div className="page-heading"><div><h2>Business inquiries</h2><p>Review prospective businesses and create their stores when they’re ready.</p></div><button className="button" onClick={loadInquiries} disabled={loading}>Refresh</button></div>
    <ErrorBanner onRetry={loadInquiries}>{error}</ErrorBanner>
    <section className="panel">
      <div className="panel-header"><h3>Inquiry inbox</h3><span>{loading ? 'Loading…' : `${inquiries.length} inquiries`}</span></div>
      {loading ? <LoadingRows /> : inquiries.length === 0 ? <div className="empty-state"><strong>No inquiries yet</strong>Submissions from the public landing page will appear here.</div> :
        <div className="table-wrap"><table className="data-table inquiry-table"><thead><tr><th>Received</th><th>Business</th><th>Contact</th><th>Message</th><th>Status</th><th></th></tr></thead><tbody>
          {inquiries.map(inquiry => <tr key={inquiry._id}>
            <td>{new Date(inquiry.createdAt).toLocaleDateString()}<small>{new Date(inquiry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></td>
            <td><b>{inquiry.business}</b><small>{inquiry.businessType}</small></td>
            <td><b>{inquiry.name}</b><a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>{inquiry.phone && <a href={`tel:${inquiry.phone.replace(/[^\d+]/g, '')}`}>{inquiry.phone}</a>}</td>
            <td><div className="inquiry-message">{inquiry.message}</div></td>
            <td><select className="inquiry-status" aria-label={`Inquiry status for ${inquiry.business}`} value={inquiry.status} disabled={pending === inquiry._id} onChange={event => updateStatus(inquiry, event.target.value)}>{INQUIRY_STATUSES.map(status => <option key={status} value={status}>{INQUIRY_STATUS_LABELS[status]}</option>)}</select></td>
            <td>{!['converted', 'archived'].includes(inquiry.status) && <button className="button primary" type="button" onClick={() => onUseInquiry(inquiry)}>Create store</button>}</td>
          </tr>)}
        </tbody></table></div>}
    </section>
  </>;
}

const emptyBranding = { logoUrl: '', heroImageUrl: '', brandColor: '', tagline: '', city: '' };
const brandingFrom = tenant => ({
  logoUrl: tenant?.logoUrl || '',
  heroImageUrl: tenant?.heroImageUrl || '',
  brandColor: tenant?.brandColor || '',
  tagline: tenant?.tagline || '',
  city: tenant?.city || '',
});

function BrandingEditor({ isSuper }) {
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [form, setForm] = useState(emptyBranding);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      if (isSuper) {
        const result = await api('/super/tenants');
        setStores(result);
        const selected = result.find(store => store._id === selectedStoreId) || result[0];
        setSelectedStoreId(selected?._id || '');
        setForm(brandingFrom(selected));
      } else {
        const result = await api('/staff/me');
        setForm(brandingFrom(result.tenant));
      }
    } catch (err) { setError(errorText(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const selectStore = id => {
    setSelectedStoreId(id);
    setForm(brandingFrom(stores.find(store => store._id === id)));
    setMessage(''); setError('');
  };

  const save = async event => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const path = isSuper ? `/super/tenants/${selectedStoreId}/branding` : '/staff/store/branding';
      const updated = await api(path, { method: 'PATCH', body: form });
      setForm(brandingFrom(updated));
      if (isSuper) setStores(current => current.map(store => store._id === updated._id ? updated : store));
      setMessage('Store branding saved.');
    } catch (err) { setError(errorText(err)); }
    finally { setSaving(false); }
  };

  const noStores = isSuper && !loading && stores.length === 0;
  return <>
    <div className="page-heading"><div><h2>Store branding</h2><p>Set the logo, colors, and storefront images for this brand.</p></div></div>
    <ErrorBanner onRetry={load}>{error}</ErrorBanner>
    {message && <div className="status-message" role="status">{message}</div>}
    {loading ? <section className="panel"><LoadingRows count={3} /></section> : noStores ?
      <section className="panel"><div className="empty-state"><strong>No stores yet</strong>Create a store in Store management before setting its branding.</div></section> : <>
      {isSuper && <label className="field branding-store-picker">Choose a store<select value={selectedStoreId} onChange={event => selectStore(event.target.value)}>{stores.map(store => <option key={store._id} value={store._id}>{store.name} · /{store.slug}</option>)}</select></label>}
      <section className="panel branding-panel">
        <div className="panel-header"><h3>{isSuper ? stores.find(store => store._id === selectedStoreId)?.name : 'Your store'}</h3><span>Optional fields</span></div>
        <form className="branding-form" onSubmit={save}>
          <div className="form-grid">
            <label className="field">Logo image URL<input type="text" maxLength={500} inputMode="url" value={form.logoUrl} onChange={event => setForm({ ...form, logoUrl: event.target.value })} placeholder="/demo/your-store/logo.svg" /><small>Use a local path or HTTPS URL.</small></label>
            <label className="field">Hero image URL<input type="text" maxLength={500} inputMode="url" value={form.heroImageUrl} onChange={event => setForm({ ...form, heroImageUrl: event.target.value })} placeholder="/demo/your-store/hero.svg" /><small>Shown below the store header.</small></label>
            <label className="field">Brand color<div className="brand-color-input"><input type="color" value={/^#[0-9a-fA-F]{6}$/.test(form.brandColor) ? form.brandColor : '#b63f2c'} aria-label="Choose brand color" onChange={event => setForm({ ...form, brandColor: event.target.value })} /><input type="text" maxLength={7} pattern="#[0-9a-fA-F]{6}" value={form.brandColor} onChange={event => setForm({ ...form, brandColor: event.target.value })} placeholder="#b63f2c (optional)" /></div></label>
            <label className="field">Tagline<input type="text" maxLength={120} value={form.tagline} onChange={event => setForm({ ...form, tagline: event.target.value })} placeholder="Fresh from our kitchen" /></label>
            <label className="field">City<input type="text" maxLength={80} value={form.city} onChange={event => setForm({ ...form, city: event.target.value })} placeholder="Karachi" /></label>
          </div>
          {(form.logoUrl || form.heroImageUrl) && <div className="branding-previews">
            {form.logoUrl && <img src={assetUrl(form.logoUrl)} alt="Logo preview" width="72" height="72" loading="lazy" />}
            {form.heroImageUrl && <img src={assetUrl(form.heroImageUrl)} alt="Hero preview" width="320" height="100" loading="lazy" />}
          </div>}
          <div className="form-actions"><button className="button primary" disabled={saving || (isSuper && !selectedStoreId)}>{saving ? 'Saving…' : 'Save branding'}</button><span className="form-note">Customers will see these settings on this store’s page.</span></div>
        </form>
      </section>
    </>}
  </>;
}

function OrderBoard({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all');
  const knownOrderIds = useRef(null);
  const soundEnabledRef = useRef(false);
  const audioContextRef = useRef(null);

  const loadOrders = async ({ manual = false } = {}) => {
    if (manual) setRefreshing(true);
    setError('');
    try {
      const result = await api('/staff/orders');
      const currentIds = new Set(result.map(order => String(order._id)));
      if (knownOrderIds.current) {
        const arrivals = result.filter(order => !knownOrderIds.current.has(String(order._id)));
        if (arrivals.length) {
          setNewOrderAlert(`${arrivals.length} new ${arrivals.length === 1 ? 'order has' : 'orders have'} arrived.`);
          if (soundEnabledRef.current) playOrderSound(audioContextRef.current);
        }
      }
      knownOrderIds.current = currentIds;
      setOrders(result);
      setLastUpdated(new Date());
    }
    catch (err) { setError(errorText(err)); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => {
    loadOrders();
    const interval = setInterval(() => loadOrders(), 15000);
    return () => {
      clearInterval(interval);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
    };
  }, []);

  const toggleSound = () => {
    if (soundEnabled) {
      soundEnabledRef.current = false;
      setSoundEnabled(false);
      return;
    }
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current ||= new AudioContextClass();
        playOrderSound(audioContextRef.current);
      }
    } catch { /* Keep the order board usable if audio is unavailable. */ }
    soundEnabledRef.current = true;
    setSoundEnabled(true);
  };

  const updateStatus = async (order, status) => {
    setPending(order._id); setError('');
    try {
      const updated = await api(`/staff/orders/${order._id}`, { method: 'PATCH', body: { status } });
      setOrders(current => current.map(item => item._id === order._id ? updated : item));
    } catch (err) { setError(errorText(err)); }
    finally { setPending(''); }
  };

  const filteredOrders = orders.filter(order =>
    (statusFilter === 'all' || order.status === statusFilter) &&
    (fulfillmentFilter === 'all' || (order.fulfillmentType || 'delivery') === fulfillmentFilter));
  const visibleStatuses = statusFilter === 'all' ? ORDER_STATUSES : [statusFilter];

  return <>
    <div className="page-heading order-page-heading"><div><h2>Order board</h2><p>Track incoming orders and move them through each stage.</p><div className="sync-note">Auto refresh every 15 seconds{lastUpdated && ` · Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}</div></div><div className="order-actions"><button className={`button ${soundEnabled ? 'sound-active' : ''}`} onClick={toggleSound} aria-pressed={soundEnabled}>{soundEnabled ? '♫ Sound on' : '♫ Enable sound'}</button><button className="button" onClick={() => loadOrders({ manual: true })} disabled={loading || refreshing}>{refreshing ? 'Refreshing…' : 'Refresh now'}</button></div></div>
    <ErrorBanner onRetry={loadOrders}>{error}</ErrorBanner>
    {newOrderAlert && <div className="order-alert" role="status"><span><b>New order</b> {newOrderAlert}</span><button className="alert-dismiss" aria-label="Dismiss new order alert" onClick={() => setNewOrderAlert('')}>&times;</button></div>}
    <div className="order-filters">
      <label>Status<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{ORDER_STATUSES.map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
      <label>Fulfillment<select value={fulfillmentFilter} onChange={event => setFulfillmentFilter(event.target.value)}><option value="all">Delivery and pickup</option><option value="delivery">Delivery</option><option value="pickup">Pickup</option></select></label>
    </div>
    {loading ? <section className="panel"><LoadingRows /></section> : orders.length === 0 ? <section className="panel"><div className="empty-state"><strong>No orders yet</strong>New customer orders will appear here.</div></section> : filteredOrders.length === 0 ? <section className="panel"><div className="empty-state"><strong>No matching orders</strong>Change the status or fulfillment filters to see more orders.</div></section> :
      <div className="order-board">{visibleStatuses.map(status => {
        const laneOrders = filteredOrders.filter(order => order.status === status);
        return <section className="order-lane" key={status}>
          <div className="lane-heading"><span>{STATUS_LABELS[status]}</span><span className="lane-count">{laneOrders.length}</span></div>
          {laneOrders.map(order => <article className="order-card" key={order._id}>
            <div className="order-card-top"><b>#{String(order._id).slice(-6).toUpperCase()}</b><span className={`status-pill status-${order.status}`}>{STATUS_LABELS[order.status] || order.status}</span></div>
            <div className="order-customer"><b>{order.customer?.name || 'Customer'}</b><span>{order.customer?.phone || 'No phone'}</span></div>
            <div className="order-items">{order.items?.map((item, index) => <div className="order-detail" key={`${item.name}-${index}`}><span>{item.qty} × {item.name}</span><b>{money(item.price * item.qty)}</b></div>)}</div>
            <div className="order-fulfillment"><b>{(order.fulfillmentType || 'delivery') === 'pickup' ? 'Pickup' : 'Delivery'}</b>
              {(order.fulfillmentType || 'delivery') === 'pickup' ? <><span>{order.pickupBranch?.name || 'Branch not specified'}</span><span>{order.pickupBranch?.address}</span></> : <><span>{order.deliveryArea?.name || 'Area not specified'}</span><span>{order.customer?.address}</span></>}
            </div>
            <div className="order-card-top" style={{ marginTop: 9 }}><span className="order-detail">{order.paymentMethod === 'cod' ? (order.fulfillmentType === 'pickup' ? 'Cash at pickup' : 'Cash on delivery') : 'Card'}</span><span className="order-total">{money(order.total)}</span></div>
            {(order.fulfillmentType || 'delivery') === 'delivery' && Number(order.deliveryFee || 0) > 0 && <div className="order-delivery-fee">Delivery fee {money(order.deliveryFee)}</div>}
            <select aria-label={`Update order ${order._id} status`} value={order.status} disabled={pending === order._id} onChange={event => updateStatus(order, event.target.value)}>
              {ORDER_STATUSES.map(value => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
            </select>
          </article>)}
        </section>;
      })}</div>}
  </>;
}

function ProductManager() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', category: '', description: '', price: '', imageUrl: '' });
  const [editingId, setEditingId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadProducts = async () => {
    setLoading(true); setError('');
    try { setProducts(await api('/staff/menu')); }
    catch (err) { setError(errorText(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadProducts(); }, []);

  const saveProduct = async event => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    const body = { ...form, price: Number(form.price) };
    try {
      if (editingId) await api(`/staff/menu/${editingId}`, { method: 'PATCH', body });
      else await api('/staff/menu', { method: 'POST', body });
      setForm({ name: '', category: '', description: '', price: '', imageUrl: '' }); setEditingId('');
      setMessage(editingId ? 'Product updated.' : 'Product added.');
      await loadProducts();
    } catch (err) { setError(errorText(err)); }
    finally { setSaving(false); }
  };

  const editProduct = product => {
    setEditingId(product._id);
    setForm({ name: product.name || '', category: product.category || '', description: product.description || '', price: product.price ?? '', imageUrl: product.imageUrl || '' });
    document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleAvailability = async product => {
    setPending(product._id); setError(''); setMessage('');
    try {
      await api(`/staff/menu/${product._id}`, { method: 'PATCH', body: { available: !product.available } });
      setProducts(current => current.map(item => item._id === product._id ? { ...item, available: !item.available } : item));
    } catch (err) { setError(errorText(err)); }
    finally { setPending(''); }
  };

  const visibleProducts = products.filter(product => `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase()));

  return <>
    <div className="page-heading"><div><h2>Products</h2><p>Add products, organize categories, and control what customers can order.</p></div></div>
    <ErrorBanner onRetry={loadProducts}>{error}</ErrorBanner>
    {message && <div className="status-message" role="status">{message}</div>}
    <section className="panel" id="product-form" style={{ marginBottom: 17 }}>
      <div className="panel-header"><h3>{editingId ? 'Edit product' : 'Add a product'}</h3><span>Prices are shown in Rs</span></div>
      <form style={{ padding: 18 }} onSubmit={saveProduct}>
        <div className="form-grid">
          <label className="field">Product name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Product name" /></label>
          <label className="field">Category<input required value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} placeholder="For example, Meals" /></label>
          <label className="field">Price in Rs<input required type="number" min="0" step="1" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} placeholder="0" /></label>
          <label className="field">Description<input value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="A short product description" /></label>
          <label className="field">Product image URL<input type="text" maxLength={500} inputMode="url" value={form.imageUrl} onChange={event => setForm({ ...form, imageUrl: event.target.value })} placeholder="/demo/your-store/products/item.svg" /><small>Use a local path or HTTPS URL.</small></label>
        </div>
        <div className="form-actions"><button className="button primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add product'}</button>{editingId && <button className="button" type="button" onClick={() => { setEditingId(''); setForm({ name: '', category: '', description: '', price: '', imageUrl: '' }); }}>Cancel</button>}</div>
      </form>
    </section>
    <section className="panel">
      <div className="panel-header"><h3>Product list</h3><span>{loading ? 'Loading…' : `${products.length} products`}</span></div>
      <div className="toolbar"><input className="toolbar-input" aria-label="Search products" placeholder="Search products or categories" value={query} onChange={event => setQuery(event.target.value)} /><button className="button" onClick={loadProducts} disabled={loading}>Refresh</button></div>
      {loading ? <LoadingRows /> : products.length === 0 ? <div className="empty-state"><strong>No products yet</strong>Add your first product using the form above.</div> : visibleProducts.length === 0 ? <div className="empty-state"><strong>No matching products</strong>Try a different search.</div> :
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Available</th><th></th></tr></thead><tbody>
          {visibleProducts.map(product => <tr key={product._id}>
            <td><div className="store-ident">{product.imageUrl ? <img className="admin-product-image" src={assetUrl(product.imageUrl)} alt="" width="48" height="48" loading="lazy" /> : <div className="product-image-placeholder">□</div>}<div><b>{product.name}</b>{product.description && <small>{product.description}</small>}</div></div></td>
            <td>{product.category || 'Other'}</td><td><b>{money(product.price)}</b></td>
            <td><Toggle checked={product.available} disabled={pending === product._id} label={`${product.available ? 'Available' : 'Unavailable'}: ${product.name}`} onChange={() => toggleAvailability(product)} /></td>
            <td><button className="button" onClick={() => editProduct(product)}>Edit</button></td>
          </tr>)}
        </tbody></table></div>}
    </section>
  </>;
}

function StaffManagement() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'manager' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadUsers = async () => {
    setLoading(true); setError('');
    try { setUsers(await api('/staff/users')); }
    catch (err) { setError(errorText(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadUsers(); }, []);

  const createUser = async event => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      await api('/staff/users', { method: 'POST', body: form });
      setForm({ name: '', email: '', password: '', role: 'manager' });
      setMessage('Staff account created. Share the sign-in details with your team member.');
      await loadUsers();
    } catch (err) { setError(errorText(err)); }
    finally { setSaving(false); }
  };

  return <>
    <div className="page-heading"><div><h2>Staff</h2><p>Add team members to help manage orders and daily store operations.</p></div></div>
    <ErrorBanner onRetry={loadUsers}>{error}</ErrorBanner>
    {message && <div className="status-message" role="status">{message}</div>}
    <section className="panel" style={{ marginBottom: 17 }}>
      <div className="panel-header"><h3>Add a team member</h3><span>They will have access based on their role</span></div>
      <form style={{ padding: 18 }} onSubmit={createUser}>
        <div className="form-grid">
          <label className="field">Full name<input required autoComplete="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Team member name" /></label>
          <label className="field">Email address<input required type="email" autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="teammate@example.com" /></label>
          <label className="field">Temporary password<input required type="password" autoComplete="new-password" minLength={6} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="At least 6 characters" /></label>
          <label className="field">Role<select value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}>{ROLES.filter(item => item.role !== 'owner').map(item => <option value={item.role} key={item.role}>{item.label}</option>)}</select></label>
        </div>
        <div className="form-actions"><button className="button primary" disabled={saving}>{saving ? 'Adding…' : 'Add staff member'}</button><span className="form-note">Staff can sign in with their email and password.</span></div>
      </form>
    </section>
    <section className="panel">
      <div className="panel-header"><h3>Team members</h3><span>{loading ? 'Loading…' : `${users.length} accounts`}</span></div>
      {loading ? <LoadingRows /> : users.length === 0 ? <div className="empty-state"><strong>No team members yet</strong>Add a staff account above to get started.</div> :
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>
          {users.map(member => <tr key={member._id || member.id}><td><b>{member.name}</b></td><td>{member.email}</td><td><span className="role-pill">{member.role?.replace('_', ' ')}</span></td></tr>)}
        </tbody></table></div>}
    </section>
  </>;
}

const VIEW_META = {
  stores: { title: 'Store management', caption: 'Manage tenants and platform features' },
  inquiries: { title: 'Business inquiries', caption: 'Review prospective stores and follow up' },
  branding: { title: 'Store branding', caption: 'Customize the storefront appearance' },
  orders: { title: 'Orders', caption: 'Keep every order moving' },
  products: { title: 'Product manager', caption: 'Manage your catalog' },
  staff: { title: 'Staff', caption: 'Manage people who help run your store' },
  fulfillment: { title: 'Delivery & pickup', caption: 'Manage service areas and pickup branches' },
};

export default function Home({ storeSlug = '' }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [checking, setChecking] = useState(true);
  const [view, setView] = useState('orders');
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      setChecking(true);
      try {
        const saved = localStorage.getItem('user');
        if (!saved || !localStorage.getItem('token')) { location.href = storeSlug ? `/${storeSlug}/login` : '/login'; return; }
        const parsed = JSON.parse(saved);
        if (storeSlug) {
          if (parsed.role !== 'super_admin' && parsed.tenantSlug && parsed.tenantSlug !== storeSlug) {
            localStorage.removeItem('token'); localStorage.removeItem('user');
            location.href = `/${storeSlug}/login`; return;
          }
          const result = await api('/staff/me');
          if (!result.tenant || (parsed.role !== 'super_admin' && result.tenant.slug !== storeSlug)) {
            localStorage.removeItem('token'); localStorage.removeItem('user');
            location.href = `/${storeSlug}/login`; return;
          }
          if (active) { setTenant(result.tenant); setUser(parsed); setView('orders'); }
        } else if (parsed.role !== 'super_admin') {
          if (parsed.tenantSlug) { location.href = `/${parsed.tenantSlug}`; return; }
          const result = await api('/staff/me');
          if (result.tenant?.slug) { location.href = `/${result.tenant.slug}`; return; }
          location.href = '/login'; return;
        } else if (active) { setUser(parsed); setView('stores'); }
      } catch {
        if (storeSlug) location.href = `/${storeSlug}/login`;
        else location.href = '/login';
      } finally { if (active) setChecking(false); }
    };
    initialize();
    return () => { active = false; };
  }, [storeSlug]);

  if (checking || !user) return <main className="login-page"><div className="login-card"><div className="skeleton" /></div></main>;

  const isSuper = user.role === 'super_admin';
  const platformSuper = isSuper && !storeSlug;
  const portalSuper = isSuper && !!storeSlug;
  const canManageProducts = ['owner', 'manager'].includes(user.role) || portalSuper;
  const canManageStaff = user.role === 'owner' || portalSuper;
  const canManageFulfillment = ['owner', 'manager'].includes(user.role) || portalSuper;
  const nav = platformSuper ? [{ id: 'stores', label: 'Stores', icon: 'S' }, { id: 'inquiries', label: 'Inquiries', icon: 'I' }, { id: 'branding', label: 'Branding', icon: 'B' }] : [
    { id: 'orders', label: 'Orders', icon: 'O' },
    ...(canManageProducts ? [{ id: 'products', label: 'Products', icon: 'P' }] : []),
    ...(canManageFulfillment ? [{ id: 'fulfillment', label: 'Delivery & pickup', icon: 'D' }] : []),
    ...(canManageStaff ? [{ id: 'staff', label: 'Staff', icon: 'T' }, { id: 'branding', label: 'Branding', icon: 'B' }] : []),
  ];
  const activeView = nav.some(item => item.id === view) ? view : nav[0].id;
  const meta = VIEW_META[activeView];
  const signOut = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); location.href = storeSlug ? `/${storeSlug}/login` : '/login'; };
  const brandColor = /^#[0-9a-f]{6}$/i.test(tenant?.brandColor || '') ? tenant.brandColor : '#315a40';
  const appStyle = storeSlug ? { '--store-brand': brandColor } : undefined;

  return <div className={`admin-app ${storeSlug ? 'branded-portal' : ''}`} style={appStyle}>
    <aside className="sidebar">
      <div className="admin-brand">
        <div className="admin-brand-mark">{storeSlug && tenant?.logoUrl ? <img src={assetUrl(tenant.logoUrl)} alt="" /> : storeSlug ? (tenant?.name?.slice(0, 1)?.toUpperCase() || 'S') : 'S'}</div>
        <div className="admin-brand-name">{storeSlug ? tenant?.name || storeSlug : 'Storecraft'}<span>{storeSlug ? 'STORE ADMIN' : 'COMMERCE PLATFORM'}</span></div>
      </div>
      <div className="nav-label">Workspace</div>
      <nav className="admin-nav" aria-label="Main navigation">{nav.map(item => <button className={`nav-button ${activeView === item.id ? 'active' : ''}`} key={item.id} onClick={() => setView(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav>
      {portalSuper && <a className="super-admin-link" href="/">Back to super admin</a>}
      <div className="sidebar-bottom"><div className="profile-chip"><div className="avatar">{user.name?.slice(0, 1)?.toUpperCase() || 'U'}</div><div className="profile-copy"><b>{user.name || 'Account'}</b><span>{user.role?.replace('_', ' ')}</span></div></div><button className="signout" onClick={signOut}>Sign out</button></div>
    </aside>
    <main className="admin-main">
      <header className="topbar"><div><h1 className="topbar-title">{meta.title}</h1><div className="topbar-caption">{meta.caption}</div></div><div className="topbar-right"><span className="live-dot" />{storeSlug ? tenant?.name : 'Account active'}</div></header>
      <div className="content">{activeView === 'stores' ? <SuperAdmin initialInquiry={selectedInquiry} onInquiryCreated={() => setSelectedInquiry(null)} /> : activeView === 'inquiries' ? <InquiryInbox onUseInquiry={inquiry => { setSelectedInquiry(inquiry); setView('stores'); }} /> : activeView === 'branding' ? <BrandingEditor isSuper={platformSuper} /> : activeView === 'products' ? <ProductManager /> : activeView === 'staff' ? <StaffManagement /> : activeView === 'fulfillment' ? <FulfillmentSettings canToggleFeatures={user.role === 'owner' || portalSuper} /> : <OrderBoard user={user} />}</div>
    </main>
  </div>;
}
