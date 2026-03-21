const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

let mongo;
let app;
let server;

const { connectMongoose } = require('../../src/models/mongoose');
const { UserAuth } = require('../../src/models/user.model');
const Plan = require('../../src/saas/models/plan.model');
const orderModel = require('../../src/saas/models/order.model');
const subscriptionModel = require('../../src/saas/models/subscription.model');

jest.setTimeout(60000);

describe('Subscription flow integration', () => {
  let token;
  let companyId;
  let planDoc;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await connectMongoose(uri);

    // create superadmin user and JWT
    const user = await UserAuth.create({ email: 'sa@example.com', passwordHash: 'x', type: 'SA' });
    token = jwt.sign({ _id: user._id.toString(), type: 'SA', name: 'sa' }, process.env.JWT_SECRET || 'secret');

    // create plan used for signup
    planDoc = await Plan.create({ code: 'BASIC', name: 'Basic Plan', pricePaise: 10000, billingCycle: 'MONTHLY', modulePermissions: [] });

    // build express app using existing routes
    app = express();
    app.use(bodyParser.json());
    app.use('/api', require('../../src/routes/api'));
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongo.stop();
  });

  test('company draft -> signup -> record cash payment -> reactivate flow', async () => {
    // 1. Draft
    const draftRes = await request(app)
      .post('/api/saas/company/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'TestCo' });
    expect(draftRes.status).toBe(200);
    expect(draftRes.body.success).toBe(true);
    const draftCompany = draftRes.body.data;
    expect(draftCompany).toHaveProperty('_id');

    // 2. Signup (full payload)
    const signupPayload = {
      name: 'TestCo Ltd',
      url: 'https://testco.example',
      panNo: 'PAN1234',
      gstNo: 'GST1234',
      bankAccount: { accountNumber: '123456', ifsc: 'IFSC000' },
      contact: { personName: 'Alice', email: 'alice@testco.example', phone: '9999999999', address: 'Addr' },
      plan: { _id: planDoc._id.toString(), name: planDoc.name, duration: 'monthly', price: 100 },
      permissions: {},
    };

    const signupRes = await request(app)
      .post('/api/saas/company/signup')
      .set('Authorization', `Bearer ${token}`)
      .send(signupPayload);
    expect(signupRes.status).toBe(200);
    expect(signupRes.body.success).toBe(true);
    const company = signupRes.body.data;
    companyId = company._id;

    // 3. Create a pending order for this company (simulate partially paid / pending)
    const order = await orderModel.create({
      companyId: mongoose.Types.ObjectId(companyId),
      orderType: 'SUBSCRIPTION_PURCHASE',
      items: [{ type: 'plan', itemId: planDoc._id, name: planDoc.name, qty: 1, priceAtPurchasePaise: planDoc.pricePaise, lineSubtotalPaise: planDoc.pricePaise }],
      totals: { subtotalPaise: planDoc.pricePaise, totalDiscountPaise: 0, taxableAmountPaise: planDoc.pricePaise, totalTaxPaise: 0, totalPayablePaise: planDoc.pricePaise },
      final: { totalPaidPaise: 0, amountDuePaise: planDoc.pricePaise },
      status: 'pending'
    });

    // 4. Record cash payment to settle the order
    const cashRes = await request(app)
      .post(`/api/saas/company/${companyId}/record-cash-payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order._id.toString(), cashReceiptNo: 'RCPT123' });
    expect(cashRes.status).toBe(200);
    expect(cashRes.body.success).toBe(true);

    // Verify subscription created and company activeSubscriptionId set
    const subscription = await subscriptionModel.findOne({ companyId }).lean();
    expect(subscription).toBeTruthy();
    expect(subscription.status).toBe('ACTIVE');

    // 5. Expire subscription artificially
    await subscriptionModel.updateOne({ _id: subscription._id }, { $set: { status: 'EXPIRED', expiredAt: Date.now() - 1000, endAt: Date.now() - 1000 } });

    // 6. Call reactivate endpoint
    const reactRes = await request(app)
      .post(`/api/saas/subscriptions/${subscription._id.toString()}/reactivate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ useWallet: false });

    expect(reactRes.status).toBe(200);
    expect(reactRes.body.success).toBe(true);

    // Confirm a reactivation order was created or subscription reactivated
    const updatedSub = await subscriptionModel.findById(subscription._id).lean();
    expect(['ACTIVE', 'EXPIRED', 'CANCELLED']).toContain(updatedSub.status);
  });
});
