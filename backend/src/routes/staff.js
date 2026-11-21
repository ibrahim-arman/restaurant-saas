// Restaurant staff. Every query is locked to the logged-in user's tenantId.
const r = require('express').Router(), bcrypt = require('bcryptjs');
const { auth, can, staffTenant } = require('../middleware/auth');
const { Tenant, User, MenuItem, Order } = require('../models');
const { defaultHours, cleanHours } = require('../hours');
r.use(auth, staffTenant);
r.get('/me', async (req, res) => res.json({ user: req.user, tenant: req.staffTenantId ? await Tenant.findById(req.staffTenantId) : null }));
r.get('/menu', can('menu.view'), async (req, res) => res.json(await MenuItem.find({ tenantId: req.staffTenantId })));
r.post('/menu', can('menu.create'), async (req, res) => res.json(await MenuItem.create({ ...req.body, tenantId: req.staffTenantId })));
r.patch('/menu/:id', can('menu.update'), async (req, res) => {
  const fields = ['name', 'category', 'description', 'price', 'imageUrl', 'available'];
  const updates = Object.fromEntries(fields.filter(field => req.body[field] !== undefined).map(field => [field, req.body[field]]));
  res.json(await MenuItem.findOneAndUpdate({ _id: req.params.id, tenantId: req.staffTenantId }, updates, { new: true, runValidators: true }));
});
r.delete('/menu/:id', can('menu.delete'), async (req, res) => { await MenuItem.deleteOne({ _id: req.params.id, tenantId: req.staffTenantId }); res.json({ ok: true }); });
r.get('/orders', can('orders.view'), async (req, res) => res.json(await Order.find({ tenantId: req.staffTenantId }).sort('-createdAt').limit(100)));
r.patch('/orders/:id', can('orders.update'), async (req, res) => res.json(await Order.findOneAndUpdate({ _id: req.params.id, tenantId: req.staffTenantId }, { status: req.body.status }, { new: true })));
r.patch('/store/branding', can('store.branding.update'), async (req, res) => {
  const fields = ['logoUrl', 'heroImageUrl', 'brandColor', 'tagline', 'city'];
  const updates = {};
  for (const field of fields) {
    if (typeof req.body?.[field] !== 'string') return res.status(400).json({ error: 'Please check the store branding fields.' });
    updates[field] = req.body[field].trim();
  }
  try {
    const tenant = await Tenant.findByIdAndUpdate(req.staffTenantId, updates, { new: true, runValidators: true });
    if (!tenant) return res.status(404).json({ error: 'Store not found.' });
    res.json(tenant);
  } catch { res.status(400).json({ error: 'Please check the image URLs, brand color, and field lengths.' }); }
});
r.get('/users', can('staff.view'), async (req, res) => res.json(await User.find({ tenantId: req.staffTenantId }).select('-password')));
r.post('/users', can('staff.create'), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!['manager', 'cashier', 'kitchen', 'rider'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try { const u = await User.create({ tenantId: req.staffTenantId, name, email, role, password: await bcrypt.hash(password, 10) }); res.json({ id: u._id }); }
  catch { res.status(400).json({ error: 'Email already used' }); } });

const KARACHI_AREAS = ['DHA', 'Clifton', 'Gulshan-e-Iqbal', 'Gulistan-e-Johar', 'North Nazimabad', 'Nazimabad', 'PECHS', 'Bahadurabad', 'Saddar', 'Korangi', 'Malir', 'FB Area'];
const cleanString = value => typeof value === 'string' ? value.trim() : '';
r.get('/fulfillment', can('fulfillment.view'), async (req, res) => {
  const tenant = await Tenant.findById(req.staffTenantId).select('features deliveryAreas pickupBranches');
  if (!tenant) return res.status(404).json({ error: 'Store not found.' });
  res.json({ features: tenant.features || {}, deliveryAreas: tenant.deliveryAreas || [], pickupBranches: tenant.pickupBranches || [], suggestedAreas: KARACHI_AREAS });
});
r.patch('/store/fulfillment-features', can('store.fulfillment.update'), async (req, res) => {
  const { key, value } = req.body || {};
  if (!['delivery', 'pickup'].includes(key) || typeof value !== 'boolean') return res.status(400).json({ error: 'Choose delivery or pickup and provide an on/off value.' });
  const tenant = await Tenant.findById(req.staffTenantId);
  if (!tenant) return res.status(404).json({ error: 'Store not found.' });
  tenant.features = { ...(tenant.features || {}), [key]: value };
  tenant.markModified('features');
  await tenant.save();
  res.json({ features: tenant.features });
});
r.post('/delivery-areas', can('fulfillment.create'), async (req, res) => {
  const name = cleanString(req.body?.name);
  const deliveryFee = Number(req.body?.deliveryFee), minimumOrder = Number(req.body?.minimumOrder);
  if (!name || name.length > 100 || !Number.isFinite(deliveryFee) || deliveryFee < 0 || !Number.isFinite(minimumOrder) || minimumOrder < 0) {
    return res.status(400).json({ error: 'Enter an area name and valid delivery fee and minimum order amounts.' });
  }
  const tenant = await Tenant.findById(req.staffTenantId);
  if (!tenant) return res.status(404).json({ error: 'Store not found.' });
  tenant.deliveryAreas.push({ name, deliveryFee, minimumOrder, enabled: req.body.enabled !== false });
  await tenant.save();
  res.json(tenant.deliveryAreas.at(-1));
});
r.patch('/delivery-areas/:id', can('fulfillment.update'), async (req, res) => {
  const tenant = await Tenant.findById(req.staffTenantId);
  const area = tenant?.deliveryAreas.id(req.params.id);
  if (!area) return res.status(404).json({ error: 'Delivery area not found.' });
  if (req.body.name !== undefined) area.name = cleanString(req.body.name);
  if (req.body.deliveryFee !== undefined) area.deliveryFee = Number(req.body.deliveryFee);
  if (req.body.minimumOrder !== undefined) area.minimumOrder = Number(req.body.minimumOrder);
  if (req.body.enabled !== undefined) area.enabled = !!req.body.enabled;
  try { await tenant.save(); res.json(area); }
  catch { res.status(400).json({ error: 'Check the area name, fee, and minimum order.' }); }
});
r.delete('/delivery-areas/:id', can('fulfillment.delete'), async (req, res) => {
  const tenant = await Tenant.findById(req.staffTenantId);
  const area = tenant?.deliveryAreas.id(req.params.id);
  if (!area) return res.status(404).json({ error: 'Delivery area not found.' });
  area.deleteOne(); await tenant.save(); res.json({ ok: true });
});
r.post('/pickup-branches', can('fulfillment.create'), async (req, res) => {
  const branch = Object.fromEntries(['name', 'address', 'phone', 'openingHours'].map(field => [field, cleanString(req.body?.[field])]));
  if (Object.values(branch).some(value => !value) || branch.name.length > 120 || branch.address.length > 500 || branch.phone.length > 40 || branch.openingHours.length > 160) {
    return res.status(400).json({ error: 'Enter a branch name, full address, phone number, and opening hours.' });
  }
  const tenant = await Tenant.findById(req.staffTenantId);
  if (!tenant) return res.status(404).json({ error: 'Store not found.' });
  tenant.pickupBranches.push({ ...branch, enabled: req.body.enabled !== false });
  await tenant.save();
  res.json(tenant.pickupBranches.at(-1));
});
r.patch('/pickup-branches/:id', can('fulfillment.update'), async (req, res) => {
  const tenant = await Tenant.findById(req.staffTenantId);
  const branch = tenant?.pickupBranches.id(req.params.id);
  if (!branch) return res.status(404).json({ error: 'Pickup branch not found.' });
  for (const field of ['name', 'address', 'phone', 'openingHours']) if (req.body[field] !== undefined) branch[field] = cleanString(req.body[field]);
  if (req.body.enabled !== undefined) branch.enabled = !!req.body.enabled;
  try { await tenant.save(); res.json(branch); }
  catch { res.status(400).json({ error: 'Check the branch name, address, phone, and opening hours.' }); }
});
r.delete('/pickup-branches/:id', can('fulfillment.delete'), async (req, res) => {
  const tenant = await Tenant.findById(req.staffTenantId);
  const branch = tenant?.pickupBranches.id(req.params.id);
  if (!branch) return res.status(404).json({ error: 'Pickup branch not found.' });
  branch.deleteOne(); await tenant.save(); res.json({ ok: true });
});
r.get('/hours', can('hours.view'), async (req, res) => {
  const tenant = req.staffTenantId && await Tenant.findById(req.staffTenantId).select('storeHours');
  if (!tenant) return res.status(404).json({ error: 'Open a store portal to manage its hours.' });
  res.json({ configured: !!tenant.storeHours, hours: tenant.storeHours || defaultHours() });
});
r.patch('/hours', can('hours.update'), async (req, res) => {
  const { hours, error } = cleanHours(req.body);
  if (error) return res.status(400).json({ error });
  const tenant = await Tenant.findByIdAndUpdate(req.staffTenantId, { storeHours: hours }, { new: true });
  if (!tenant) return res.status(404).json({ error: 'Store not found.' });
  res.json({ hours });
});
// Removing the hours makes the store always open again.
r.delete('/hours', can('hours.update'), async (req, res) => {
  await Tenant.findByIdAndUpdate(req.staffTenantId, { $unset: { storeHours: 1 } });
  res.json({ ok: true });
});
module.exports = r;
