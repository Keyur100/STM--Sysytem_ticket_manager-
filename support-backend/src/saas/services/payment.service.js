const Razorpay = require('razorpay');
const crypto = require('crypto');
const env = require('../config/env');
const Order = require('../models/order.model');
const Payment = require('../models/payment.model');
const Wallet = require('../models/wallet.model');
const WalletService = require('./wallet.service');
const SubscriptionService = require('./subscription.service');
const { PaymentMethod, PaymentStatus } = require('../constants/payment.constant');
const { OrderStatus } = require('../constants/saas.constant');

const razorpay = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });

class PaymentService {
  // create order record and (optionally) create razorpay order
  static async createOrderAndPayment({ companyId, type, targetId, amountPaise, paymentMethod, couponCode, renewalType, createdBy, meta,plan }) {
    // create DB order
    const order = await Order.create({
      company: companyId,
      type,
      targetId,
      amountPaise,
      couponCode,
      renewalType,
      status: OrderStatus.PENDING,
      meta,
      createdBy,
      updatedBy: createdBy
    });

    // wallet path (pay from wallet entirely)
    if (paymentMethod === PaymentMethod.WALLET) {
      // will throw if insufficient
      await WalletService.deductAmount(companyId, amountPaise, 'ORDER_PAYMENT', null);
      const payment = await Payment.create({
        order: order._id, company: companyId, amountPaise, method: PaymentMethod.WALLET, status: PaymentStatus.SUCCESS, createdBy, updatedBy: createdBy
      });
      order.payment = payment._id;
      order.status = OrderStatus.PAID;
      await order.save();

      // apply subscription/apply addon
      await SubscriptionService.applyPayment(order, payment,plan);
      return { order, payment };
    }

    // offline path: mark success immediately (if chosen)
    if (paymentMethod === PaymentMethod.OFFLINE) {
      const payment = await Payment.create({
        order: order._id, company: companyId, amountPaise, method: PaymentMethod.OFFLINE, status: PaymentStatus.SUCCESS, createdBy, updatedBy: createdBy
      });
      order.payment = payment._id;
      order.status = OrderStatus.PAID;
      await order.save();
      await SubscriptionService.applyPayment(order, payment,plan);
      return { order, payment };
    }

    // Razorpay path: create Razorpay order and Payment record (CREATED)
    if (paymentMethod === PaymentMethod.RAZORPAY) {
      const rzpOrder = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: order._id.toString(),
        payment_capture: 1
      });

      const payment = await Payment.create({
        order: order._id, company: companyId, amountPaise, method: PaymentMethod.RAZORPAY, status: PaymentStatus.CREATED, providerResponse: rzpOrder, createdBy, updatedBy: createdBy
      });

      order.payment = payment._id;
      await order.save();

      return { order, payment, rzpOrder };
    }

    throw new Error('Unsupported payment method');
  }

  // verify razorpay signature (for client callback) and capture
  static async verifyRazorpayPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature,plan=null }) {
    const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (expected !== razorpay_signature) throw new Error('Invalid signature');

    // find payment by providerResponse.id
    const payment = await Payment.findOne({ 'providerResponse.id': razorpay_order_id });
    if (!payment) throw new Error('Payment not found');

    payment.status = PaymentStatus.SUCCESS;
    payment.transactionId = razorpay_payment_id;
    await payment.save();

    const order = await Order.findById(payment.order);
    order.status = OrderStatus.PAID;
    await order.save();

    // apply subscription/addon/topup
    await SubscriptionService.applyPayment(order, payment,plan); // need to pass company's plan data 
    return { order, payment };
  }

  // webhook handler: event = parsed webhook body
  static async handleWebhook(event) {
    // example event.payload.payment.entity
    const payload = event.payload || {};
    const entity = payload.payment ? payload.payment.entity : null;
    if (!entity) return;

    const razorpayOrderId = entity.order_id;
    const status = (entity.status || '').toUpperCase();

    const payment = await Payment.findOne({ 'providerResponse.id': razorpayOrderId }).populate('order');
    if (!payment) return;

    payment.providerResponse = entity;
    payment.transactionId = entity.id;

    if (status === 'CAPTURED' || status === 'AUTHORIZED') {
      payment.status = PaymentStatus.SUCCESS;
      await payment.save();
      payment.order.status = OrderStatus.PAID;
      await payment.order.save();
      await SubscriptionService.applyPayment(payment.order, payment,plan);
    } else {
      payment.status = PaymentStatus.FAILED;
      await payment.save();
      payment.order.status = OrderStatus.CANCELLED;
      await payment.order.save();
    }
  }

  // cancel order before payment completes
  static async cancelOrder(orderId, userId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');
    if (order.status !== OrderStatus.PENDING) throw new Error('Only pending can be cancelled');

    order.status = OrderStatus.CANCELLED;
    order.updatedBy = userId;
    await order.save();

    if (order.payment) {
      await Payment.findByIdAndUpdate(order.payment, { status: PaymentStatus.CANCELLED, updatedBy: userId });
    }
    return order;
  }
}

module.exports = PaymentService;
