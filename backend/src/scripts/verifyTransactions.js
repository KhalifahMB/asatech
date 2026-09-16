#!/usr/bin/env node

/**
 * Verify and reconcile all unsettled transactions against Paystack.
 *
 * Usage (npm, from repo root):
 *   node backend/src/scripts/verifyTransactions.js [--limit=200]
 *
 * Requires MONGODB_URI and PAYSTACK_SECRET_KEY in the environment (or a .env).
 * Safe to run multiple times — only transactions still in pending/processing
 * are touched; already-settled ones are skipped automatically.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
dotenv.config({ path: path.resolve(path.dirname(__filename), '../../.env') });

import mongoose from 'mongoose';
import { verifyUnsettledTransactions } from '../services/paymentVerification.js';

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) || 200 : 200;

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    console.error('PAYSTACK_SECRET_KEY is not set. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const summary = await verifyUnsettledTransactions({ limit });

  console.log(JSON.stringify(summary, null, 2));
  console.log(
    `\nSync complete — scanned: ${summary.scanned}, successful: ${summary.successful}, failed: ${summary.failed}, errors: ${summary.errors}`
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Sync failed:', err.message || err);
  process.exit(1);
});