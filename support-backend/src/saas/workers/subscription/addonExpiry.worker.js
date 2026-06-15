/**
 * Addon Expiry Worker
 * 
 * Purpose:
 * - Find addons that have expired based on durationDays, expiryType
 * - Remove expired addons from company effective state
 * - Mark orders as expired
 * - Call 3rd party API to sync expiry changes
 * 
 * Runs: Every 10 minutes via PM2
 */

const mongoose = require('mongoose');
const Order = require('../../models/order.model');
const Addon = require('../../models/addon.model');
const Company = require('../../models/company.model');
const Subscription = require('../../models/subscription.model');
const { sendSecureRequest } = require('../../services/sync.service');

const WORKER_INTERVAL = 10 * 60 * 1000; // 10 minutes
const BATCH_SIZE = 10;

/**
 * Check if addon has expired based on expiryType and purchase date
 */
function isAddonExpired(addon, order, subscription) {
  try {
    const now = Date.now();
    const purchaseTime = new Date(order.createdAt).getTime();

    if (addon.billingType === 'onetime') {
      // One-time purchases don't expire based on time
      return false;
    }

    // For recurring addons, check expiry type
    if (addon.expiryType === 'duration' && addon.durationDays) {
      const expiryTime = purchaseTime + (addon.durationDays * 24 * 60 * 60 * 1000);
      return now > expiryTime;
    }

    if (addon.expiryType === 'plan_end' && subscription) {
      const planEndTime = new Date(subscription.endAt).getTime();
      return now > planEndTime;
    }

    if (addon.expiryType === 'yearly') {
      const expiryTime = purchaseTime + (365 * 24 * 60 * 60 * 1000);
      return now > expiryTime;
    }

    return false;
  } catch (err) {
    console.error('Error checking addon expiry:', err);
    return false;
  }
}

/**
 * Recompute effective state after removing expired addon
 */
async function recomputeEffectiveState(company) {
  try {
    let effectiveUserLimits = {};
    let effectivePermissions = [];

    // Start with plan userPricing
    if (company.planSnapshot?.userPricing) {
      effectiveUserLimits = { ...effectiveUserLimits, ...company.planSnapshot.userPricing };
    }

    // Start with plan from modulePermissions
    if (company.planSnapshot?.modulePermissions) {
      company.planSnapshot.modulePermissions.forEach(mp => {
        if (mp.limits && typeof mp.limits === 'object') {
          effectiveUserLimits = { ...effectiveUserLimits, ...mp.limits };
        }
        if (mp.actions && Array.isArray(mp.actions)) {
          mp.actions.forEach(action => {
            if (action.enabled) {
              const permissionKey = `${mp.moduleKey}.${action.key}`;
              if (!effectivePermissions.includes(permissionKey)) {
                effectivePermissions.push(permissionKey);
              }
            }
          });
        }
      });
    }

    // Get active (non-expired) addons
    const subscription = await Subscription.findById(company.activeSubscriptionId).lean();
    const addonOrders = await Order.find({
      companyId: company._id,
      orderType: 'ADDON_PURCHASE',
      status: 'paid',
      isDeleted: false,
    }).lean();

    // Key mapping for addon limits
    const keyMapping = {
      'max customers': 'max_customers',
      'max supp': 'max_suppliers',
      'max employees': 'max_employees',
      'max branch': 'max_branch',
      'storagemb': 'storageMB'
    };

    for (const order of addonOrders) {
      if (!order.items) continue;

      for (const item of order.items) {
        if (item.type !== 'addon') continue;

        const addon = await Addon.findById(item.itemId).lean();
        if (!addon) continue;

        // Skip if expired
        if (isAddonExpired(addon, order, subscription)) continue;

        // Add active addon limits
        if (addon.provides?.limits) {
          Object.keys(addon.provides.limits).forEach(limitKey => {
            const normalizedKey = keyMapping[limitKey] || limitKey.replace(/ /g, '_').toLowerCase();
            const limitValue = addon.provides.limits[limitKey];
            if (typeof limitValue === 'number') {
              effectiveUserLimits[normalizedKey] = (effectiveUserLimits[normalizedKey] || 0) + limitValue;
            }
          });
        }

        // Add active addon permissions
        if (addon.provides?.permissions) {
          if (Array.isArray(addon.provides.permissions)) {
            addon.provides.permissions.forEach(perm => {
              if (!effectivePermissions.includes(perm)) {
                effectivePermissions.push(perm);
              }
            });
          }
        }
      }
    }

    return { effectiveUserLimits, effectivePermissions };
  } catch (err) {
    console.error('Error recomputing effective state:', err);
    return null;
  }
}

/**
 * Process expired addon
 */
async function processExpiredAddon(addon, order, company) {
  try {
    console.log(`⏳ Processing expired addon: ${addon.name} (Order: ${order._id})`);

    // Mark order as expired
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          status: 'expired',
          expiredAt: new Date(),
        }
      }
    );

    console.log(`✅ Marked order ${order._id} as expired`);

    // Recompute company effective state
    const newState = await recomputeEffectiveState(company);
    if (newState) {
      await Company.updateOne(
        { _id: company._id },
        {
          $set: {
            effectiveUserLimits: newState.effectiveUserLimits,
            effectivePermissions: newState.effectivePermissions,
            updatedAt: new Date(),
          }
        }
      );

      console.log(`✅ Updated company effective state after addon expiry`);

      // Call 3rd party API to sync expiry
      try {
        const payload = {
          action: 'addon_expired',
          companyId: company._id.toString(),
          addonId: addon._id.toString(),
          addonName: addon.name,
          effectiveUserLimits: newState.effectiveUserLimits,
          effectivePermissions: newState.effectivePermissions,
          timestamp: new Date().toISOString(),
        };

        await sendSecureRequest(payload);
        console.log(`📡 Synced addon expiry to 3rd party API`);
      } catch (err) {
        console.warn(`⚠️  3rd party API sync failed:`, err.message);
      }
    }
  } catch (err) {
    console.error(`❌ Error processing expired addon:`, err.message);
  }
}

/**
 * Main worker function
 */
async function runAddonExpiryWorker() {
  try {
    console.log('🔄 [AddonExpiry] Starting addon expiry worker...');

    // Get all active addon orders
    const orders = await Order.find({
      orderType: 'ADDON_PURCHASE',
      status: 'paid',
      isDeleted: false,
    })
      .sort({ createdAt: 1 })
      .limit(BATCH_SIZE * 5)
      .lean();

    if (orders.length === 0) {
      console.log('✓ No active addon orders to check');
      return;
    }

    let expiredCount = 0;

    for (const order of orders) {
      if (!order.items) continue;

      for (const item of order.items) {
        if (item.type !== 'addon') continue;

        const addon = await Addon.findById(item.itemId).lean();
        if (!addon) continue;

        const subscription = await Subscription.findOne({
          _id: { $in: [order.subscriptionId] }
        }).lean();

        // Check if addon has expired
        if (isAddonExpired(addon, order, subscription)) {
          const company = await Company.findById(order.companyId);
          if (company) {
            await processExpiredAddon(addon, order, company);
            expiredCount++;
          }
        }
      }
    }

    console.log(`✅ [AddonExpiry] Worker completed - ${expiredCount} addons expired`);
  } catch (err) {
    console.error('❌ [AddonExpiry] Worker error:', err);
  }
}

/**
 * Start worker loop
 */
async function startWorker() {
  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/saas', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to MongoDB');
    }

    // Run once immediately
    await runAddonExpiryWorker();

    // Run periodically
    setInterval(() => {
      runAddonExpiryWorker().catch(err =>
        console.error('❌ Worker interval error:', err)
      );
    }, WORKER_INTERVAL);

    console.log(`⏰ Worker scheduled to run every ${WORKER_INTERVAL / 1000 / 60} minutes`);
  } catch (err) {
    console.error('❌ Failed to start worker:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the worker
startWorker();
