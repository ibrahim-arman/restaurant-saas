require('dotenv').config();
const mongoose = require('mongoose'), bcrypt = require('bcryptjs'); const { User } = require('./models');
(async () => { await mongoose.connect(process.env.MONGO_URI);
  await User.updateOne({ email: process.env.SUPER_EMAIL.toLowerCase() }, { name: 'Super Admin', role: 'super_admin', password: await bcrypt.hash(process.env.SUPER_PASSWORD, 10) }, { upsert: true });
  console.log('Super admin ready'); process.exit(); })();
