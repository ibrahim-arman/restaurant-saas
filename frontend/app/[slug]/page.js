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
  if (!response.ok) throw new Error(data.error || 'We could not load this store. Please try again.');
  return data;
}

export default function StorePage({ params }) {
  const { slug } = params;
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [fulfillmentType, setFulfillmentType] = useState('delivery');
  const [deliveryAreaId, setDeliveryAreaId] = useState('');
  const [pickupBranchId, setPickupBranchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      setLoadError(error.message || 'We could not load this store. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStore(); }, [slug]);

  const categories = useMemo(() => {
    return products.reduce((groups, product) => {
      const category = product.category?.trim() || 'Other';
      (groups[category] ||= []).push(product);
      return groups;
    }, {});
  }, [products]);
  const lines = products.filter(product => cart[product._id] > 0);
  const itemCount = lines.reduce((sum, product) => sum + cart[product._id], 0);
  const total = lines.reduce((sum, product) => sum + product.price * cart[product._id], 0);
  const orderingEnabled = store?.features?.onlineOrdering;
  const paymentEnabled = store?.features?.cod || store?.features?.cardPayments;
  const deliveryEnabled = store?.features?.delivery !== false;
  const pickupEnabled = store?.features?.pickup !== false;
  const selectedArea = store?.deliveryAreas?.find(area => area.id === deliveryAreaId);
  const selectedBranch = store?.pickupBranches?.find(branch => branch.id === pickupBranchId);
  const deliveryFee = fulfillmentType === 'delivery' ? Number(selectedArea?.deliveryFee || 0) : 0;
  const orderTotal = total + deliveryFee;
  const minimumOrderMet = fulfillmentType !== 'delivery' || !selectedArea || total >= Number(selectedArea.minimumOrder || 0);
  const brandStyle = themeStyle(store);

  const adjustQuantity = (id, change) => {
    setCart(current => ({ ...current, [id]: Math.max(0, (current[id] || 0) + change) }));
    setOrderError('');
    setConfirmation('');
  };

  const goToCheckout = () => document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const submitOrder = async event => {
    event.preventDefault();
    if (!lines.length || submitting) return;
    setSubmitting(true);
    setOrderError('');
    setConfirmation('');
    try {
      const response = await fetch(`${API}/r/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map(product => ({ id: product._id, qty: cart[product._id] })),
          customer,
          paymentMethod,
          fulfillmentType,
          deliveryAreaId: fulfillmentType === 'delivery' ? deliveryAreaId : undefined,
          pickupBranchId: fulfillmentType === 'pickup' ? pickupBranchId : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Your order could not be placed. Please try again.');
      setConfirmation(`Order received. Your total is ${money(data.total)}.`);
      setCart({});
      setCustomer({ name: '', phone: '', address: '' });
    } catch (error) {
      setOrderError(error.message || 'Your order could not be placed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className="store-shell" style={brandStyle} aria-live="polite">
    <div className="store-topline"><b>STORE</b><span>Loading your store</span></div>
    <div className="store-header"><div className="brand-mark" /><div className="store-title"><div className="skeleton" style={{ width: 210, height: 26 }} /><p>One moment, please…</p></div></div>
    <div className="loading-state"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
  </main>;

  if (loadError) return <main className="store-shell" style={brandStyle}>
    <div className="store-topline"><b>STORE</b><span>Online shopping</span></div>
    <header className="store-header"><div className="brand-mark">!</div><div className="store-title"><h1>We could not open this store</h1><p>Check your connection and try again.</p></div></header>
    <div className="error-message" role="alert">{loadError}</div>
    <button className="primary-button" style={{ marginTop: 14, maxWidth: 220 }} onClick={loadStore}>Try again</button>
  </main>;

  return <main className="store-shell" style={brandStyle}>
    <div className="store-topline"><b>SHOP LOCAL</b><span>Simple ordering, delivered to you</span></div>
    <header className="store-header">
      <div className="brand-mark" aria-label={`${store.name} logo`}>
        {store.logoUrl ? <img src={store.logoUrl} alt={store.name} width="76" height="76" loading="lazy" decoding="async" /> : store.name?.slice(0, 1)?.toUpperCase() || 'S'}
      </div>
      <div className="store-title">
        <h1>{store.name}</h1>
        <p>{store.tagline || 'Good things, made easy.'}</p>
        <div className="store-meta"><span className="meta-chip">{store.city || 'Local store'}</span><span className="meta-chip">Secure order details</span></div>
      </div>
    </header>

    {store.heroImageUrl && <div className="store-hero"><img src={store.heroImageUrl} alt="" width="1200" height="360" loading="lazy" decoding="async" /><span>{store.city || store.name}</span></div>}

    {!orderingEnabled && <p className="notice" role="status">Online ordering is currently unavailable. Please check back soon.</p>}

    <div className="catalog-layout">
      <section aria-label="Products">
        <h2 className="catalog-heading">Explore products</h2>
        {products.length === 0 ? <div className="empty-state"><strong>No products available yet</strong>This store will add products here soon.</div> :
          Object.entries(categories).map(([category, categoryProducts]) => <section className="category-section" key={category}>
            <h3 className="category-heading">{category}</h3>
            <div className="product-list">
              {categoryProducts.map(product => <article className="product-card" key={product._id}>
                {product.imageUrl && <img className="product-image" src={product.imageUrl} alt="" width="400" height="300" loading="lazy" decoding="async" />}
                <div className="product-info"><h3>{product.name}</h3>{product.description && <p>{product.description}</p>}<div className="product-price">{money(product.price)}</div></div>
                {orderingEnabled && <div className="quantity-control" aria-label={`Quantity for ${product.name}`}>
                  <button type="button" onClick={() => adjustQuantity(product._id, -1)} aria-label={`Remove one ${product.name}`} disabled={!cart[product._id]}>−</button>
                  <span>{cart[product._id] || 0}</span>
                  <button type="button" onClick={() => adjustQuantity(product._id, 1)} aria-label={`Add one ${product.name}`}>+</button>
                </div>}
              </article>)}
            </div>
          </section>)}
      </section>

      <aside className="checkout-column">
        <section className="checkout-card" id="checkout">
          <h2>Your order</h2>
          <p>Review your items and choose delivery or pickup.</p>
          {lines.length === 0 ? <div className="cart-empty">Your cart is empty.<br />Add a product to get started.</div> : <>
            <div>{lines.map(product => <div className="cart-line" key={product._id}><span>{cart[product._id]} × {product.name}</span><span>{money(product.price * cart[product._id])}</span></div>)}</div>
            <div className="cart-total"><span>Items subtotal</span><span>{money(total)}</span></div>
            {paymentEnabled && orderingEnabled && (deliveryEnabled || pickupEnabled) ? <form className="form-stack" onSubmit={submitOrder}>
              {(deliveryEnabled || pickupEnabled) && <fieldset className="fulfillment-choice">
                <legend>How would you like your order?</legend>
                <div className="fulfillment-options">
                  {deliveryEnabled && <label><input type="radio" name="fulfillmentType" value="delivery" checked={fulfillmentType === 'delivery'} onChange={() => { setFulfillmentType('delivery'); setOrderError(''); }} /> Delivery</label>}
                  {pickupEnabled && <label><input type="radio" name="fulfillmentType" value="pickup" checked={fulfillmentType === 'pickup'} onChange={() => { setFulfillmentType('pickup'); setOrderError(''); }} /> Pickup</label>}
                </div>
              </fieldset>}
              <label className="field-label">Full name<input name="name" autoComplete="name" placeholder="Your name" required value={customer.name} onChange={event => setCustomer({ ...customer, name: event.target.value })} /></label>
              <label className="field-label">Phone number<input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="03xx xxxxxxx" required value={customer.phone} onChange={event => setCustomer({ ...customer, phone: event.target.value })} /></label>
              {fulfillmentType === 'delivery' ? <>
                <label className="field-label">Delivery area<select required value={deliveryAreaId} onChange={event => { setDeliveryAreaId(event.target.value); setOrderError(''); }}>
                  <option value="">Choose your area</option>{(store.deliveryAreas || []).map(area => <option value={area.id} key={area.id}>{area.name} - {money(area.deliveryFee)} delivery</option>)}
                </select></label>
                {store.deliveryAreas?.length ? <>
                  {selectedArea && <div className="fulfillment-info">Delivery fee: <b>{money(deliveryFee)}</b>{selectedArea.minimumOrder > 0 && <span>Minimum order: {money(selectedArea.minimumOrder)}</span>}</div>}
                  {!minimumOrderMet && selectedArea && <p className="error-message" role="alert">Add {money(selectedArea.minimumOrder - total)} more to meet the minimum for {selectedArea.name}.</p>}
                  <label className="field-label">Delivery address<textarea name="address" autoComplete="street-address" placeholder="House, street and nearby landmark" required value={customer.address} onChange={event => setCustomer({ ...customer, address: event.target.value })} /></label>
                </> : <p className="notice">This store has not added any delivery areas yet.</p>}
              </> : <>
                <label className="field-label">Pickup branch<select required value={pickupBranchId} onChange={event => setPickupBranchId(event.target.value)}>
                  <option value="">Choose a branch</option>{(store.pickupBranches || []).map(branch => <option value={branch.id} key={branch.id}>{branch.name}</option>)}
                </select></label>
                {selectedBranch ? <div className="fulfillment-info"><b>{selectedBranch.address}</b><span>{selectedBranch.phone}</span><span>Hours: {selectedBranch.openingHours}</span></div> : <p className="notice">This store has not added any pickup branches yet.</p>}
              </>}
              <label className="field-label">Payment method<select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}>
                {store.features.cod && <option value="cod">{fulfillmentType === 'pickup' ? 'Cash at pickup' : 'Cash on delivery'}</option>}
                {store.features.cardPayments && <option value="card">Card</option>}
              </select></label>
              <div className="cart-total"><span>{fulfillmentType === 'delivery' ? 'Delivery fee' : 'Pickup'}</span><span>{fulfillmentType === 'delivery' ? money(deliveryFee) : 'No fee'}</span></div>
              <div className="cart-total final-total"><span>Order total</span><span>{money(orderTotal)}</span></div>
              {orderError && <p className="error-message" role="alert">{orderError}</p>}
              <button className="primary-button" type="submit" disabled={submitting || (!deliveryEnabled && !pickupEnabled) || (fulfillmentType === 'delivery' ? !selectedArea || !minimumOrderMet : !selectedBranch)}>{submitting ? 'Placing your order…' : `Place order · ${money(orderTotal)}`}</button>
            </form> : <p className="notice">{orderingEnabled && !deliveryEnabled && !pickupEnabled ? 'Delivery and pickup are currently unavailable.' : orderingEnabled ? 'No payment methods are available for this store yet.' : 'Ordering is currently unavailable.'}</p>}
          </>}
          {confirmation && <p className="status-message" role="status">{confirmation}</p>}
        </section>
      </aside>
    </div>

    <footer className="footer-note">A simple, secure way to shop with {store.name}.</footer>
    {orderingEnabled && itemCount > 0 && <div className="mobile-cart-bar">
      <div className="mobile-cart-summary"><b>{money(orderTotal)}</b><span>{itemCount} {itemCount === 1 ? 'item' : 'items'} in your order</span></div>
      <button className="primary-button" type="button" onClick={goToCheckout}>Review order</button>
    </div>}
  </main>;
}
