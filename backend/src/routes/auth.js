const r = require('express').Router(), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const { User, Tenant } = require('../models');
r.post('/login', async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) return res.status(400).json({ error: 'Wrong email or password' });
  let tenant = null;
  if (req.body.storeSlug) {
    tenant = await Tenant.findOne({ slug: req.body.storeSlug, active: true });
    if (!tenant) return res.status(404).json({ error: 'This store portal could not be found.' });
    if (u.role === 'super_admin') return res.status(403).json({ error: 'Use the super admin sign-in at /login, then open this store from Store management.' });
    if (!u.tenantId || String(u.tenantId) !== String(tenant._id)) return res.status(403).json({ error: 'This account belongs to another store. Please sign in using that store’s portal.' });
  } else {
    if (u.role !== 'super_admin') return res.status(403).json({ error: 'Store staff must sign in through their store’s portal.' });
    tenant = u.tenantId ? await Tenant.findById(u.tenantId).select('slug') : null;
  }
  const user = { id: u._id, name: u.name, role: u.role, tenantId: u.tenantId, tenantSlug: tenant?.slug || '' };
  res.json({ token: jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' }), user }); });
module.exports = r;
