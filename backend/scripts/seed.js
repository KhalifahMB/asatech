import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import config from '../src/config/index.js';

dotenv.config();

const demoProducts = [
  // Smartphones
  {
    name: 'Aurora X1 Pro 5G',
    slug: 'aurora-x1-pro',
    category: 'smartphones',
    price: 1250000,
    previousPrice: 1400000,
    stock: 18,
    rating: 4.8,
    ratingCount: 214,
    badge: 'Best Seller',
    featured: true,
    images: ['/images/phone-1.jpg'],
    short: 'Flagship 5G smartphone with a pro-grade camera system.',
    description:
      'The Aurora X1 Pro pairs a vivid high-refresh display with a versatile triple-camera system and fast charging.',
    specs: [
      { label: 'Display', value: '6.7" AMOLED, 120Hz' },
      { label: 'Storage', value: '256 GB' },
      { label: 'Memory', value: '12 GB RAM' },
      { label: 'Battery', value: '5,000 mAh' },
    ],
  },
  {
    name: 'Aurora X1',
    slug: 'aurora-x1',
    category: 'smartphones',
    price: 899000,
    stock: 34,
    rating: 4.6,
    ratingCount: 187,
    featured: true,
    images: ['/images/phone-2.jpg'],
    short: 'Balanced everyday flagship with dependable performance.',
    description:
      'The Aurora X1 delivers smooth day-to-day performance, a bright display and solid cameras.',
    specs: [
      { label: 'Display', value: '6.5" AMOLED, 120Hz' },
      { label: 'Storage', value: '256 GB' },
      { label: 'Memory', value: '8 GB RAM' },
    ],
  },
  // Laptops
  {
    name: 'Vertex Ultra 14',
    slug: 'vertex-ultra-14',
    category: 'laptops',
    price: 2150000,
    previousPrice: 2350000,
    stock: 12,
    rating: 4.8,
    ratingCount: 121,
    badge: 'Best Seller',
    featured: true,
    images: ['/images/laptop-1.jpg'],
    short: 'Thin, light and powerful ultrabook for demanding workflows.',
    description:
      'The Vertex Ultra 14 combines a high-resolution display with a lightweight aluminium chassis.',
    specs: [
      { label: 'Display', value: '14" 2.8K, 90Hz' },
      { label: 'Memory', value: '16 GB RAM' },
      { label: 'Storage', value: '1 TB SSD' },
      { label: 'Weight', value: '1.29 kg' },
    ],
  },
  {
    name: 'Vertex Air 13',
    slug: 'vertex-air-13',
    category: 'laptops',
    price: 1480000,
    stock: 9,
    rating: 4.7,
    ratingCount: 88,
    featured: true,
    images: ['/images/laptop-2.jpg'],
    short: 'Featherweight laptop with all-day battery for portability.',
    description:
      'Vertex Air 13 is engineered for portability with exceptional battery life.',
    specs: [
      { label: 'Display', value: '13.3" QHD' },
      { label: 'Memory', value: '16 GB RAM' },
      { label: 'Storage', value: '512 GB SSD' },
      { label: 'Weight', value: '1.12 kg' },
    ],
  },
  // Tablets
  {
    name: 'Slate Tab 11',
    slug: 'slate-tab-11',
    category: 'tablets',
    price: 720000,
    stock: 22,
    rating: 4.6,
    ratingCount: 93,
    featured: true,
    images: ['/images/tablet-1.jpg'],
    short: 'Versatile 11-inch tablet for productivity and media.',
    description:
      'Slate Tab 11 pairs a vivid 11-inch display with stylus support.',
    specs: [
      { label: 'Display', value: '11" 2K, 120Hz' },
      { label: 'Storage', value: '128 GB' },
      { label: 'Memory', value: '8 GB RAM' },
    ],
  },
  // Smartwatches
  {
    name: 'Pulse Watch S2',
    slug: 'pulse-watch-s2',
    category: 'smartwatches',
    price: 285000,
    previousPrice: 320000,
    stock: 38,
    rating: 4.5,
    ratingCount: 110,
    badge: 'Deal',
    featured: true,
    images: ['/images/watch-1.jpg'],
    short: 'Everyday smartwatch with health tracking and notifications.',
    description: 'The Pulse Watch S2 tracks activity, heart rate and sleep.',
    specs: [
      { label: 'Display', value: '1.43" AMOLED' },
      { label: 'Battery', value: 'Up to 7 days' },
      { label: 'Water', value: '5 ATM' },
    ],
  },
  // Headphones
  {
    name: 'Aura ANC Over-Ear',
    slug: 'aura-anc-over-ear',
    category: 'headphones',
    price: 215000,
    previousPrice: 260000,
    stock: 25,
    rating: 4.7,
    ratingCount: 168,
    badge: 'Best Seller',
    featured: true,
    images: ['/images/headphone-1.jpg'],
    short: 'Premium over-ear headphones with adaptive noise cancelling.',
    description:
      'Aura ANC combines rich, balanced sound with adaptive noise cancellation.',
    specs: [
      { label: 'Driver', value: '40 mm dynamic' },
      { label: 'Battery', value: 'Up to 40 hours' },
      { label: 'ANC', value: 'Adaptive hybrid' },
    ],
  },
  {
    name: 'Aura Buds Pro',
    slug: 'aura-buds-pro',
    category: 'headphones',
    price: 95000,
    previousPrice: 110000,
    stock: 60,
    rating: 4.6,
    ratingCount: 134,
    badge: 'Deal',
    featured: true,
    images: ['/images/earbud-1.jpg'],
    short: 'True wireless earbuds with active noise cancellation.',
    description:
      'Aura Buds Pro deliver punchy sound with active noise cancellation.',
    specs: [
      { label: 'Driver', value: '11 mm dynamic' },
      { label: 'Battery', value: 'Up to 6h + 24h case' },
      { label: 'ANC', value: 'Yes' },
    ],
  },
  // Chargers
  {
    name: 'Volt GaN 65W',
    slug: 'volt-gan-65w',
    category: 'chargers',
    price: 32000,
    previousPrice: 40000,
    stock: 120,
    rating: 4.7,
    ratingCount: 210,
    badge: 'Deal',
    featured: true,
    images: ['/images/charger-1.jpg'],
    short: 'Compact 65W GaN charger for phones, tablets and laptops.',
    description: 'The Volt GaN 65W delivers fast charging in a compact body.',
    specs: [
      { label: 'Output', value: '65 W max' },
      { label: 'Ports', value: '2x USB-C, 1x USB-A' },
      { label: 'Technology', value: 'GaN' },
    ],
  },
];

async function seedDatabase() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('MongoDB connected for seeding');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists. Skipping admin creation.');
    } else {
      // Create admin user
      try {
        const admin = await User.create({
          name: 'ASATECH Admin',
          email: config.admin.email,
          password: config.admin.password,
          role: 'admin',
          phone: '+2348000000000',
        });
        console.log('✅ Admin user created:', admin.email);
      } catch (error) {
        console.error('❌ Failed to create admin user:', error.message);
      }
    }

    // Check if products already exist
    const existingProducts = await Product.countDocuments();

    if (existingProducts > 0) {
      console.log('⚠️  Products already exist. Skipping product seeding.');
    } else {
      // Seed demo products
      await Product.insertMany(demoProducts);
      console.log(`✅ Seeded ${demoProducts.length} demo products`);
    }

    console.log('\n🎉 Database seeding completed!');
    console.log('\nAdmin credentials:');
    console.log(`  Email: ${config.admin.email}`);
    console.log(`  Password: ${config.admin.password}`);
    console.log('\n⚠️  Change the admin password in production!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedDatabase();
