#!/usr/bin/env node
/**
 * Delete a company and its related records created by
 * `recordCashPayment` and `signupOrUpdateCompany` flows.
 *
 * Deletes: orders, subscriptions, transactions, wallets, payments (if separate),
 * audit trails and the company document itself.
 *
 * Usage:
 *   node scripts/deleteCompanyAndRelated.js <companyId> [--yes] [--mongo <uri>]
 *
 * Examples:
 *   node scripts/deleteCompanyAndRelated.js 60f5a3... --yes
 *   MONGO_URI=mongodb://localhost:27017/support node scripts/deleteCompanyAndRelated.js 60f5a3...
 */

const mongoose = require('mongoose');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/deleteCompanyAndRelated.js <companyId> [--yes] [--mongo <uri>]');
  process.exit(1);
}

const companyId = args[0];
const skipConfirm = args.includes('--yes');
const mongoFlagIndex = args.indexOf('--mongo');
const mongoFromFlag = mongoFlagIndex >= 0 && args[mongoFlagIndex + 1] ? args[mongoFlagIndex + 1] : null;

const MONGO_URI = mongoFromFlag || process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/support_ticket';

async function main() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // require models relative to support-backend folder
  const modelsBase = path.join(__dirname, '..', 'src', 'saas', 'models');
  const Company = require(path.join(modelsBase, 'company.model'));
  const orderModel = require(path.join(modelsBase, 'order.model'));
  const subscriptionModel = require(path.join(modelsBase, 'subscription.model'));
  const transactionModel = require(path.join(modelsBase, 'transaction.model'));
  const walletModel = require(path.join(modelsBase, 'wallet.model'));
  const auditTrailModel = require(path.join(modelsBase, 'auditTrail.model'));
  let paymentModel = null;
  try {
    paymentModel = require(path.join(modelsBase, 'payment.model'));
  } catch (err) {
    // paymentModel may not exist as separate collection; it's optional
  }

  // basic validation
  const company = await Company.findById(companyId).lean();
  if (!company) {
    console.error('Company not found:', companyId);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('Preparing to delete company and related records for:', companyId, company.name || '');

  if (!skipConfirm) {
    // ask for interactive confirmation
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(res => rl.question('Type DELETE to confirm: ', a => { rl.close(); res(a); }));
    if (answer !== 'DELETE') {
      console.log('Aborted by user. To skip confirmation use --yes');
      await mongoose.disconnect();
      process.exit(0);
    }
  }

  try {
    // Normalize companyId to ObjectId when possible
    const companyObjectId = mongoose.Types.ObjectId.isValid(companyId)
      ? new mongoose.Types.ObjectId(companyId)
      : companyId;

    // Delete orders (includes embedded payments stored on orders)
    const ordersRes = await orderModel.deleteMany({ companyId: companyObjectId });

    // Delete subscriptions
    const subsRes = await subscriptionModel.deleteMany({ companyId: companyObjectId });

    // Delete transactions
    const txRes = await transactionModel.deleteMany({ companyId: companyObjectId });

    // Delete wallets
    const walletRes = await walletModel.deleteMany({ companyId: companyObjectId });

    // Delete any standalone payment documents if model exists
    let paymentRes = { deletedCount: 0 };
    if (paymentModel) {
      paymentRes = await paymentModel.deleteMany({ companyId: companyObjectId });
    }

    // Delete audit trails linked to company
    const auditRes = await auditTrailModel.deleteMany({ companyId: companyObjectId });

    // Finally delete company
    const companyRes = await Company.deleteOne({ _id: companyObjectId });

    console.log('Deletion summary:');
    console.log('  orders deleted:', ordersRes?.deletedCount ?? ordersRes?.n ?? 'unknown');
    console.log('  subscriptions deleted:', subsRes?.deletedCount ?? subsRes?.n ?? 'unknown');
    console.log('  transactions deleted:', txRes?.deletedCount ?? txRes?.n ?? 'unknown');
    console.log('  wallets deleted:', walletRes?.deletedCount ?? walletRes?.n ?? 'unknown');
    console.log('  payments deleted:', paymentRes?.deletedCount ?? paymentRes?.n ?? 0);
    console.log('  audit trails deleted:', auditRes?.deletedCount ?? auditRes?.n ?? 'unknown');
    console.log('  company deleted:', companyRes?.deletedCount ?? companyRes?.n ?? 'unknown');

    console.log('\nDone. Disconnecting...');
  } catch (err) {
    console.error('Error during deletion:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
