// addon.service.js
// src/saas/services/addon.service.js
const Addon = require('../models/addon.model');
const Company = require('../models/company.model');
const Order = require('../models/order.model');
const Payment = require('../models/payment.model');
const Subscription = require('../models/subscription.model');
const { enqueueJob } = require('../libs/jobQueue');
const { PaymentMethod } = require('../constants/saas.constant');

class AddonService {
  static async buyAddon({ companyId, addonCode, units = 1, method = PaymentMethod.CARD, createdBy = null }) {
    const addon = await Addon.findOne({ code: addonCode });
    if (!addon) throw new Error('Addon not found');
    const amountPaise = (addon.pricePerUnitPaise || 0) * (units || 1);

    const order = await Order.create({ company: companyId, type: 'ADDON', targetId: addon._id, amountPaise, currency: 'INR', status: 'PENDING', meta: { units }, createdBy });
    const payment = await Payment.create({ order: order._id, company: companyId, amountPaise, method, status: 'PENDING', createdBy });

    const company = await Company.findById(companyId);
    const activeSub = await Subscription.findOne({ company: companyId, status: 'ACTIVE' });

    if (method === PaymentMethod.OFFLINE) {
      // pending: add to pendingAddons and notify admin
      company.pendingAddons = company.pendingAddons || [];
      company.pendingAddons.push({ addonId: addon._id, units, status: 'PENDING', purchasedAt: new Date(), paymentRef: payment._id });
      await company.save();

      // notify admins for manual payment entry/approval
      await enqueueJob({ type: 'notification.admin_offline_addon', payload: { companyId, addonId: addon._id, paymentId: payment._id }, priority: 10 });
      await enqueueJob({ type: 'audit.log_event', payload: { action: 'addon.purchase.pending_offline', entityId: order._id, companyId }, priority: 9 });
      return { order, payment, applied: false };
    }

    //TODO for online -> we assume gateway success (but in real flow webhook will call PaymentService.markOnlinePaymentSuccess)
    payment.status = 'SUCCESS';
    await payment.save();
    order.status = 'PAID';
    await order.save();

    if (activeSub) {
      const expiresAt = addon.durationDays ? new Date(Date.now() + addon.durationDays * 24 * 60 * 60 * 1000) : null;//TODO if  expiresAt then also add its worker for expired the addon-subscription -104
      company.appliedAddons = company.appliedAddons || [];
      company.appliedAddons.push({ addonId: addon._id, units, status: 'ACTIVE', purchasedAt: new Date(), appliedAt: new Date(), expiresAt, paymentRef: payment._id });
      const provides = addon.provides || {};
      for (const k of Object.keys(provides)) company[k] = (company[k] || 0) + provides[k] * units;
      company.transactions = company.transactions || [];
      company.transactions.push({ type: 'ADDON_APPLIED', amountPaise, addon: addon._id, date: new Date(), payment: payment._id });
      await company.save();

      // enqueue audit + addon.applied job for further processing / notifications
      await enqueueJob({ type: 'audit.log_event', payload: { action: 'addon.applied', entityType: 'Addon', entityId: addon._id, companyId }, priority: 7 });
      await enqueueJob({ type: 'addon.applied', payload: { companyId, addonId: addon._id, paymentId: payment._id }, priority: 6 });
      return { order, payment, applied: true };
    } else {
      // store pending (paid but cannot apply until subscription active)
      company.pendingAddons = company.pendingAddons || [];
      company.pendingAddons.push({ addonId: addon._id, units, status: 'PENDING', purchasedAt: new Date(), paymentRef: payment._id });
      company.transactions = company.transactions || [];
      company.transactions.push({ type: 'ADDON_PURCHASE_PENDING', amountPaise, addon: addon._id, date: new Date(), payment: payment._id });
      await company.save();

      // schedule pending addon apply attempt (worker will try to apply)
      await enqueueJob({ type: 'pendingAddonApplier', payload: { companyId: company._id }, scheduledAt: Date.now() + 1000 * 10, priority: 8 });

      return { order, payment, applied: false };
    }
  }

  static async applyPaidAddon(companyId, addonId, { payment = null, units = 1 }) {
    const addon = await Addon.findById(addonId);
    if (!addon) throw new Error('Addon not found');
    const company = await Company.findById(companyId);
    const activeSub = await Subscription.findOne({ company: companyId, status: 'ACTIVE' });
    if (!activeSub) {
      // keep pending
      company.pendingAddons = company.pendingAddons || [];
      company.pendingAddons.push({ addonId: addon._id, units, status: 'PENDING', purchasedAt: new Date(), paymentRef: payment ? payment._id : null });
      await company.save();
      await enqueueJob({ type: 'audit.log_event', payload: { action: 'addon.purchase.pending', companyId, addonId, paymentId: payment ? payment._id : null }, priority: 6 });
      return { applied: false };
    }
    const expiresAt = addon.durationDays ? new Date(Date.now() + addon.durationDays * 24 * 3600 * 1000) : null;
    company.appliedAddons = company.appliedAddons || [];
    company.appliedAddons.push({ addonId: addon._id, units, status: 'ACTIVE', purchasedAt: new Date(), appliedAt: new Date(), expiresAt, paymentRef: payment ? payment._id : null });
    const provides = addon.provides || {};
    for (const k of Object.keys(provides)) company[k] = (company[k] || 0) + provides[k] * units;
    company.transactions = company.transactions || [];
    company.transactions.push({ type: 'ADDON_APPLIED', amountPaise: payment ? payment.amountPaise : 0, addon: addon._id, date: new Date(), payment: payment ? payment._id : null });
    await company.save();
    await enqueueJob({ type: 'audit.log_event', payload: { action: 'addon.applied', companyId, addonId, paymentId: payment ? payment._id : null }, priority: 7 });
    return { applied: true };
  }

  static async adminApplyPendingAddonOnPayment(paymentId, companyId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    const company = await Company.findById(companyId);
    if (!company) throw new Error('Company not found');
    // find pending addons with this paymentRef
    const pending = (company.pendingAddons || []).filter(x => x.paymentRef && x.paymentRef.toString() === paymentId.toString());
    for (const p of pending) {
      // try apply if subscription active
      const addon = await Addon.findById(p.addonId);
      if (!addon) continue;
      const activeSub = await Subscription.findOne({ company: companyId, status: 'ACTIVE' });
      if (!activeSub) continue; // still pending
      const expiresAt = addon.durationDays ? new Date(Date.now() + addon.durationDays * 24 * 3600 * 1000) : null;
      company.appliedAddons = company.appliedAddons || [];
      company.appliedAddons.push({ addonId: addon._id, units: p.units || 1, status: 'ACTIVE', purchasedAt: p.purchasedAt, appliedAt: new Date(), expiresAt, paymentRef: payment._id });
      const provides = addon.provides || {};
      for (const k of Object.keys(provides)) company[k] = (company[k] || 0) + provides[k] * (p.units || 1);
      company.pendingAddons = (company.pendingAddons || []).filter(x => !(x.paymentRef && x.paymentRef.toString() === payment._id.toString()));
      company.transactions = company.transactions || [];
      company.transactions.push({ type: 'ADDON_APPLIED', amountPaise: payment.amountPaise, addon: addon._id, date: new Date(), payment: payment._id });
    }
    await company.save();
    await enqueueJob({ type: 'audit.log_event', payload: { action: 'addon.admin_apply', paymentId, companyId }, priority: 8 });
    return company;
  }
}

module.exports = AddonService;
