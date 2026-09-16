import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import config from '../src/config/index.js';
import { sampleProducts } from '../src/data/sampleProducts.js';

dotenv.config();

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
          emailVerified: true,
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
      // Seed the sample catalogue
      await Product.insertMany(sampleProducts);
      console.log(`✅ Seeded ${sampleProducts.length} sample products`);
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
