const m = require('mongoose');
const S = m.Schema, id = { type: S.Types.ObjectId, ref: 'Tenant', index: true };
const isSafeImageUrl = value => !value || (value.startsWith('/') && !value.startsWith('//')) || /^https:\/\/[^\s]+$/i.test(value);
const DEFAULT_FEATURES = { onlineOrdering: true, cod: true, cardPayments: false, coupons: false, loyalty: false, reviews: false, tableQr: false, delivery: true, pickup: true };
const DeliveryArea = new S({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  deliveryFee: { type: Number, required: true, min: 0, default: 0 },
  minimumOrder: { type: Number, required: true, min: 0, default: 0 },
  enabled: { type: Boolean, default: true },
}, { _id: true });
const PickupBranch = new S({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  address: { type: String, required: true, trim: true, maxlength: 500 },
  phone: { type: String, required: true, trim: true, maxlength: 40 },
  openingHours: { type: String, required: true, trim: true, maxlength: 160 },
  enabled: { type: Boolean, default: true },
}, { _id: true });
const Tenant = m.model('Tenant', new S({
  name: String, slug: { type: String, unique: true, lowercase: true },
  logoUrl: { type: String, trim: true, maxlength: 500, validate: isSafeImageUrl },
  heroImageUrl: { type: String, trim: true, maxlength: 500, validate: isSafeImageUrl },
  brandColor: { type: String, trim: true, maxlength: 7, validate: value => !value || /^#[0-9a-f]{6}$/i.test(value) },
  tagline: { type: String, trim: true, maxlength: 120 },
  city: { type: String, trim: true, maxlength: 80 },
  demoSeedKey: { type: String, select: false },
  active: { type: Boolean, default: true },
  features: { type: Object, default: () => ({ ...DEFAULT_FEATURES }) },
  deliveryAreas: { type: [DeliveryArea], default: () => [] },
  pickupBranches: { type: [PickupBranch], default: () => [] },
  storeHours: { type: Object }, // weekly opening hours; empty means always open
}, { timestamps: true }));
const User = m.model('User', new S({
  tenantId: id, name: String, email: { type: String, unique: true, lowercase: true }, password: String,
  demoSeedKey: { type: String, select: false },
  role: { type: String, enum: ['super_admin', 'owner', 'manager', 'cashier', 'kitchen', 'rider'] } }));
const MenuItem = m.model('MenuItem', new S({
  tenantId: id, name: String, category: String, description: String, price: Number,
  imageUrl: { type: String, trim: true, maxlength: 500, validate: isSafeImageUrl },
  demoSeedKey: { type: String, select: false },
  available: { type: Boolean, default: true } }));
const Order = m.model('Order', new S({
  tenantId: id, items: [{ name: String, price: Number, qty: Number }], total: Number,
  customer: { name: String, phone: String, address: String },
  paymentMethod: { type: String, enum: ['cod', 'card'] },
  fulfillmentType: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },
  deliveryArea: { name: String },
  pickupBranch: { name: String, address: String, phone: String, openingHours: String },
  deliveryFee: { type: Number, min: 0, default: 0 },
  demoSeedKey: { type: String, select: false },
  status: { type: String, enum: ['new', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'], default: 'new' } }, { timestamps: true }));
const Inquiry = m.model('Inquiry', new S({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  business: { type: String, required: true, trim: true, maxlength: 160 },
  businessType: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, trim: true, maxlength: 40, default: '' },
  message: { type: String, required: true, trim: true, maxlength: 3000 },
  status: { type: String, enum: ['new', 'contacted', 'converted', 'archived'], default: 'new', index: true },
}, { timestamps: true }));
module.exports = { Tenant, User, MenuItem, Order, Inquiry, DEFAULT_FEATURES };
