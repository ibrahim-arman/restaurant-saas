// One-time helper: gives popular Karachi areas to every store that has none yet.
// Run from the backend folder:  npm run add:areas
require('dotenv').config();
const mongoose = require('mongoose');
const { Tenant } = require('../src/models');
const { defaultDeliveryAreas } = require('../src/karachiAreas');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const stores = await Tenant.find();
  for (const store of stores) {
    if (store.deliveryAreas && store.deliveryAreas.length) { console.log('Skipped (already has areas):', store.slug); continue; }
    store.deliveryAreas = defaultDeliveryAreas();
    await store.save();
    console.log('Added areas to:', store.slug);
  }
  await mongoose.disconnect();
})().catch(err => { console.error('Failed:', err.message); process.exit(1); });
