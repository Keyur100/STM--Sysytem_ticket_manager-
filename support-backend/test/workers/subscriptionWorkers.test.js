const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const subscriptionExpiryWorker = require('../../src/saas/workers/subscriptionExpiryWorker');
const graceWorker = require('../../src/saas/workers/subscriptionGraceReactivationWorker');
const reminderWorker = require('../../src/saas/workers/subscriptionReminderWorker');

const Company = require('../../src/saas/models/company.model');
const Subscription = require('../../src/saas/models/subscription.model');
const Order = require('../../src/saas/models/order.model');
const Job = require('../../src/saas/models/job.model');
const Plan = require('../../src/saas/models/plan.model');

jest.setTimeout(60000);

describe('Subscription workers', () => {
  let mongo;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await require('../../src/models/mongoose').connectMongoose(uri);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongo.stop();
  });

  beforeEach(async () => {
    // cleanup
    await Promise.all([
      Company.deleteMany({}),
      Subscription.deleteMany({}),
      Order.deleteMany({}),
      Job.deleteMany({}),
      Plan.deleteMany({}),
    ]);
  });

  test('expiry worker marks expired and enqueues notification', async () => {
    const company = await Company.create({ name: 'C1' });
    const plan = await Plan.create({ code: 'P1', name: 'P1', pricePaise: 1000, billingCycle: 'MONTHLY' });
    const now = Date.now();
    const sub = await Subscription.create({ companyId: company._id, planId: plan._id, planSnapshot: { _id: plan._id, name: plan.name }, startAt: now - 1000000, endAt: now - 5000, status: 'ACTIVE' });

    await subscriptionExpiryWorker();

    const updated = await Subscription.findById(sub._id).lean();
    expect(updated.status).toBe('EXPIRED');

    const jobs = await Job.find({ 'payload.companyId': String(company._id) });
    const types = jobs.map(j => j.type);
    expect(types).toContain('notify.company');
  });

  test('grace reactivation worker reactivates when paid order exists', async () => {
    const company = await Company.create({ name: 'C2' });
    const plan = await Plan.create({ code: 'P2', name: 'P2', pricePaise: 2000, billingCycle: 'MONTHLY' });
    const now = Date.now();
    const sub = await Subscription.create({ companyId: company._id, planId: plan._id, planSnapshot: { _id: plan._id, name: plan.name }, startAt: now - 1000000, endAt: now - 5000, status: 'EXPIRED', expiredAt: now - 1000 });

    // create a paid order linked to this subscription
    const order = await Order.create({ companyId: company._id, subscriptionId: sub._id, orderType: 'SUBSCRIPTION_REACTIVATE', items: [{ type: 'plan', itemId: plan._id, name: plan.name, qty: 1, priceAtPurchasePaise: plan.pricePaise, lineSubtotalPaise: plan.pricePaise }], totals: { subtotalPaise: plan.pricePaise, totalPayablePaise: plan.pricePaise }, final: { totalPaidPaise: plan.pricePaise, amountDuePaise: 0 }, status: 'paid' });

    await graceWorker();

    // Expect a notify.company job for reactivation
    const job = await Job.findOne({ 'payload.subscriptionId': String(sub._id), type: 'notify.company' }).lean();
    expect(job).toBeTruthy();
    expect(job.payload.type).toBe('SUBSCRIPTION_REACTIVATED');
  });

  test('reminder worker flags 90% and enqueues notification', async () => {
    const company = await Company.create({ name: 'C3' });
    const plan = await Plan.create({ code: 'P3', name: 'P3', pricePaise: 3000, billingCycle: 'MONTHLY' });
    const now = Date.now();
    const startAt = now - (27 * 24 * 60 * 60 * 1000); // 27 days ago
    const endAt = now + (3 * 24 * 60 * 60 * 1000); // 3 days ahead => 90% elapsed for a 30-day period
    const sub = await Subscription.create({ companyId: company._id, planId: plan._id, planSnapshot: { _id: plan._id, name: plan.name }, startAt, endAt, status: 'ACTIVE', notifications: {} });

    await reminderWorker();

    const updated = await Subscription.findById(sub._id).lean();
    expect(updated.notifications && updated.notifications.notified90pct).toBe(true);

    const job = await Job.findOne({ 'payload.subscriptionId': String(sub._id), type: 'notify.company' }).lean();
    expect(job).toBeTruthy();
    expect(job.payload.type).toBe('SUBSCRIPTION_90PCT');
  });
});
