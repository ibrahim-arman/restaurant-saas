const jwt = require('jsonwebtoken');
const { Tenant, DEFAULT_FEATURES } = require('../models');
// Role -> permissions. 'x.*' means everything under x. Edit here to customise roles.
const ROLES = {
  super_admin: ['*'],
  owner: ['menu.*', 'orders.*', 'staff.*', 'store.branding.update', 'store.fulfillment.update', 'fulfillment.*', 'hours.*'],
  manager: ['menu.*', 'orders.*', 'fulfillment.*', 'hours.*'],
  cashier: ['orders.view', 'orders.update'],
  kitchen: ['orders.view', 'orders.update'],
  rider: ['orders.view', 'orders.update'] };
const has = (role, p) => (ROLES[role] || []).some(x => x === '*' || x === p || x === p.split('.')[0] + '.*');
exports.ROLES = ROLES;
exports.auth = (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Please log in' }); } };
exports.can = p => (req, res, next) => has(req.user.role, p) ? next() : res.status(403).json({ error: 'Not allowed for your role' });
// Loads the restaurant from the URL slug
exports.tenant = async (req, res, next) => {
  const t = await Tenant.findOne({ slug: req.params.slug, active: true });
  if (!t) return res.status(404).json({ error: 'Restaurant not found' });
  t.features = { ...DEFAULT_FEATURES, ...(t.features || {}) };
  req.tenant = t; next(); };
exports.feature = f => (req, res, next) => (req.tenant.features[f] ? next() : res.status(403).json({ error: `${f} is turned off for this restaurant` }));

// Staff requests normally use the tenant in the signed-in user's token. Super admins
// can choose a tenant from a store portal URL via X-Store-Slug.
exports.staffTenant = async (req, res, next) => {
  try {
    const slug = req.headers['x-store-slug'];
    if (req.user.role === 'super_admin') {
      if (!slug) { req.staffTenantId = null; return next(); }
      const tenant = await Tenant.findOne({ slug, active: true });
      if (!tenant) return res.status(404).json({ error: 'Store portal not found.' });
      req.staffTenantId = tenant._id;
      return next();
    }
    if (slug) {
      const tenant = await Tenant.findOne({ slug, active: true }).select('_id');
      if (!tenant || String(tenant._id) !== String(req.user.tenantId)) {
        return res.status(403).json({ error: 'This portal belongs to another store. Sign in through your own store portal.' });
      }
    }
    req.staffTenantId = req.user.tenantId;
    next();
  } catch { res.status(500).json({ error: 'Could not load this store.' }); }
};
