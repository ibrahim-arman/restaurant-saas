// Super admin only: create restaurants and flip their feature switches
const r = require('express').Router(), bcrypt = require('bcryptjs');
const { auth, can } = require('../middleware/auth');
const { Tenant, User, Inquiry, DEFAULT_FEATURES } = require('../models');
r.use(auth, can('*'));
r.get('/tenants', async (q, s) => {
  const tenants = await Tenant.find().sort('-createdAt');
  s.json(tenants.map(tenant => ({ ...tenant.toObject(), features: { ...DEFAULT_FEATURES, ...(tenant.features || {}) } })));
});
r.get('/inquiries', async (req, res) => {
  try { res.json(await Inquiry.find().sort('-createdAt').limit(200)); }
  catch { res.status(500).json({ error: 'Could not load inquiries. Please try again.' }); }
});
r.patch('/inquiries/:id/status', async (req, res) => {
  const allowed = ['new', 'contacted', 'converted', 'archived'];
  if (!/^[a-f\d]{24}$/i.test(req.params.id) || !allowed.includes(req.body?.status)) {
    return res.status(400).json({ error: 'Invalid inquiry or status.' });
  }
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found.' });
    res.json(inquiry);
  } catch { res.status(500).json({ error: 'Could not update inquiry status. Please try again.' }); }
});
r.patch('/tenants/:id/branding', async (req, res) => {
  const fields = ['logoUrl', 'heroImageUrl', 'brandColor', 'tagline', 'city'];
  const updates = {};
  for (const field of fields) {
    if (typeof req.body?.[field] !== 'string') return res.status(400).json({ error: 'Please check the store branding fields.' });
    updates[field] = req.body[field].trim();
  }
  try {
    const tenant = await Tenant.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!tenant) return res.status(404).json({ error: 'Store not found.' });
    res.json(tenant);
  } catch { res.status(400).json({ error: 'Please check the image URLs, brand color, and field lengths.' }); }
});
r.post('/tenants', async (req, res) => {
  const { name, slug, ownerEmail, ownerPassword } = req.body;
  try {
    const t = await Tenant.create({ name, slug });
    await User.create({ tenantId: t._id, name: name + ' Owner', email: ownerEmail, role: 'owner', password: await bcrypt.hash(ownerPassword, 10) });
    res.json(t);
  } catch (e) { res.status(400).json({ error: 'Slug or email already used' }); } });
r.patch('/tenants/:id/features', async (req, res) => {
  const allowed = Object.keys(DEFAULT_FEATURES);
  if (!allowed.includes(req.body?.key) || typeof req.body?.value !== 'boolean') return res.status(400).json({ error: 'Choose a valid feature and on/off value.' });
  const t = await Tenant.findByIdAndUpdate(req.params.id, { $set: { ['features.' + req.body.key]: req.body.value } }, { new: true, runValidators: true });
  res.json(t); });
r.patch('/tenants/:id/active', async (req, res) => res.json(await Tenant.findByIdAndUpdate(req.params.id, { active: !!req.body.value }, { new: true })));
module.exports = r;
