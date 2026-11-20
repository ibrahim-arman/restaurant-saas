const r = require('express').Router();
const { Inquiry } = require('../models');

const attemptsByIp = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function overLimit(ip) {
  const now = Date.now();
  const current = attemptsByIp.get(ip);
  if (!current || current.expiresAt <= now) {
    attemptsByIp.set(ip, { count: 1, expiresAt: now + WINDOW_MS });
    if (attemptsByIp.size > 10000) {
      for (const [key, value] of attemptsByIp) {
        if (value.expiresAt <= now) attemptsByIp.delete(key);
        if (attemptsByIp.size <= 9000) break;
      }
      while (attemptsByIp.size > 10000) attemptsByIp.delete(attemptsByIp.keys().next().value);
    }
    return false;
  }
  current.count += 1;
  return current.count > MAX_ATTEMPTS;
}

r.post('/', async (req, res) => {
  const { website, name, business, businessType, email, phone, message } = req.body || {};
  // Quietly accept honeypot submissions without storing them.
  if (typeof website === 'string' && website.trim()) return res.status(201).json({ ok: true });
  if (overLimit(req.ip || req.socket.remoteAddress || 'unknown')) {
    return res.status(429).json({ error: 'Too many inquiries from this connection. Please try again later.' });
  }

  const inquiry = {
    name: typeof name === 'string' ? name.trim() : '',
    business: typeof business === 'string' ? business.trim() : '',
    businessType: typeof businessType === 'string' ? businessType.trim() : '',
    email: typeof email === 'string' ? email.trim().toLowerCase() : '',
    phone: typeof phone === 'string' ? phone.trim() : '',
    message: typeof message === 'string' ? message.trim() : '',
  };
  if (!inquiry.name || inquiry.name.length > 120 || !inquiry.business || inquiry.business.length > 160 ||
      !inquiry.businessType || inquiry.businessType.length > 80 || !EMAIL_PATTERN.test(inquiry.email) ||
      inquiry.email.length > 254 || inquiry.phone.length > 40 || !inquiry.message || inquiry.message.length > 3000) {
    return res.status(400).json({ error: 'Please check the required fields and try again.' });
  }

  try {
    const saved = await Inquiry.create(inquiry);
    return res.status(201).json({ ok: true, id: saved._id });
  } catch (error) {
    return res.status(500).json({ error: 'We could not save your inquiry. Please try again.' });
  }
});

module.exports = r;
