// src/saas/services/addon.service.js
const Addon = require('../models/addon.model');
const Company = require('../models/company.model');
const Order = require('../models/order.model');
const Payment = require('../models/payment.model');
const Subscription = require('../models/subscription.model');
const { enqueueJob } = require('../libs/jobQueue');
const { PaymentMethod } = require('../constants/saas.constant');

class AddonService {
  /**
   * Get all active add-ons
   */
  static async getAllAddons() {
    try {
      const addons = await Addon.find({ isActive: true, isDeleted: false })
        .select('value name description pricePaise hasTax taxName taxIncluded type provides durationDays isActive')
        .lean();
      
      return {
        success: true,
        addons: addons || [],
        count: addons?.length || 0,
      };
    } catch (err) {
      console.error("Error fetching addons:", err);
      throw new Error(`Failed to fetch add-ons: ${err.message}`);
    }
  }

  /**
   * Get a specific add-on by ID
   */
  static async getAddonById(id) {
    try {
      const addon = await Addon.findById(id)
        .select('-isDeleted')
        .lean();
      
      if (!addon) {
        throw new Error("Add-on not found");
      }

      return {
        success: true,
        addon,
      };
    } catch (err) {
      console.error("Error fetching addon:", err);
      throw new Error(`Failed to fetch add-on: ${err.message}`);
    }
  }

  /**
   * Create a new add-on
   */
  static async createAddon(data, createdBy) {
    try {
      // Ensure unique `value` per addon
      if (!data || !data.value) throw new Error('Addon value is required');
      const exists = await Addon.findOne({ value: data.value });
      if (exists) throw new Error('Addon already exists with same value');

      // Normalize provides: allow either object (limits) or array/object for feature modules
      const normalized = { ...data };
      if (normalized.type === 'feature' && Array.isArray(normalized.provides)) {
        // keep arrays as-is (module list)
      } else if (normalized.type === 'feature' && typeof normalized.provides === 'object') {
        // keep object as-is
      }

      const addon = await Addon.create({
        ...normalized,
        createdBy,
      });

      return {
        success: true,
        addon,
        message: "Add-on created successfully",
      };
    } catch (err) {
      console.error("Error creating addon:", err);
      throw new Error(`Failed to create add-on: ${err.message}`);
    }
  }

  /**
   * Update an add-on
   */
  static async updateAddon(id, data, updatedBy) {
    try {
      // If value is being updated, ensure uniqueness
      if (data && data.value) {
        const exists = await Addon.findOne({ value: data.value, _id: { $ne: id } }).lean().catch(() => null);
        if (exists) throw new Error('Another addon with same value already exists');
      }

      const normalized = { ...data };
      if (normalized.type === 'feature' && Array.isArray(normalized.provides)) {
        // ok
      }

      const addon = await Addon.findByIdAndUpdate(
        id,
        { ...normalized, updatedBy },
        { new: true, runValidators: true }
      );

      if (!addon) {
        throw new Error("Add-on not found");
      }

      return {
        success: true,
        addon,
        message: "Add-on updated successfully",
      };
    } catch (err) {
      console.error("Error updating addon:", err);
      throw new Error(`Failed to update add-on: ${err.message}`);
    }
  }

  /**
   * Delete an add-on
   */
  static async deleteAddon(id) {
    try {
      const addon = await Addon.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      );

      if (!addon) {
        throw new Error("Add-on not found");
      }

      return {
        success: true,
        message: "Add-on deleted successfully",
      };
    } catch (err) {
      console.error("Error deleting addon:", err);
      throw new Error(`Failed to delete add-on: ${err.message}`);
    }
  }

  /**
   * Buy add-on for a company
   */
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
      if (addon.type === 'limit') {
        for (const k of Object.keys(provides || {})) company[k] = (company[k] || 0) + (provides[k] || 0) * units;
      } else if (addon.type === 'feature') {
        // for feature type, store module/feature metadata under selectedAddons keyed by addon.value
        company.selectedAddons = company.selectedAddons || {};
        company.selectedAddons[addon.value] = company.selectedAddons[addon.value] || {};
        company.selectedAddons[addon.value].units = (company.selectedAddons[addon.value].units || 0) + units;
        company.selectedAddons[addon.value].meta = addon.provides || company.selectedAddons[addon.value].meta || {};
        company.selectedAddons[addon.value].appliedAt = new Date();
        company.selectedAddons[addon.value].expiresAt = expiresAt;
      }
      company.transactions = company.transactions || [];
      company.transactions.push({ type: 'ADDON_APPLIED', amountPaise, addon: addon._id, date: new Date(), payment: payment._id });
      await company.save();

      // notify company that addon applied
      await enqueueJob({ type: 'notification.company_addon_applied', payload: { companyId, addonId: addon._id }, priority: 10 });
      await enqueueJob({ type: 'audit.log_event', payload: { action: 'addon.purchase.applied', entityId: addon._id, companyId }, priority: 9 });
    }

    return { order, payment, applied: !!activeSub };
  }
}

module.exports = AddonService;
