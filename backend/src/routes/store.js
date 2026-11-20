// Public customer API: /api/r/:slug/...
const r = require('express').Router({ mergeParams: true });
const { feature } = require('../middleware/auth');
const { MenuItem, Order } = require('../models');
r.get('/', (req, res) => res.json({
  name: req.tenant.name,
  features: req.tenant.features,
  logoUrl: req.tenant.logoUrl || '',
  heroImageUrl: req.tenant.heroImageUrl || '',
  brandColor: req.tenant.brandColor || '',
  tagline: req.tenant.tagline || '',
  city: req.tenant.city || '',
  deliveryAreas: (req.tenant.deliveryAreas || []).filter(area => area.enabled).map(area => ({ id: area._id, name: area.name, deliveryFee: area.deliveryFee, minimumOrder: area.minimumOrder })),
  pickupBranches: (req.tenant.pickupBranches || []).filter(branch => branch.enabled).map(branch => ({ id: branch._id, name: branch.name, address: branch.address, phone: branch.phone, openingHours: branch.openingHours })),
}));
r.get('/menu', async (req, res) => res.json(await MenuItem.find({ tenantId: req.tenant._id, available: true })));
r.post('/orders', feature('onlineOrdering'), async (req, res) => {
  const { items = [], customer, paymentMethod, fulfillmentType = 'delivery', deliveryAreaId, pickupBranchId } = req.body;
  const pm = { cod: 'cod', card: 'cardPayments' }[paymentMethod];
  if (!pm || !req.tenant.features[pm]) return res.status(400).json({ error: 'Payment method not available' });
  const customerName = typeof customer?.name === 'string' ? customer.name.trim() : '';
  const customerPhone = typeof customer?.phone === 'string' ? customer.phone.trim() : '';
  const customerAddress = typeof customer?.address === 'string' ? customer.address.trim() : '';
  if (!customerName || !customerPhone) return res.status(400).json({ error: 'Enter your name and phone number.' });
  if (!['delivery', 'pickup'].includes(fulfillmentType)) return res.status(400).json({ error: 'Choose delivery or pickup.' });
  const db = await MenuItem.find({ _id: { $in: items.map(i => i.id) }, tenantId: req.tenant._id, available: true });
  const lines = items.map(i => { const d = db.find(x => String(x._id) === i.id); return d && { name: d.name, price: d.price, qty: Math.max(1, +i.qty || 1) }; }).filter(Boolean);
  if (!lines.length) return res.status(400).json({ error: 'Cart is empty' });
  // Prices and fulfillment charges come from the database, never from the browser.
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  let deliveryFee = 0, deliveryArea, pickupBranch;
  if (fulfillmentType === 'delivery') {
    if (!req.tenant.features.delivery) return res.status(400).json({ error: 'Delivery is not available for this store.' });
    if (!customerAddress) return res.status(400).json({ error: 'Enter your delivery address.' });
    deliveryArea = req.tenant.deliveryAreas.id(deliveryAreaId);
    if (!deliveryArea?.enabled) return res.status(400).json({ error: 'Choose an available delivery area.' });
    if (subtotal < deliveryArea.minimumOrder) return res.status(400).json({ error: `The minimum order for ${deliveryArea.name} is Rs ${deliveryArea.minimumOrder.toLocaleString('en-PK')}.` });
    deliveryFee = deliveryArea.deliveryFee;
  } else {
    if (!req.tenant.features.pickup) return res.status(400).json({ error: 'Pickup is not available for this store.' });
    pickupBranch = req.tenant.pickupBranches.id(pickupBranchId);
    if (!pickupBranch?.enabled) return res.status(400).json({ error: 'Choose an available pickup branch.' });
  }
  const total = subtotal + deliveryFee;
  const o = await Order.create({
    tenantId: req.tenant._id, items: lines, customer: { name: customerName, phone: customerPhone, address: fulfillmentType === 'delivery' ? customerAddress : '' },
    paymentMethod, fulfillmentType,
    ...(deliveryArea && { deliveryArea: { name: deliveryArea.name } }),
    ...(pickupBranch && { pickupBranch: { name: pickupBranch.name, address: pickupBranch.address, phone: pickupBranch.phone, openingHours: pickupBranch.openingHours } }),
    deliveryFee, total,
  });
  res.json({ orderId: o._id, subtotal, deliveryFee, total }); });
module.exports = r;
