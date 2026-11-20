'use client';

import { useState } from 'react';

const PARTNER_EMAIL = process.env.NEXT_PUBLIC_PARTNER_EMAIL || '';
const PARTNER_WHATSAPP = (process.env.NEXT_PUBLIC_PARTNER_WHATSAPP || '').replace(/\D/g, '');
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const EMPTY_INQUIRY = { name: '', business: '', email: '', phone: '', businessType: 'Food & restaurant', message: '', website: '' };

export default function Home() {
  const [slug, setSlug] = useState('');
  const [storeError, setStoreError] = useState('');
  const [form, setForm] = useState(EMPTY_INQUIRY);
  const [contactError, setContactError] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  const openStore = event => {
    event.preventDefault();
    const value = slug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(value)) {
      setStoreError('Enter a store URL using letters, numbers, or hyphens.');
      return;
    }
    location.href = `/${value}`;
  };

  const submitInquiry = async event => {
    event.preventDefault();
    setContactError('');
    setContactMessage('');
    setSubmittingInquiry(true);
    try {
      const response = await fetch(`${API_URL}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'We could not send your inquiry. Please try again.');
      setForm(EMPTY_INQUIRY);
      setContactMessage('Thanks for reaching out. Your inquiry has been sent to our team.');
    } catch (error) {
      setContactError(error.message || 'We could not send your inquiry. Please try again.');
    } finally {
      setSubmittingInquiry(false);
    }
  };

  return <main className="platform-page">
    <header className="platform-nav">
      <a className="platform-logo" href="#top" aria-label="Storecraft home"><span className="platform-logo-mark">S</span><span>Storecraft</span></a>
      <nav className="platform-nav-links" aria-label="Main navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#for-businesses">Who it’s for</a>
        <a href="#contact">Contact</a>
      </nav>
      <a className="platform-nav-cta" href="#contact">Talk to our team <span>↗</span></a>
    </header>

    <section className="platform-hero" id="top">
      <div className="platform-hero-copy">
        <div className="platform-kicker"><span /> MADE FOR AMBITIOUS LOCAL BUSINESSES</div>
        <h1>Your business,<br /><em>ready for online.</em></h1>
        <p>Launch your own online store, serve customers across Pakistan, and manage orders with a team that’s always in sync.</p>
        <div className="platform-hero-actions"><a className="platform-button platform-button-dark" href="#contact">Let’s work together <span>→</span></a><a className="platform-text-link" href="#how-it-works">See how it works <span>↓</span></a></div>
        <div className="platform-trust"><div className="trust-avatars"><span>K</span><span>+</span><span>Y</span></div><span>One platform for your whole operation</span></div>
      </div>

      <div className="platform-hero-art" aria-label="Illustration of an online store dashboard">
        <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
        <div className="art-spark spark-one">✳</div><div className="art-spark spark-two">✦</div>
        <div className="store-preview">
          <div className="preview-top"><span className="preview-logo">S</span><div><b>Your store</b><small>Open for orders</small></div><span className="preview-dots">•••</span></div>
          <div className="preview-banner"><span>YOUR BRAND<br /><b>YOUR WAY</b></span><div className="preview-sun" /></div>
          <div className="preview-label"><b>Popular today</b><span>View all</span></div>
          <div className="preview-product"><div className="preview-product-image product-image-one">✳</div><div><b>Made for your customers</b><small>From your product catalog</small></div><strong>Rs 1,250</strong></div>
          <div className="preview-product"><div className="preview-product-image product-image-two">✿</div><div><b>Easy to order</b><small>Checkout in a few taps</small></div><strong>Rs 890</strong></div>
          <div className="preview-order"><span className="order-check">✓</span><div><b>New order received</b><small>Your team is on it</small></div><span className="order-time">just now</span></div>
        </div>
        <div className="floating-card floating-card-top"><span className="floating-icon">↗</span><div><b>One simple link</b><small>Your store, online</small></div></div>
        <div className="floating-card floating-card-bottom"><span className="floating-icon green">✓</span><div><b>Team in sync</b><small>Orders kept moving</small></div></div>
      </div>
      <div className="hero-bottom-note"><span>BUILT FOR PAKISTAN</span><span>01 — ONLINE STORE &nbsp; · &nbsp; 02 — TEAM TOOLS &nbsp; · &nbsp; 03 — CUSTOMER ORDERS</span></div>
    </section>

    <section className="platform-proof" id="for-businesses">
      <div className="proof-intro"><span className="platform-kicker">ONE PLATFORM, MANY POSSIBILITIES</span><h2>Built around the way<br />your business works.</h2></div>
      <div className="proof-copy"><p>From food brands to fashion, beauty to everyday essentials, give your business a dedicated storefront and the tools your team needs to serve customers well.</p><a href="#contact">Find your fit <span>→</span></a></div>
    </section>

    <section className="platform-features">
      <article className="feature-card feature-card-dark"><span className="feature-number">01 / YOUR STORE</span><div className="feature-visual visual-store"><div className="visual-phone"><div className="phone-notch"/><div className="phone-brand">YOUR BRAND</div><div className="phone-cover"/><div className="phone-lines"><i/><i/><i/></div><div className="phone-button">Browse products</div></div></div><h3>A storefront that feels like you.</h3><p>Your own link, your products, and a shopping experience shaped around your brand.</p></article>
      <article className="feature-card feature-card-sage"><span className="feature-number">02 / YOUR TEAM</span><div className="feature-visual visual-team"><div className="team-board"><div className="board-heading">Today’s orders <span>•••</span></div><div className="board-order"><i className="dot dot-blue"/><div><b>Order #2048</b><small>New · 3 products</small></div><span>Rs 2,450</span></div><div className="board-order"><i className="dot dot-gold"/><div><b>Order #2047</b><small>Preparing · 2 products</small></div><span>Rs 1,100</span></div><div className="board-team"><span>AM</span><span>SK</span><span>+2</span><small>Your team, in sync</small></div></div></div><h3>Everyone knows what’s next.</h3><p>Give owners and staff the right tools to keep products and orders moving.</p></article>
      <article className="feature-card feature-card-peach"><span className="feature-number">03 / YOUR GROWTH</span><div className="feature-visual visual-growth"><div className="growth-card"><span>Orders this week</span><b>Growing together</b><div className="growth-bars"><i/><i/><i/><i/><i/><i/><i/></div><div className="growth-labels"><span>MON</span><span>WED</span><span>FRI</span><span>SUN</span></div></div><div className="growth-star">✳</div></div><h3>Room to grow, built in.</h3><p>Start with the essentials, then shape your online business as it grows.</p></article>
    </section>

    <section className="platform-how" id="how-it-works">
      <div className="how-heading"><span className="platform-kicker">GETTING STARTED IS SIMPLE</span><h2>From first conversation<br />to first order.</h2></div>
      <div className="how-steps"><article><span>01</span><h3>Tell us about your business</h3><p>Share what you sell and how your team works today.</p></article><article><span>02</span><h3>We set up your storefront</h3><p>We’ll help shape your store and get your products online.</p></article><article><span>03</span><h3>Start serving customers</h3><p>Share your store link and manage new orders with your team.</p></article></div>
    </section>

    <section className="platform-contact" id="contact">
      <div className="contact-copy"><span className="platform-kicker">LET’S BUILD SOMETHING GOOD</span><h2>Ready to bring<br />your business online?</h2><p>Tell us a little about your business. Our team will get back to you to talk through the next steps.</p><div className="contact-aside"><span className="contact-aside-mark">↗</span><span>Pakistan-based businesses<br /><b>Start a conversation with us</b></span></div>
        {(PARTNER_EMAIL || PARTNER_WHATSAPP) && <div className="contact-direct-links" aria-label="Direct contact options">
          {PARTNER_EMAIL && <a href={`mailto:${PARTNER_EMAIL}`}>Email us <span aria-hidden="true">↗</span></a>}
          {PARTNER_WHATSAPP && <a href={`https://wa.me/${PARTNER_WHATSAPP}`} target="_blank" rel="noreferrer">WhatsApp us <span aria-hidden="true">↗</span></a>}
        </div>}
      </div>
      <form className="contact-form" onSubmit={submitInquiry}>
        <div className="contact-form-heading"><b>Tell us about your business</b><span>Your inquiry will go to our team for review.</span></div>
        <div className="contact-honeypot" aria-hidden="true"><label>Leave this field empty<input tabIndex="-1" autoComplete="off" value={form.website} onChange={event => setForm({ ...form, website: event.target.value })} /></label></div>
        <div className="contact-form-grid">
          <label className="contact-field">Your name<input required maxLength={120} autoComplete="name" placeholder="Full name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
          <label className="contact-field">Business name<input required maxLength={160} autoComplete="organization" placeholder="Your business" value={form.business} onChange={event => setForm({ ...form, business: event.target.value })} /></label>
          <label className="contact-field">Work email<input required maxLength={254} type="email" autoComplete="email" placeholder="you@business.com" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
          <label className="contact-field">Phone or WhatsApp<input type="tel" maxLength={40} inputMode="tel" autoComplete="tel" placeholder="+92 3xx xxxxxxx" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></label>
          <label className="contact-field contact-field-full">What kind of business do you run?<select value={form.businessType} onChange={event => setForm({ ...form, businessType: event.target.value })}><option>Food & restaurant</option><option>Fashion & clothing</option><option>Beauty & wellness</option><option>Retail & grocery</option><option>Other</option></select></label>
          <label className="contact-field contact-field-full">Anything else we should know?<textarea required maxLength={3000} rows="3" placeholder="Tell us what you’re looking for…" value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} /></label>
        </div>
        {contactError && <p className="contact-error" role="alert">{contactError}</p>}
        {contactMessage && <p className="contact-success" role="status">{contactMessage}</p>}
        <button className="contact-submit" type="submit" disabled={submittingInquiry}>{submittingInquiry ? 'Sending…' : 'Send an inquiry'} <span>→</span></button>
        <small className="contact-privacy">Your details will only be used to respond to your inquiry.</small>
      </form>
    </section>

    <section className="store-finder-strip"><div><b>Already shopping with us?</b><span>Go straight to your favorite store.</span></div><form className="finder-form" onSubmit={openStore}><label className="sr-only" htmlFor="store-slug">Store URL</label><span>store/</span><input id="store-slug" value={slug} onChange={event => { setSlug(event.target.value); setStoreError(''); }} placeholder="your-store" /><button type="submit">Visit store <span>→</span></button></form>{storeError && <p className="finder-error" role="alert">{storeError}</p>}</section>

    <footer className="platform-footer"><a className="platform-logo" href="#top"><span className="platform-logo-mark">S</span><span>Storecraft</span></a><span>Helping local businesses grow online.</span><a href="#contact">Get in touch ↗</a><small>© {new Date().getFullYear()} Storecraft</small></footer>
  </main>;
}
