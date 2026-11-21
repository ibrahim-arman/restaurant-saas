'use client';

import { useEffect, useMemo, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const money = value => `Rs ${Number(value || 0).toLocaleString('en-PK')}`;

function themeStyle(store) {
  const color = /^#[0-9a-f]{6}$/i.test(store?.brandColor || '') ? store.brandColor : '#b63f2c';
  const rgb = color.slice(1).match(/.{2}/g).map(part => parseInt(part, 16));
  const linear = rgb.map(part => {
    const channel = part / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  const darkContrast = (luminance + 0.05) / 0.05;
  const lightContrast = 1.05 / (luminance + 0.05);
  const contrast = darkContrast >= lightContrast ? '#111111' : '#ffffff';
  const soft = `#${rgb.map(part => Math.round(part * 0.12 + 255 * 0.88).toString(16).padStart(2, '0')).join('')}`;
  return { '--brand': color, '--brand-contrast': contrast, '--soft-brand': soft };
}

async function getData(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'We could not load this store.');
  return data;
}

export default function StorePage({ params }) {
  const { slug } = params;
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState({});
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [fulfillmentType, setFulfillmentType] = useState('delivery');
  const [deliveryAreaId, setDeliveryAreaId] = useState('');
  const [pickupBranchId, setPickupBranchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const loadStore = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [storeData, productData] = await Promise.all([
        getData(`${API}/r/${slug}`),
        getData(`${API}/r/${slug}/menu`),
      ]);
      setStore(storeData);
      setProducts(productData);
      if (!storeData.features?.cod && storeData.features?.cardPayments) setPaymentMethod('card');
      setFulfillmentType(storeData.features?.delivery === false ? 'pickup' : 'delivery');
      setDeliveryAreaId(storeData.deliveryAreas?.[0]?.id || '');
      setPickupBranchId(storeData.pickupBranches?.[0]?.id || '');
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStore(); }, [slug]);

  const filteredProducts = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return products;
    return products.filter(p => p.name.toLowerCase().includes(query) || p.category?.toLowerCase().includes(query));
  }, [products, search]);

  const categories = useMemo(() => {
    return filteredProducts.reduce((groups, product) => {
      const category = product.category?.trim() || 'Other';
      (groups[category] ||= []).push(product);
      return groups;
    }, {});
  }, [filteredProducts]);

  const cartLines = products.filter(p => cart[p._id] > 0);
  const cartItemCount = cartLines.reduce((sum, p) => sum + cart[p._id], 0);
  const cartSubtotal = cartLines.reduce((sum, p) => sum + p.price * cart[p._id], 0);
  
  const hours = store?.hours || { open: true };
  const selectedArea = store?.deliveryAreas?.find(a => a.id === deliveryAreaId);
  const selectedBranch = store?.pickupBranches?.find(b => b.id === pickupBranchId);
  const deliveryFee = fulfillmentType === 'delivery' ? Number(selectedArea?.deliveryFee || 0) : 0;
  const orderTotal = cartSubtotal + deliveryFee;
  const minimumOrderMet = fulfillmentType !== 'delivery' || !selectedArea || cartSubtotal >= Number(selectedArea.minimumOrder || 0);

  const adjustQuantity = (id, change) => {
    setCart(curr => ({ ...curr, [id]: Math.max(0, (curr[id] || 0) + change) }));
    setOrderError('');
  };

  const submitOrder = async e => {
    e.preventDefault();
    if (!cartLines.length || submitting || !hours.open) return;
    setSubmitting(true);
    setOrderError('');
    try {
      const res = await fetch(`${API}/r/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartLines.map(p => ({ id: p._id, qty: cart[p._id] })),
          customer,
          paymentMethod,
          fulfillmentType,
          deliveryAreaId: fulfillmentType === 'delivery' ? deliveryAreaId : undefined,
          pickupBranchId: fulfillmentType === 'pickup' ? pickupBranchId : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to place order.');
      setConfirmation(data);
      setCart({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setOrderError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className="store-shell" style={themeStyle(store)} aria-live="polite">
    <div className="store-header"><div className="brand-mark skeleton" /><div className="store-title"><div className="skeleton" style={{ width: 200, height: 32 }} /><div className="skeleton" style={{ width: 150, height: 20, marginTop: 8 }} /></div></div>
    <div className="product-list"><div className="skeleton" style={{ height: 120 }} /><div className="skeleton" style={{ height: 120 }} /><div className="skeleton" style={{ height: 120 }} /></div>
  </main>;

  if (loadError) return <main className="store-shell">
    <div className="notice notice-warning" style={{ marginTop: 40 }}>{loadError}</div>
    <button className="primary-button" style={{ marginTop: 20, width: 'auto' }} onClick={loadStore}>Try again</button>
  </main>;

  if (confirmation) return <main className="store-shell" style={themeStyle(store)}>
    <div className="store-header">
      <div className="brand-mark">{store.logoUrl ? <img src={store.logoUrl} alt="" /> : store.name[0]}</div>
      <div className="store-title"><h1>Order confirmed!</h1><p>Thank you for shopping with {store.name}.</p></div>
    </div>
    <div className="card" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 16px' }}>Order #{confirmation._id?.slice(-6).toUpperCase()}</h2>
      <div className="cart-list">
        {confirmation.items.map((item, i) => <div className="cart-line" key={i}><span>{item.qty} × {item.name}</span><span>{money(item.price * item.qty)}</span></div>)}
      </div>
      <div className="cart-total"><span>Subtotal</span><span>{money(confirmation.total - (confirmation.deliveryFee || 0))}</span></div>
      {confirmation.deliveryFee > 0 && <div className="cart-total"><span>Delivery Fee</span><span>{money(confirmation.deliveryFee)}</span></div>}
      <div className="cart-total final"><span>Total</span><span>{money(confirmation.total)}</span></div>
      <p style={{ marginTop: 24, fontSize: 14, color: '#666' }}>You can track your order status on this page. We recommend bookmarking it.</p>
      <button className="primary-button" style={{ marginTop: 24 }} onClick={() => setConfirmation(null)}>Place another order</button>
    </div>
  </main>;

  const brandStyle = themeStyle(store);

  return <main className="store-shell" style={brandStyle}>
    <div className="store-topline"><b>{store.city || 'Karachi'}</b><span>{hours.open ? 'Open for orders' : 'Closed right now'}</span></div>
    
    <header className="store-header">
      <div className="brand-mark">
        {store.logoUrl ? <img src={store.logoUrl} alt={store.name} width="80" height="80" /> : store.name[0]}
      </div>
      <div className="store-title">
        <h1>{store.name}</h1>
        <p>{store.tagline}</p>
        <div className="store-meta">
          <span className={`meta-chip ${hours.open ? 'badge-open' : 'badge-closed'}`}>{hours.open ? 'OPEN' : 'CLOSED'}</span>
          {hours.todayHours && <span className="meta-chip">{hours.todayHours}</span>}
        </div>
      </div>
    </header>

    {!hours.open && <div className="closed-banner" role="status"><b>{hours.tempClosed ? 'Temporarily closed' : 'Closed right now'}</b><span>{(hours.tempClosed ? hours.message : hours.nextOpen) || 'Please check back later.'} You can browse the menu, but ordering is paused.</span></div>}

    {store.heroImageUrl && <div className="store-hero"><img src={store.heroImageUrl} alt="" /><span>{store.name}</span></div>}

    <nav className="category-bar">
      <a href="#" className="category-link active">All</a>
      {Object.keys(categories).map(cat => <a key={cat} href={`#${cat}`} className="category-link">{cat}</a>)}
    </nav>

    <div className="search-box">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
    </div>

    <div className="catalog-layout">
      <section>
        {Object.entries(categories).map(([category, catProducts]) => (
          <div className="category-section" key={category} id={category}>
            <h2 className="category-heading">{category}</h2>
            <div className="product-list">
              {catProducts.map(p => (
                <article className="product-card" key={p._id}>
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="product-image" width="100" height="100" loading="lazy" decoding="async" /> : <div className="product-image product-image-empty" aria-hidden="true">{store.name?.slice(0, 1)}</div>}
                  <div className="product-info">
                    <h3>{p.name}</h3>
                    <p>{p.description}</p>
                    <div className="product-price">{money(p.price)}</div>
                  </div>
                  <div className="product-actions">
                    {cart[p._id] ? (
                      <div className="quantity-stepper">
                        <button onClick={() => adjustQuantity(p._id, -1)}>−</button>
                        <span>{cart[p._id]}</span>
                        <button onClick={() => adjustQuantity(p._id, 1)}>+</button>
                      </div>
                    ) : (
                      <button className="btn-add" onClick={() => adjustQuantity(p._id, 1)}>Add</button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      <aside className={`checkout-column ${checkoutOpen ? 'is-open' : ''}`} aria-label="Your cart and checkout">
        <div className="checkout-card">
          <div className="checkout-heading"><div><span className="section-kicker">YOUR ORDER</span><h2>Your cart</h2></div><button className="checkout-close" type="button" onClick={() => setCheckoutOpen(false)} aria-label="Close checkout">×</button></div>
          {cartLines.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '40px 0' }}>Your cart is empty</p>
          ) : (
            <>
              <div className="cart-list">
                {cartLines.map(p => (
                  <div className="cart-line" key={p._id}>
                    <span>{cart[p._id]} × {p.name}</span>
                    <span>{money(p.price * cart[p._id])}</span>
                  </div>
                ))}
              </div>
              <div className="cart-total"><span>Subtotal</span><span>{money(cartSubtotal)}</span></div>
              
              <form className="form-stack" onSubmit={submitOrder}>
                <div className="field">
                  <label>Full Name</label>
                  <input required placeholder="Your Name" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} />
                </div>
                <div className="field">
                  <label>Phone Number</label>
                  <input required type="tel" inputMode="tel" autoComplete="tel" pattern="(?:03[0-9]{2}[- ]?[0-9]{7}|\+92\s?3[0-9]{2}[- ]?[0-9]{7})" title="Use 03xx-xxxxxxx or +92 3xx xxxxxxx" placeholder="03xx-xxxxxxx" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} />
                </div>
                <div className="field">
                  <label>Fulfillment</label>
                  <select value={fulfillmentType} onChange={e => setFulfillmentType(e.target.value)}>
                    {store.features.delivery && <option value="delivery">Delivery</option>}
                    {store.features.pickup && <option value="pickup">Pickup</option>}
                  </select>
                </div>

                {fulfillmentType === 'delivery' ? (
                  <>
                    <div className="field">
                      <label>Delivery Area</label>
                      <select required value={deliveryAreaId} onChange={e => setDeliveryAreaId(e.target.value)}>
                        <option value="">Select Area</option>
                        {store.deliveryAreas.map(a => <option key={a.id} value={a.id}>{a.name} (+{money(a.deliveryFee)})</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Address</label>
                      <textarea required placeholder="Full Address" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} />
                    </div>
                  </>
                ) : (
                  <div className="field">
                    <label>Pickup Branch</label>
                    <select required value={pickupBranchId} onChange={e => setPickupBranchId(e.target.value)}>
                      <option value="">Select Branch</option>
                      {store.pickupBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    {selectedBranch && <div className="branch-details"><b>{selectedBranch.address}</b><span>{selectedBranch.phone} · {selectedBranch.openingHours}</span></div>}
                  </div>
                )}

                <div className="cart-total"><span>Delivery Fee</span><span>{money(deliveryFee)}</span></div>
                <div className="cart-total final"><span>Total</span><span>{money(orderTotal)}</span></div>

                {orderError && <div className="error-message">{orderError}</div>}
                
                <button className="primary-button" type="submit" disabled={!hours.open || submitting || !minimumOrderMet}>
                  {submitting ? 'Placing order...' : `Place Order · ${money(orderTotal)}`}
                </button>
                {!minimumOrderMet && <p className="error-message">Minimum order for this area is {money(selectedArea.minimumOrder)}</p>}
              </form>
            </>
          )}
        </div>
      </aside>
    </div>

    <div className={`mobile-cart-bar ${cartItemCount ? 'has-items' : ''}`}>
      <div className="mobile-cart-info">
        <b>{money(orderTotal)}</b>
        <span>{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}</span>
      </div>
      <button className="primary-button" onClick={() => setCheckoutOpen(true)}>Checkout <span aria-hidden="true">→</span></button>
    </div>
    {checkoutOpen && <button className="checkout-backdrop" type="button" aria-label="Close checkout" onClick={() => setCheckoutOpen(false)} />}

    <footer className="footer-note">Powered by Storecraft</footer>
  </main>;
}
