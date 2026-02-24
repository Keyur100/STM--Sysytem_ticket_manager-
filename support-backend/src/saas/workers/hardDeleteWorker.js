const Company = require('../models/company.model');
const subscriptionModel = require('../models/subscription.model');
const orderModel = require('../models/order.model');
const transactionModel = require('../models/transaction.model');
const walletModel = require('../models/wallet.model');
const auditTrailModel = require('../models/auditTrail.model');
const branchModel = require('../models/branch.model');
const clientUserModel = require('../models/clientUser.model');

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = Number(process.env.SOFT_DELETE_RETENTION_DAYS || 30);

async function runHardDelete() {
  const cutoff = Date.now() - RETENTION_DAYS * DAY_MS;
  console.log('HardDeleteWorker: running. Deleting companies soft-deleted before', new Date(cutoff).toISOString());

  const companies = await Company.find({ isDeleted: true, deletedAt: { $lte: cutoff } }).lean();
  for (const c of companies) {
    try {
      const cid = c._id;
      const results = await Promise.all([
        subscriptionModel.deleteMany({ companyId: cid }),
        orderModel.deleteMany({ companyId: cid }),
        transactionModel.deleteMany({ companyId: cid }),
        walletModel.deleteMany({ companyId: cid }),
        auditTrailModel.deleteMany({ companyId: cid }),
        branchModel.deleteMany({ companyId: cid }),
        clientUserModel.deleteMany({ companyId: cid }),
        Company.deleteOne({ _id: cid }),
      ]);
      console.log(`HardDeleteWorker: permanently removed company ${cid}. Results:`, results.map(r => r.deletedCount || r.n || r));
    } catch (err) {
      console.error('HardDeleteWorker: error deleting company', c._id, err);
    }
  }

  console.log('HardDeleteWorker: completed');
}

module.exports = { runHardDelete };

if (require.main === module) {
  runHardDelete().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(2); });
}
