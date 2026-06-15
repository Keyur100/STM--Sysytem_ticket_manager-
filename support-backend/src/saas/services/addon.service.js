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
   * Get all active add-ons with pagination and filtering
   */
  static async getAll(q = {}) {
    try {
      const page = parseInt(q.page || 1, 10) || 1;
      const limit = parseInt(q.limit || 20, 10) || 20;
      const search = (q.search || q.q || "").trim();
      const sortBy = q.sortBy || q.orderBy || "createdAt";
      const sortOrder = (q.sortOrder || q.order || "desc").toLowerCase() === "asc" ? 1 : -1;

      const filter = { isDeleted: false };

      // Search by name, value, or description
      if (search) {
        filter.$or = [
          { name: new RegExp(search, "i") },
          { value: new RegExp(search, "i") },
          { description: new RegExp(search, "i") }
        ];
      }

      const total = await Addon.countDocuments(filter);
      const addons = await Addon.find(filter)
        .populate('companyId', 'name businessName legalName')
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      // Add scope field for frontend convenience
      const mapped = (addons || []).map(c => ({
        ...c,
        scope: c.scope || "global"
      }));

      return { addons: mapped, total, page, limit };
    } catch (err) {
      console.error("Error fetching addons:", err);
      throw new Error(`Failed to fetch add-ons: ${err.message}`);
    }
  }

  /**
   * Get all active add-ons (simplified, no pagination)
   */
  static async getAllAddons() {
    try {
      const addons = await Addon.find({ isActive: true, isDeleted: false })
        .populate('companyId', 'name businessName legalName')
        .select('value name description pricePaise hasTax taxName taxIncluded type provides durationDays isActive scope billingType expiryType companyId')
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
   * Get feature-type addons and include company applied status
   */
  static async getFeatureAddonsWithCompanies() {
    try {
      const addons = await Addon.find({ type: 'feature', isActive: true, isDeleted: false })
        .select('value name description provides pricePaise durationDays')
        .lean();

      const companies = await Company.find({ isDeleted: false })
        .select('name selectedAddons')
        .lean();

      const mapped = (addons || []).map(a => {
        const appliedCompanies = (companies || []).map(c => ({
          companyId: c._id,
          name: c.name,
          applied: Boolean(c.selectedAddons && c.selectedAddons[a.value])
        }));

        return {
          ...a,
          appliedCompanies,
          appliedCount: appliedCompanies.filter(x => x.applied).length,
        };
      });

      return { success: true, addons: mapped, count: mapped.length };
    } catch (err) {
      console.error('Error fetching feature addons with companies:', err);
      throw new Error(`Failed to fetch feature addons: ${err.message}`);
    }
  }

  /**
   * Get a specific add-on by ID
   */
  static async getAddonById(id) {
    try {
      const addon = await Addon.findById(id)
        .populate('companyId', 'name businessName legalName')
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
    const addon = await Addon.findOne({ $or: [{ value: addonCode }, { code: addonCode }] });
    if (!addon) throw new Error('Addon not found');
    const qty = Math.max(1, Number(units || 1));
    const amountPaise = (addon.pricePaise || 0) * qty;

    const activeSubscription = await Subscription.findOne({ companyId, status: 'ACTIVE' });

    const items = [{
      type: 'addon',
      itemId: addon._id,
      name: addon.name,
      value: addon.value,
      
      qty,
      priceAtPurchasePaise: addon.pricePaise,
      lineSubtotalPaise: amountPaise,
      taxConfig: { hasTax: !!addon.hasTax, taxIncluded: !!addon.taxIncluded },
      provides: addon.provides || null,
      addonType: addon.type || 'limit'
    }];

    const order = await Order.create({
      companyId,
      subscriptionId: activeSubscription?._id,
      orderType: 'ADDON_PURCHASE',
      items,
      totals: {
        subtotalPaise: amountPaise,
        totalDiscountPaise: 0,
        taxableAmountPaise: amountPaise,
        totalTaxPaise: 0,
        totalPayablePaise: amountPaise,
      },
      status: 'PENDING',
      meta: { units: qty },
      createdBy
    });

    const payment = await Payment.create({ order: order._id, company: companyId, amountPaise, method, status: 'PENDING', createdBy });

    const company = await Company.findById(companyId);

    if (method === PaymentMethod.OFFLINE) {
      // pending: add to pendingAddons and notify admin
      company.pendingAddons = company.pendingAddons || [];
      company.pendingAddons.push({ addonId: addon._id, units: qty, status: 'PENDING', purchasedAt: new Date(), paymentRef: payment._id });
      await company.save();

      // notify admins for manual payment entry/approval
      await enqueueJob({ type: 'notification.admin_offline_addon', payload: { companyId, addonId: addon._id, paymentId: payment._id }, priority: 10 });
      await enqueueJob({ type: 'audit.log_event', payload: { action: 'addon.purchase.pending_offline', entityId: order._id, companyId }, priority: 9 });
      return { order, payment, applied: false };
    }

    //TODO for online -> we assume gateway success (but in real flow webhook will call PaymentService.markOnlinePaymentSuccess)
    payment.status = 'SUCCESS';
    await payment.save();
    order.status = 'paid';
    await order.save();

    if (activeSubscription) {
      const expiresAt = addon.durationDays ? new Date(Date.now() + addon.durationDays * 24 * 60 * 60 * 1000) : null;
      company.appliedAddons = company.appliedAddons || [];
      company.appliedAddons.push({ addonId: addon._id, units: qty, status: 'ACTIVE', purchasedAt: new Date(), appliedAt: new Date(), expiresAt, paymentRef: payment._id });
      const provides = addon.provides || {};
      if (addon.type === 'limit') {
        for (const k of Object.keys(provides || {})) company[k] = (company[k] || 0) + (provides[k] || 0) * qty;
      } else if (addon.type === 'feature') {
        company.selectedAddons = company.selectedAddons || {};
        company.selectedAddons[addon.value] = company.selectedAddons[addon.value] || {};
        company.selectedAddons[addon.value].units = (company.selectedAddons[addon.value].units || 0) + qty;
        company.selectedAddons[addon.value].meta = addon.provides || company.selectedAddons[addon.value].meta || {};
        company.selectedAddons[addon.value].appliedAt = new Date();
        company.selectedAddons[addon.value].expiresAt = expiresAt;
      }
      company.transactions = company.transactions || [];
      company.transactions.push({ type: 'ADDON_APPLIED', amountPaise, addon: addon._id, date: new Date(), payment: payment._id });
      await company.save();

      await enqueueJob({ type: 'notification.company_addon_applied', payload: { companyId, addonId: addon._id }, priority: 10 });
      await enqueueJob({ type: 'audit.log_event', payload: { action: 'addon.purchase.applied', entityId: addon._id, companyId }, priority: 9 });
    }

    return { order, payment, applied: !!activeSubscription };
  }
}

module.exports = AddonService;
