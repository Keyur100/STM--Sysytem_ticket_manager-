/**
 * Pending Addon Applier Worker
 * 
 * Purpose:
 * - Find paid addon orders (status='paid')
 * - Attach addons to company's active subscription
 * - Compute company effective limits and permissions
 * - Call 3rd party API to sync addon changes
 * - Mark order as applied
 * 
 * Runs: Every 5 minutes via PM2
 */

const mongoose = require('mongoose');
const Order = require('../../models/order.model');
const Addon = require('../../models/addon.model');
const Company = require('../../models/company.model');
const Subscription = require('../../models/subscription.model');
const { sendSecureRequest } = require('../../services/sync.service');

const WORKER_INTERVAL = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 10;

/**
 * Compute effective user limits by merging plan + active addons
 */
async function computeEffectiveUserLimits(company) {
  try {
    let effectiveUserLimits = {};

    // Start with plan userPricing
    if (company.planSnapshot?.userPricing) {
      effectiveUserLimits = { ...effectiveUserLimits, ...company.planSnapshot.userPricing };
    }

    // Start with plan limits from modulePermissions (if any)
    if (company.planSnapshot?.modulePermissions) {
      company.planSnapshot.modulePermissions.forEach(mp => {
        if (mp.limits && typeof mp.limits === 'object') {
          effectiveUserLimits = { ...effectiveUserLimits, ...mp.limits };
        }
      });
    }

    // Get active addons for company (from subscription)
    const subscription = await Subscription.findById(company.activeSubscriptionId).lean();
    if (!subscription) return effectiveUserLimits;

    // Find all addon orders for this subscription that are paid and active
    const addonOrders = await Order.find({
      companyId: company._id,
      orderType: 'ADDON_PURCHASE',
      status: 'paid',
      isDeleted: false,
    }).lean();

    // Key mapping for addon limits to match plan keys
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
        if (!addon || !addon.provides?.limits) continue;

        // Merge addon limits (additive)
        Object.keys(addon.provides.limits).forEach(limitKey => {
          const normalizedKey = keyMapping[limitKey] || limitKey.replace(/ /g, '_').toLowerCase();
          const limitValue = addon.provides.limits[limitKey];
          if (typeof limitValue === 'number') {
            effectiveUserLimits[normalizedKey] = (effectiveUserLimits[normalizedKey] || 0) + limitValue;
          }
        });
      }
    }

    return effectiveUserLimits;
  } catch (err) {
    console.error('❌ Error computing effective user limits:', err.message);
    return {};
  }
}

/**
 * Compute effective permissions by merging plan + active addons
 */
async function computeEffectivePermissions(company) {
  try {
    let effectivePermissions = [];

    // Start with plan permissions
    if (company.planSnapshot?.modulePermissions) {
      company.planSnapshot.modulePermissions.forEach(mp => {
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

    // Get active addons for company
    const subscription = await Subscription.findById(company.activeSubscriptionId).lean();
    if (!subscription) return effectivePermissions;

    const addonOrders = await Order.find({
      companyId: company._id,
      orderType: 'ADDON_PURCHASE',
      status: 'paid',
      isDeleted: false,
    }).lean();

    for (const order of addonOrders) {
      if (!order.items) continue;

      for (const item of order.items) {
        if (item.type !== 'addon') continue;

        const addon = await Addon.findById(item.itemId).lean();
        if (!addon || !addon.provides?.permissions) continue;

        // Add addon permissions
        if (Array.isArray(addon.provides.permissions)) {
          addon.provides.permissions.forEach(perm => {
            if (!effectivePermissions.includes(perm)) {
              effectivePermissions.push(perm);
            }
          });
        }
      }
    }

    return effectivePermissions;
  } catch (err) {
    console.error('❌ Error computing effective permissions:', err.message);
    return [];
  }
}

/**
 * Process a single addon order
 */
async function processAddonOrder(order) {
  try {
    console.log(`⏳ Processing addon order: ${order._id}`);

    const company = await Company.findById(order.companyId);
    if (!company) {
      console.warn(`⚠️  Company not found for order ${order._id}`);
      return;
    }

    // Compute updated effective state
    const effectiveUserLimits = await computeEffectiveUserLimits(company);
    const effectivePermissions = await computeEffectivePermissions(company);

    // Update company with effective state
    await Company.updateOne(
      { _id: company._id },
      {
        $set: {
          effectiveUserLimits,
          effectivePermissions,
          updatedAt: new Date(),
        }
      }
    );

    console.log(`✅ Updated company effective state for ${company._id}`);

    // Call 3rd party API to sync addon changes
    try {
      const payload = {
        action: 'addon_purchased',
        companyId: company._id.toString(),
        effectiveUserLimits,
        effectivePermissions,
        timestamp: new Date().toISOString(),
      };

      await sendSecureRequest(payload);
      console.log(`📡 Synced addon changes to 3rd party API`);
    } catch (err) {
      console.warn(`⚠️  3rd party API sync failed:`, err.message);
      // Don't fail the entire process if 3rd party sync fails
    }

    // Mark order as processed (optional: add a flag if needed)
    // For now, we rely on status='paid' as indicator

  } catch (err) {
    console.error(`❌ Error processing addon order ${order._id}:`, err.message);
  }
}

/**
 * Main worker function
 */
async function runAddonApplierWorker() {
  try {
    console.log('🔄 [PendingAddonApplier] Starting pending addon applier worker...');

    // Find all paid addon orders that haven't been processed
    const orders = await Order.find({
      orderType: 'ADDON_PURCHASE',
      status: 'paid',
      isDeleted: false,
      // Add a flag or check if already processed
    })
      .sort({ createdAt: 1 })
      .limit(BATCH_SIZE)
      .lean();

    if (orders.length === 0) {
      console.log('✓ No pending addon orders to process');
      return;
    }

    console.log(`📦 Processing ${orders.length} addon orders...`);

    for (const order of orders) {
      await processAddonOrder(order);
    }

    console.log('✅ [PendingAddonApplier] Worker completed successfully');
  } catch (err) {
    console.error('❌ [PendingAddonApplier] Worker error:', err);
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
    await runAddonApplierWorker();

    // Run periodically
    setInterval(() => {
      runAddonApplierWorker().catch(err =>
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
