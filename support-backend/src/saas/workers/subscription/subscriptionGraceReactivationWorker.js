const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { initWorker } = require('../bootstrap/workerBootstrap');
const { enqueueJob } = require('../../libs/jobQueue');
const orderModel = require('../../models/order.model');
const CompanyService = require('../../services/company.service');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 🔥 Your actual worker logic
async function runSubscriptionActivationWorker() {
  const now = 1779629469000//Date.now();

  try {
    const orders = await orderModel.find({
      status: 'paid',
      subscriptionId: { $exists: false },
      orderType: {
        $in: [
          'SUBSCRIPTION_RENEWAL',
          'SUBSCRIPTION_REACTIVATE',
          'SUBSCRIPTION_PURCHASE'
        ]
      }
    }).lean();

    for (const order of orders) {
      try {
        const intendedStartAt = order.meta?.intendedStartAt || now;

        // Wait until correct time (renewal case)
        if (now < intendedStartAt) continue;

        // Idempotency safety
        if (order.subscriptionId) continue;

        const subscription =
          await CompanyService.activateSubscriptionIfEligible(order);

        if (subscription) {
          await enqueueJob({
            type: 'notify.company',
            payload: {
              companyId: order.companyId,
              type: 'SUBSCRIPTION_ACTIVATED',
              subscriptionId: subscription._id,
              orderId: order._id
            }
          });

          console.log('✅ Subscription activated for order:', order._id);
        }

      } catch (err) {
        console.error('❌ Order activation failed', order._id, err);
      }
    }

  } catch (err) {
    console.error('❌ Subscription activation worker failed', err);
  }
}

// 🔁 Self-running loop every 2 seconds
async function startWorkerLoop() {
  console.log('🚀 Subscription Activation Worker started (runs every 2s)');

  // Initialize database connection
  await initWorker();

  while (true) {
    await runSubscriptionActivationWorker();
    await delay(2000);
  }
}

// ▶️ Start automatically when file runs
startWorkerLoop();