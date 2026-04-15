// src/saas/services/company.service.js
const Company = require("../models/company.model");
const WalletService = require("./wallet.service");
const SubscriptionService = require("./subscription.service");
const OrderService = require("./order.service");
const PaymentService = require("./payment.service");
const { env } = require("../constants/saas.constant");
const { enqueueJob } = require("../libs/jobQueue");
const CouponService = require("./coupon.service");
const orderModel = require("../models/order.model");
const paymentModel = require("../models/payment.model");
const walletModel = require("../models/wallet.model");
const walletTransactionModel = require("../models/walletTransaction.model");
const auditTrailModel = require("../models/auditTrail.model");
const syncLogModel = require("../models/syncLog.model");
const planModel = require("../models/plan.model");
const subscriptionModel = require("../models/subscription.model");
const transactionModel = require("../models/transaction.model");
const mongoose = require("mongoose");
const PlanService = require("./plan.service");
const couponModel = require("../models/coupon.model");
const addonModel = require("../models/addon.model");
const { CouponType } = require("../constants/coupon.constant");
const branchModel = require('../models/branch.model');
const clientUserModel = require('../models/clientUser.model');
const { formatDate } = require("../utils/date.util");

const DAY_MS = 24 * 60 * 60 * 1000;

async function loadCompanyPlanSnapshot(companyId) {
  if (!companyId) return null;
  const c = await Company.findById(companyId).lean().catch(() => null);
  if (!c) return null;
  if (c.planSnapshot && Object.keys(c.planSnapshot || {}).length) return c.planSnapshot;
  return null;
}

async function resolvePlanForOrder(order) {
  if (!order) return null;
  const planItem = (order.items || []).find(i => i.type === 'plan');
  if (!planItem) return null;

  // Prefer company-specific planSnapshot when available
  const companySnapshot = await loadCompanyPlanSnapshot(order.companyId);
  if (companySnapshot) return companySnapshot;

  // Fallback to canonical plan
  return await planModel.findById(planItem.itemId);
}

async function ensureUniqueCompanyFields(payload, excludeId = null) {
  // Check uniqueness for fields indexed/sparse in Company schema
  const checks = [];
  if (payload.code) checks.push({ code: payload.code });
  if (payload.url) checks.push({ url: payload.url });
  if (payload.panNo) checks.push({ panNo: payload.panNo });
  if (payload.gstNo) checks.push({ gstNo: payload.gstNo });
  if (payload.contact && payload.contact.email) checks.push({ 'contact.email': payload.contact.email.toLowerCase() });

  for (const q of checks) {
    const filter = { ...q };
    if (excludeId) filter._id = { $ne: excludeId };
    const exists = await Company.findOne(filter).lean().catch(() => null);
    if (exists) {
      const key = Object.keys(q)[0];
      throw new Error(`Company already exists with same ${key}`);
    }
  }
}

function calculateSubscriptionExpiry(plan, startAt) {
  if (!plan) throw new Error("Plan required to calculate expiry");

  // If plan has explicit duration in days, use that
  if (plan.durationDays) {
    return startAt + plan.durationDays * DAY_MS;
  }

  // Fallback based on billing cycle
  const d = new Date(startAt);

  switch (plan.billingCycle) {
    case "weekly":
    case "trial":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;

    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;

    case "half_yearly":
      d.setMonth(d.getMonth() + 6);
      break;

    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;

    default:
      // Safe default = 30 days
      d.setDate(d.getDate() + 30);
  }

  return d.getTime();
}

function companyUsesTrial(company) {
  if (!company) return false;
  const planName = String(company.planSnapshot?.name || '').toLowerCase();
  return company.isTrialUsed === true  || planName.includes('trial');
}

function planIsTrial(plan) {
  if (!plan) return false;
  const planName = String(plan.name || '').toLowerCase();
  return  planName.includes('trial');
}

async function activateSubscriptionIfEligible(order) {
  if (order.status !== "paid") return null;
  if (order.subscriptionId) return null;

  const planItem = order.items.find(i => i.type === "plan");
  if (!planItem) throw new Error("Paid order missing plan item");

  const now = Date.now();

  // Prefer company-specific planSnapshot where available (company may have
  // a customized snapshot). Fallback to canonical plan document.
  let plan = await loadCompanyPlanSnapshot(order.companyId);
  if (!plan) {
    plan = await planModel.findById(planItem.itemId);
  }
  if (!plan) throw new Error("Plan not found for paid order");
  if (!plan._id && plan.planId) {
    plan._id = plan.planId;
  }
  if (!plan._id && planItem.itemId) {
    plan._id = planItem.itemId;
  }

  // Take intended start from order (for renewal/reactivation), else now
  const startAt = order.meta?.intendedStartAt || now;
  const expiryDate = calculateSubscriptionExpiry(plan, startAt);

  /* =========================
     HANDLE UPGRADE
  ========================= */
  let carriedAddons = [];

  if (order.orderType === "SUBSCRIPTION_UPGRADE") {
    const oldSub = await subscriptionModel.findById(
      order.upgradeFromSubscriptionId
    );

    if (!oldSub || oldSub.status !== "ACTIVE") {
      throw new Error("Invalid upgrade source subscription");
    }

    carriedAddons = oldSub.addonSnapshot || [];

    // Cancel old subscription
    oldSub.status = "CANCELLED";
    oldSub.endAt = now - 1;
    await oldSub.save();
  }

  /* =========================
     COLLECT ADDONS FROM ORDER (include addon provides & duration)
  ========================= */
  const addonItems = order.items.filter(i => i.type === "addon");
  const addonSnapshots = [];
  for (const it of addonItems) {
    const addonDoc = await addonModel.findById(it.itemId).lean().catch(() => null);
    const qty = it.qty || 1;
    const start = Date.now();
    const end = addonDoc && addonDoc.durationDays ? start + (addonDoc.durationDays * DAY_MS) : null;
    addonSnapshots.push({
      addonId: it.itemId,
      name: it.name,
      value: it.value || (addonDoc && addonDoc.value) || null,
      qty,
      pricePaise: it.priceAtPurchasePaise,
      hasTax: it.taxConfig?.hasTax || (addonDoc && addonDoc.hasTax) || false,
      provides: addonDoc?.provides || null,
      type: addonDoc?.type || 'limit',
      durationDays: addonDoc?.durationDays || null,
      startAt: start,
      endAt: end,
    });
  }

  // If renewal/reactivation and no addons in order, carry old ones
  if (
    addonSnapshots.length === 0 &&
    ["SUBSCRIPTION_RENEWAL", "SUBSCRIPTION_REACTIVATE"].includes(order.orderType)
  ) {
    carriedAddons = order.meta?.reactivateFromSubscriptionId
      ? (await Subscription.findById(order.meta.reactivateFromSubscriptionId))
          ?.addonSnapshot || []
      : [];
  }

  const finalAddons = addonSnapshots.length
    ? addonSnapshots
    : carriedAddons;

  /* =========================
     CHECK FOR EXISTING EXPIRED SUBSCRIPTION TO REACTIVATE
  ========================= */
  let existingExpiredSubscription = null;
  if (order.orderType === "SUBSCRIPTION_PURCHASE") {
    // For trial-to-actual conversion, check if there's an EXPIRED subscription to reactivate
    existingExpiredSubscription = await subscriptionModel.findOne({
      companyId: order.companyId,
      status: 'EXPIRED'
    }).sort({ createdAt: -1 }); // Get the most recent expired subscription
  }

  let subscription;
  if (existingExpiredSubscription) {
    /* =========================
       REACTIVATE EXISTING EXPIRED SUBSCRIPTION
    ========================= */
    // Update the existing subscription to ACTIVE with new plan details
    subscription = await subscriptionModel.findByIdAndUpdate(
      existingExpiredSubscription._id,
      {
        $set: {
          planId: planIdForSubscription,
          planSnapshot: {
            planId: planIdForSubscription,
            code: plan.code,
            name: plan.name,
            billingCycle: plan.billingCycle,
            durationDays: plan.durationDays,
            pricePaise: plan.pricePaise,
            userPricing: plan.userPricing,
            modulePermissions: plan.modulePermissions
          },
          addonSnapshot: finalAddons,
          planPricePaise: planItem.priceAtPurchasePaise,
          addonPricePaise: finalAddons.reduce((s, a) => s + a.pricePaise * a.qty, 0),
          totalContractValuePaise: order.totals.totalPayablePaise,
          startAt,
          endAt: expiryDate,
          status: "ACTIVE",
          activatedByOrderId: order._id,
          updatedAt: now
        }
      },
      { new: true }
    );
  } else {
    /* =========================
       CREATE NEW SUBSCRIPTION
    ========================= */
    const planIdForSubscription = plan._id || plan.planId || planItem.itemId;
    const subscriptionData = {
      companyId: order.companyId,
      planId: planIdForSubscription,

      planSnapshot: {
        planId: planIdForSubscription,
        code: plan.code,
        name: plan.name,
        billingCycle: plan.billingCycle,
        durationDays: plan.durationDays,
        pricePaise: plan.pricePaise,
        userPricing: plan.userPricing,
        modulePermissions: plan.modulePermissions
      },

      addonSnapshot: finalAddons,

      planPricePaise: planItem.priceAtPurchasePaise,

      addonPricePaise: finalAddons.reduce(
        (s, a) => s + a.pricePaise * a.qty,
        0
      ),

      totalContractValuePaise: order.totals.totalPayablePaise,

      startAt,
      endAt: expiryDate,
      status: "ACTIVE",
      activatedByOrderId: order._id
    };

    // For upgrades, set previousSubscriptionId
    if (order.orderType === "SUBSCRIPTION_UPGRADE" && order.upgradeFromSubscriptionId) {
      subscriptionData.previousSubscriptionId = order.upgradeFromSubscriptionId;
    }

    [subscription] = await subscriptionModel.create([subscriptionData]);
  }

  // Link order → subscription
  await orderModel.updateOne(
    { _id: order._id },
    { $set: { subscriptionId: subscription._id } }
  );

  // Build selectedAddons map from subscription addonSnapshot
  const selectedAddonsMap = {};
  (subscription.addonSnapshot || []).forEach(a => {
    if (a && a.value) selectedAddonsMap[a.value] = (selectedAddonsMap[a.value] || 0) + (a.qty || 1);
  });

  // Compute effective user limits = plan.userPricing + sum(addon.provides * qty)
  const effectiveLimits = { ...(plan.userPricing || {}) };
  (subscription.addonSnapshot || []).forEach((a) => {
    if (a && a.provides && typeof a.provides === 'object') {
      for (const k of Object.keys(a.provides)) {
        const addVal = Number(a.provides[k] || 0) * Number(a.qty || 1);
        effectiveLimits[k] = (Number(effectiveLimits[k] || 0) + addVal);
      }
    }
  });

  // Update company
  await Company.updateOne(
    { _id: order.companyId },
    {
      $set: {
        status: "active",
        activeSubscriptionId: subscription._id,
        planId: plan._id,
        planSnapshot: subscription.planSnapshot,
        modulePermissionsSnapshot: plan.modulePermissions || {},
        selectedAddons: selectedAddonsMap,
        effectiveUserLimits: effectiveLimits,
      }
    },
    {  }
  );

  return subscription;
}
class CompanyService {
  /** ✅ Step 1 — Create Draft Company */
  static async createDraftCompany(payload, createdBy) {
    // const { name, contact } = payload;//TODO validate
    // if (!name || !contact || !contact.email) {
    //   throw new Error("Name and Contact Email are required");
    // }
    // Validate uniqueness of key fields
    await ensureUniqueCompanyFields(payload);

    const company = await Company.create({
      name: payload?.name || "Untitled Company",
      url: payload?.url || '',
      panNo: payload?.panNo || '',
      gstNo: payload?.gstNo || '',
      bankAccount: payload?.bankAccount || '',
      contact: payload?.contact || '',
      status: "draft",
      createdBy,
      updatedBy: createdBy,
      activeSubscriptionId: null,
      planSnapshot: payload?.plan || null,
      isTrialUsed: payload?.isTrialUsed === true || planIsTrial(payload?.plan || payload?.planSnapshot),
      code: payload?.code || (payload?.name ? String(payload.name).replace(/\s+/g, '').toUpperCase() : null),
      selectedAddons: payload?.selectedAddons || {},
      settings: payload?.settings || {},
    });
    //  SAFE CHECK (idempotent)
    let wallet = await walletModel.findOne({ company: company._id });
    // 2️⃣ Create wallet (mandatory)
    if (!wallet) {
      wallet = await walletModel.create([{
        companyId: company._id, // 
        balancePaise: 0,
      }]);
    }

    company.walletId = wallet._id;
    await company.save();
    // 3️⃣ Audit log
    await auditTrailModel.create({
      companyId: company._id,
      action: "COMPANY_CREATED",
      performedBy: createdBy,
      newValue: {
        name:company.name,
        email:company.contact?.email || null, //TODO
        status: "draft",
      },
    });
    return company;
  }

  /** ✅ Step 2 — Update Company Info or Bank */
  static async updateCompany(companyId, payload, updatedBy) {
    // Ensure uniqueness for fields if being updated
    await ensureUniqueCompanyFields(payload, companyId);

    // Map frontend field names to schema field names
    const updateData = { ...payload, updatedBy };
    
    // If frontend sends 'plan', map it to 'planSnapshot'
    if (updateData.plan && !updateData.planSnapshot) {
      updateData.planSnapshot = updateData.plan;
      delete updateData.plan;
    }

    if (updateData.planSnapshot) {
      updateData.isTrialUsed = planIsTrial(updateData.planSnapshot);
    }
    
    // If frontend sends 'effectivePermissions', store it as well
    if (updateData.effectivePermissions) {
      // effectivePermissions is transient and derived from planSnapshot
      // We can store it for quick access if needed, but it's computed from planSnapshot
      delete updateData.effectivePermissions;
    }

    const company = await Company.findByIdAndUpdate(
      companyId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    return company;
  }


  static async signupOrUpdateCompany(payload, userId) {
  const {
    companyId,
    plan: planData,
    addons = [],
    couponCode,
    useWallet
  } = payload;

  /* =========================
     FETCH BASE DATA
  ========================= */
  const company = await Company.findById(companyId);
  if (!company) throw new Error("Company not found");
  // Prefer plan snapshot supplied in payload; fallback to canonical plan doc.
  let planDoc = null;
  // Accept plan snapshot when frontend sends a full plan object (sometimes with an _id present),
  // or when payload explicitly contains planSnapshot. Otherwise, fall back to canonical plan lookup.
  if (planData && (planData.planSnapshot || planData.modulePermissions || planData.pricePaise || planData.name)) {
    planDoc = planData.planSnapshot || planData;
  } else if (company && company.planSnapshot && Object.keys(company.planSnapshot || {}).length) {
    planDoc = company.planSnapshot;
  } else if (planData && planData._id) {
    planDoc = await planModel.findById(planData._id).lean();
  }
  if (!planDoc) throw new Error("Plan not found");

  /* =========================
     BUILD ORDER ITEMS (using planDoc snapshot)
  ========================= */
  const items = [];
  const planPricePaise = Number(planDoc.pricePaise || planDoc.planPricePaise || 0);

  const planIdForOrder = planDoc._id || planDoc.planId || planData?._id || planData?.planId || null;
  if (!planIdForOrder) {
    throw new Error("Plan identifier missing for order creation");
  }
  items.push({
    type: "plan",
    itemId: planIdForOrder,
    name: planDoc.name || planDoc.planSnapshot?.name || '',
    qty: 1,
    priceAtPurchasePaise: planPricePaise,
    lineSubtotalPaise: planPricePaise,
    taxConfig: { hasTax: planDoc.hasTax || false, taxIncluded: !!planDoc.taxIncluded }
  });

  // ✅ Process add-ons with validation
  const invalidAddons = [];
  for (const a of addons) {
    if (!a.addonId) {
      console.warn("⚠️ Addon missing ID:", a);
      invalidAddons.push(a);
      continue;
    }

    const addon = await addonModel.findById(a.addonId);
    if (!addon) {
      console.warn(`⚠️ Addon not found in DB - ID: ${a.addonId}`);
      invalidAddons.push(a);
      continue;
    }

    const qty = Number(a.qty || 1);
    const price = Number(addon.pricePaise || 0);

    items.push({
      type: "addon",
      itemId: addon._id,
      name: addon.name,
      value: addon.value,
      qty,
      priceAtPurchasePaise: price,
      lineSubtotalPaise: price * qty,
      taxConfig: { hasTax: addon.hasTax, taxIncluded: !!addon.taxIncluded }
    });
  }

  // If there are invalid addons, log them for debugging
  if (invalidAddons.length > 0) {
    console.log("❌ Invalid addons detected:", invalidAddons);
  }

  // Persist plan snapshot to company so future operations use this company-specific snapshot
  try {
    const snapshotToStore = planDoc && typeof planDoc.toObject === 'function' ? planDoc.toObject() : { ...planDoc };
    if (!snapshotToStore._id && (planDoc.planId || planData?._id || planData?.planId)) {
      snapshotToStore._id = planDoc._id || planDoc.planId || planData._id || planData?.planId;
    }
    company.planSnapshot = snapshotToStore;
    // Persist selectedAddons in a compact map by addon.value => qty
    try {
      const selected = {};
      for (const a of addons) {
        const addonDoc = await addonModel.findById(a.addonId).lean().catch(() => null);
        if (addonDoc && addonDoc.value) {
          selected[addonDoc.value] = Number(a.qty || 1);
        }
      }
      company.selectedAddons = selected;
    } catch (e) {
      console.error('Failed to build selectedAddons map:', e);
    }

    // If payload provided a company code, persist it as well
    if (payload && payload.code) company.code = payload.code;
    if (companyUsesTrial(company) && !planIsTrial(planDoc)) {
      company.isActualPlanUsed = true;
    }
    if (!planIsTrial(planDoc)) {
      company.isTrialUsed = false;
    }
    // NOTE: Do NOT save here - consolidate all company updates at the end
  } catch (err) {
    console.error('Failed to persist planSnapshot on company:', err);
  }

  // // Recompute effectiveUserLimits from planDoc + requested addons (if any)
  // try {
  //   const effectiveLimits = { ...(planDoc.userPricing || {}) };
  //   if (Array.isArray(addons) && addons.length > 0) {
  //     const addonDocs = await addonModel.find({ _id: { $in: addons.map(a => a.addonId).filter(Boolean) } }).lean().catch(() => []);
  //     const addonMap = {};
  //     addonDocs.forEach(d => { if (d && d._id) addonMap[String(d._id)] = d; });
  //     for (const a of addons) {
  //       const doc = addonMap[String(a.addonId)];
  //       const qty = Number(a.qty || 1);
  //       if (!doc || !doc.provides) continue;
  //       for (const k of Object.keys(doc.provides)) {
  //         const addVal = Number(doc.provides[k] || 0) * qty;
  //         effectiveLimits[k] = (Number(effectiveLimits[k] || 0) + addVal);
  //       }
  //     }
  //   }
  //   company.effectiveUserLimits = effectiveLimits;
  //   await company.save();
  // } catch (e) {
  //   console.error('Failed to compute effectiveUserLimits for company on signup/update:', e);
  // }

  const subtotalPaise = items.reduce((s, i) => s + i.lineSubtotalPaise, 0);

  /* =========================
     COUPON
  ========================= */
  let discounts = [];
  let couponDoc = null;

  if (couponCode) {
    const coupon = await couponModel.findOne({ code: couponCode, isActive: true });
    const now = Date.now();

    if (
      coupon &&
      (!coupon.validFrom || now >= coupon.validFrom) &&
      (!coupon.validTo || now <= coupon.validTo) &&
      (!coupon.minSpendPaise || subtotalPaise >= coupon.minSpendPaise) &&
      (coupon.eligiblePlanCodes.length === 0 || coupon.eligiblePlanCodes.includes(planDoc.code)) &&
      (coupon.maxUses === 0 || coupon.usedCount < coupon.maxUses)
    ) {
      let applied =
        coupon.discountType === CouponType.PERCENT
          ? Math.floor((subtotalPaise * coupon.discountValue) / 100)
          : Number(coupon.discountValue || 0);

      if (coupon.maxDiscountPaise)
        applied = Math.min(applied, coupon.maxDiscountPaise);

      discounts.push({
        couponId: coupon._id,
        couponCode: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAppliedPaise: applied
      });

      couponDoc = coupon;//TODO COUPON USED COUNT INCREMENT LATER
    }
  }

  const totalDiscountPaise = discounts.reduce(
    (s, d) => s + d.discountAppliedPaise,
    0
  );

  /* =========================
     TAX
  ========================= */
  const taxPercent = 18;
  // Compute tax respecting taxIncluded flag per item
  // Items with taxIncluded=true already have tax baked into their price.
  // We calculate the included portion for display but DO NOT add it again on top of subtotal.
  let taxFromIncludedPaise = 0;
  let taxBaseExcludedPaise = 0; // base amounts which require tax on top

  for (const it of items) {
    if (!it.taxConfig?.hasTax) continue;
    if (it.taxConfig?.taxIncluded) {
      const taxPart = Math.round((it.lineSubtotalPaise * taxPercent) / (100+taxPercent));
      taxFromIncludedPaise += taxPart; // for display only
    } else {
      taxBaseExcludedPaise += it.lineSubtotalPaise;
    }
  }

  // Allocate discount to excluded base first (reduces taxable base)
  const discountConsumedOnExcluded = Math.min(totalDiscountPaise, taxBaseExcludedPaise);
  const remainingExcludedBase = Math.max(0, taxBaseExcludedPaise - discountConsumedOnExcluded);

  const taxOnExcludedPaise = Math.round(remainingExcludedBase * (taxPercent / 100));

  // For display, total tax = included portion + added portion. But payable only adds taxOnExcludedPaise.
  const totalTaxPaiseForDisplay = taxFromIncludedPaise + taxOnExcludedPaise;

  const totalPayablePaise = Math.max(0, subtotalPaise - totalDiscountPaise + taxOnExcludedPaise);

  /* =========================
     WALLET CALCULATION
  ========================= */
  let walletDoc = null;
  let walletAppliedPaise = 0;

  if (useWallet === true && totalPayablePaise > 0) {
    walletDoc = await walletModel.findOne({ companyId });
    if (!walletDoc) {
      walletDoc = await walletModel.create({ companyId, balancePaise: 0 });
    }

    walletAppliedPaise = Math.min(
      walletDoc.balancePaise,
      totalPayablePaise
    );
  }

  const amountDuePaise = Math.max(
    0,
    totalPayablePaise - walletAppliedPaise
  );

  let orderStatus = "pending";
  if (walletAppliedPaise > 0 && amountDuePaise > 0)
    orderStatus = "partially_paid";
  if (amountDuePaise === 0)
    orderStatus = "paid";

  /* =========================
     CREATE ORDER (SOURCE OF TRUTH)
  ========================= */
  let orderType = "SUBSCRIPTION_PURCHASE";
  let upgradeFromSubscriptionId = null;
  const wasTrialCompany = companyUsesTrial(company);
  const selectedPlanIsActual = !planIsTrial(planDoc);
  if (wasTrialCompany && selectedPlanIsActual && company.activeSubscriptionId) {
    // For trial-to-actual conversion, mark old trial subscription as EXPIRED instead of deleting
    await subscriptionModel.findByIdAndUpdate(company.activeSubscriptionId, {
      $set: { status: 'EXPIRED', endAt: Date.now() - 1 }
    });
    // Do NOT save here - consolidate with other company updates at the end
    company.activeSubscriptionId = null;
    // Keep orderType as SUBSCRIPTION_PURCHASE for new subscription
  }

  const order = await orderModel.create({
    companyId,
    orderType,
    upgradeFromSubscriptionId,
    items,
    discounts,
    walletUsed: {
      walletId: walletDoc?._id || null,
      amountPaise: walletAppliedPaise
    },
    // payments are recorded in Payment collection; link via paymentIds after creation
    taxBreakdown: totalTaxPaiseForDisplay
      ? [{
          taxName: planDoc.taxName || plan.taxName || "GST",
          percentage: taxPercent,
          taxAmountPaise: totalTaxPaiseForDisplay
        }]
      : [],
    totals: {
      subtotalPaise,
      totalDiscountPaise,
      taxableAmountPaise: remainingExcludedBase,
      totalTaxPaise: totalTaxPaiseForDisplay,
      // includedTaxPaise: taxFromIncludedPaise,
      // excludedTaxPaise: taxOnExcludedPaise,
      planCreditPaise: 0, // No credit for new purchases
      totalPayablePaise
    },
    final: {
      totalPaidPaise: walletAppliedPaise,
      amountDuePaise,
      refundedAmountPaise: 0
    },
    status: orderStatus
  });

  /* =========================
     ACTIVATE SUBSCRIPTION
  ========================= */
  let activatedSubscription = null;
  if (orderStatus === "paid") {
    activatedSubscription = await activateSubscriptionIfEligible(order);
    if (activatedSubscription && activatedSubscription._id) {
      company.activeSubscriptionId = activatedSubscription._id;
    }
  }

  /* =========================
     WALLET DEDUCTION (ATOMIC OP)
  ========================= */
  if (walletAppliedPaise > 0) {
    const walletUpdate = await walletModel.updateOne(
      {
        _id: walletDoc._id,
        balancePaise: { $gte: walletAppliedPaise }
      },
      {
        $inc: { balancePaise: -walletAppliedPaise }
      }
    );

    if (walletUpdate.modifiedCount !== 1) {
      throw new Error("Wallet balance changed. Please retry.");
    }

    await transactionModel.create({
      companyId,
      orderId: order._id,
      type: "WALLET_DEBIT",
      amountPaise: walletAppliedPaise,
      source: "WALLET",
      description: `Wallet payment for order ${order._id}`
    });
    // Create Payment record for wallet debit and link to order
    const walletPayment = await paymentModel.create({
      order: order._id,
      company: companyId,
      amountPaise: walletAppliedPaise,
      method: 'WALLET',
      status: 'SUCCESS',
      transactionId: 'WALLET',
      createdBy: userId
    });
    order.paymentIds = order.paymentIds || [];
    order.paymentIds.push(walletPayment._id);
    await order.save();
  }

  /* =========================
     CONSOLIDATE & UPDATE COMPANY (SINGLE SAVE)
  ========================= */
  // Update company with all changes in one place
  try {
    let newCompanyStatus = 'pending_payment';
    if (orderStatus === 'paid') {
      newCompanyStatus = 'active';
    } else if (orderStatus === 'partially_paid') {
      newCompanyStatus = 'partially_paid';
    }
    
    // Merge all company updates
    const companyUpdates = {
      status: newCompanyStatus,
      planSnapshot: company.planSnapshot,
      selectedAddons: company.selectedAddons,
      code: company.code,
      isActualPlanUsed: company.isActualPlanUsed,
      isTrialUsed: company.isTrialUsed,
      activeSubscriptionId: company.activeSubscriptionId,
      updatedBy: userId
    };
    
    // Perform single update
    await Company.findByIdAndUpdate(companyId, { $set: companyUpdates }, { new: true }).catch(() => null);
  } catch (e) {
    console.error('Failed to update company on signup:', e);
  }

  return { company, order };
}

  static async suspendCompany(companyId, reason) {
    const c = await Company.findByIdAndUpdate(
      companyId,
      { status: "SUSPENDED", statusReason: reason },
      { new: true }
    );
    // audit job
    await enqueueJob({
      type: "audit.log_event",
      payload: {
        action: "suspend",
        entityType: "Company",
        entityId: companyId,
        reason,
      },
      priority: 10,
    });
    return c;
  }

  // 📁 src/saas/services/company.service.js (or controller)

  static async listCompanies({
    page = 1,
    limit = 10,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  }) {
    const skip = (page - 1) * Number(limit);

    // 🔍 Match filter (exclude deleted)
    const match = { isDeleted: { $ne: true } };
    if (search?.trim()) {
      match.name = { $regex: search.trim(), $options: "i" };
    }

    // 🧩 Aggregation pipeline
    const pipeline = [
      { $match: match },

      // ✅ Join Subscription to get plan expiry (company stores activeSubscriptionId)
      {
        $lookup: {
          from: "subscriptions",
          localField: "activeSubscriptionId",
          foreignField: "_id",
          as: "subscription",
        },
      },
      {
        $unwind: {
          path: "$subscription",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "orders",
          let: { companyId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$companyId", "$$companyId"] } } },
            { $sort: { createdAt: -1 } }
            // Removed $limit: 1 to get ALL orders
          ],
          as: "allOrders",
        },
      },

      // ✅ Project only required fields for frontend
      {
        $project: {
          name: 1,
          email: "$contact.email",
          status: 1,
          // Get the latest order for plan details
          lastOrder: {
            $cond: [
              { $gt: [{ $size: "$allOrders" }, 0] },
              { $arrayElemAt: ["$allOrders", 0] },
              null
            ]
          },
          // Include ALL orders for payment history list
          allOrders: {
            $map: {
              input: "$allOrders",
              as: "order",
              in: {
                _id: "$$order._id",
                orderNumber: "$$order.orderNumber",
                totalAmount: { $divide: [{ $ifNull: ["$$order.totals.totalPayablePaise", 0] }, 100] },
                planName: {
                  $first: {
                    $map: {
                      input: {
                        $filter: {
                          input: "$$order.items",
                          as: "it",
                          cond: { $eq: ["$$it.type", "plan"] }
                        }
                      },
                      as: "p",
                      in: "$$p.name"
                    }
                  }
                },
                status: "$$order.status",
                payments: [],
                createdAt: "$$order.createdAt",
                updatedAt: "$$order.updatedAt"
              }
            }
          },
          // Pull plan details from subscription snapshot (if any), fallback to latest order's plan item
          "plan.name": {
            $ifNull: [
              "$subscription.planSnapshot.name",
              {
                $first: {
                  $map: {
                    input: {
                      $filter: {
                        input: { $ifNull: [{ $arrayElemAt: ["$allOrders.items", 0] }, []] },
                        as: "it",
                        cond: { $eq: ["$$it.type", "plan"] },
                      },
                    },
                    as: "p",
                    in: "$$p.name",
                  },
                },
              }
            ],
          },
          "plan.pricePaise": {
            $ifNull: [
              "$subscription.planPricePaise",
              {
                $first: {
                  $map: {
                    input: {
                      $filter: {
                        input: { $ifNull: [{ $arrayElemAt: ["$allOrders.items", 0] }, []] },
                        as: "it",
                        cond: { $eq: ["$$it.type", "plan"] },
                      },
                    },
                    as: "p",
                    in: "$$p.priceAtPurchasePaise",
                  },
                },
              }
            ],
          },
          // subscription.endAt contains timestamp (ms)
          planExpiry: "$subscription.endAt",
          // Expose plan durationDays from subscription snapshot if available
          "plan.durationDays": { $ifNull: ["$subscription.planSnapshot.durationDays", null] },
          createdAt: 1,
        },
      },

      // ✅ Apply sorting AFTER project
      {
        $sort: {
          [sortBy]: sortOrder === "desc" ? -1 : 1,
        },
      },

      // ✅ Pagination + total count
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: Number(limit) }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await Company.aggregate(pipeline);

    const items = result[0]?.items || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    // ✅ Return formatted data
    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      sortBy,
      sortOrder,
    };
  }

  // Fetch company by ID for edit(some keys only)
  static async getCompanyById(companyId) {
    const company = await Company.findById(companyId).lean();
    if (!company) return null;

    if (company.activeSubscriptionId) {
      const subscription = await subscriptionModel.findById(company.activeSubscriptionId).lean().catch(() => null);
      if (subscription) {
        company.subscription = subscription;
      }
    }

    return company;
  }

  // ✅ Fetch transactions for a company
  static async getCompanyTransactions(companyId, limit = 50, skip = 0) {
    const transactions = await transactionModel
      .find({ companyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    return transactions;
  }

  // ✅ Get total transaction count for company
  static async getCompanyTransactionsCount(companyId) {
    return await transactionModel.countDocuments({ companyId });
  }

  static async recordCashPayment({ companyId, orderId, cashReceiptNo, createdBy }) {
    try {
      // 1. Validate required inputs
      if (!cashReceiptNo || !cashReceiptNo.trim()) {
        throw new Error("cashReceiptNo is required");
      }

      if (!orderId) {
        throw new Error("orderId is required");
      }

      // 2. Fetch order
      const order = await orderModel.findById(orderId);
      if (!order) {
        throw new Error("Order not found");
      }

      // 3. Verify order belongs to company
      if (order.companyId.toString() !== companyId.toString()) {
        throw new Error("Order does not belong to this company");
      }

      // 4. Block duplicate payment AFTER activation
      if (order.status === "paid" && order.subscriptionId) {
        throw new Error("Order already paid and subscription activated");
      }

      // 5. Idempotency & global uniqueness check: ensure the cash receipt hasn't been used elsewhere
      const existingPayment = await paymentModel.findOne({ company: companyId, transactionId: cashReceiptNo.trim() }).lean();
      if (existingPayment) {
        throw new Error("Cash receipt already recorded for this company/order");
      }

      const existingTx = await transactionModel.findOne({ reference: cashReceiptNo.trim() });
      if (existingTx) {
        throw new Error("Cash receipt already used for another payment");
      }

      // 6. Validate amount due
      const amountPaise = order.final?.amountDuePaise;
      if (!amountPaise || amountPaise <= 0) {
        throw new Error("No amount due for this order");
      }

      // 7. Create a Payment document (payments are stored separately)
      const paymentDoc = await paymentModel.create({
        order: order._id,
        company: companyId,
        amountPaise,
        method: 'OFFLINE',
        status: 'SUCCESS',
        transactionId: cashReceiptNo.trim(),
        approvedBy: createdBy,
        createdBy,
      });

      // 8. Link payment to order (store paymentIds array)
      order.paymentIds = order.paymentIds || [];
      order.paymentIds.push(paymentDoc._id);

      // 9. Update final amounts on order
      order.final.totalPaidPaise = (order.final?.totalPaidPaise || 0) + amountPaise;
      order.final.amountDuePaise = Math.max(
        0,
        (order.totals?.totalPayablePaise || 0) - order.final.totalPaidPaise
      );

      // 10. Update order status
      order.status = order.final.amountDuePaise === 0 ? "paid" : "partially_paid";

      // 11. Save order
      await order.save();

      // 12. Create transaction record
      await transactionModel.create({
        companyId,
        type: "CASH_PAYMENT",
        amountPaise,
        source: "CASH",
        reference: cashReceiptNo.trim(),
        orderId,
        description: `Cash payment recorded for order ${orderId}`,
        status: "COMPLETED",
        createdBy,
      });

      // 13. Activate subscription if fully paid
      let subscription = null;
      if (order.status === "paid") {
        subscription = await activateSubscriptionIfEligible(order);
      }

      // 14. Update company status based on order payment status
      try {
        let newCompanyStatus = 'pending_payment';
        if (order.status === 'paid') {
          newCompanyStatus = 'active';
        } else if (order.status === 'partially_paid') {
          newCompanyStatus = 'partially_paid';
        }
        await Company.findByIdAndUpdate(companyId, { $set: { status: newCompanyStatus } }).catch(() => null);
      } catch (e) {
        console.error('Failed to update company status on cash payment:', e);
      }

      return {
        orderId,
        companyId,
        amountPaise,
        paymentMethod: "cash",
        reference: cashReceiptNo.trim(),
        status: "completed",
        subscriptionId: subscription?._id || null,
        message: "Cash payment recorded successfully. Subscription activated.",
      };
    } catch (err) {
      console.error("Error recording cash payment:", err);
      throw err;
    }
  }

  // ========================= UPGRADE SUBSCRIPTION =========================
  static async upgradeSubscription({ subscriptionId, newPlanId, couponCode, useWallet, addons = [], createdBy }) {
    try {
      const now = Date.now();

      // Validate subscription
      const subscription = await subscriptionModel.findById(subscriptionId);
      if (!subscription) throw new Error("Subscription not found");
      if (subscription.status !== "ACTIVE") throw new Error("Only ACTIVE subscriptions can be upgraded");

      // Validate plans
      const oldPlan = subscription.planSnapshot && Object.keys(subscription.planSnapshot || {}).length ? subscription.planSnapshot : (await loadCompanyPlanSnapshot(subscription.companyId)) || await planModel.findById(subscription.planId);
      const newPlan = newPlanId//await planModel.findById(newPlanId);

      if (!newPlan) throw new Error("New plan not found");
      if ((newPlan.pricePaise || 0) <= (oldPlan.pricePaise || 0)) {
        throw new Error("Upgrade must be to a higher-priced plan");
      }

      // Validate company and limits
      const company = await Company.findById(subscription.companyId);
      if (!company) throw new Error("Company not found");

      const currentUsage = company.usage || {};
      const planLimits = newPlan.userPricing || {};
      const addonLimits = {};
      // include existing subscription addons
      for (const addon of subscription.addonSnapshot || []) {
        addonLimits[addon.value] = (addonLimits[addon.value] || 0) + addon.qty;
      }
      // include incoming addons (from upgrade payload) so their provides/counts are considered
      if (Array.isArray(addons) && addons.length > 0) {
        // load addon docs to map value -> provides
        const addonDocs = await addonModel.find({ _id: { $in: addons.map(a => a.addonId).filter(Boolean) } }).lean();
        const addonDocMap = {};
        addonDocs.forEach(d => { if (d && d.value) addonDocMap[String(d._id)] = d; });
        for (const a of addons) {
          const doc = addonDocMap[String(a.addonId)];
          const qty = Number(a.qty || 1);
          if (!doc) continue;
          // if addon provides userLimits keys, add qty to corresponding value key counts
          if (doc.provides && typeof doc.provides === 'object') {
            for (const k of Object.keys(doc.provides)) {
              const addVal = Number(doc.provides[k] || 0) * qty;
              addonLimits[k] = (addonLimits[k] || 0) + addVal;
            }
          }
          // also keep a simple count per addon.value for reference
          addonLimits[doc.value] = (addonLimits[doc.value] || 0) + qty;
        }
      }

      for (const key of Object.keys(currentUsage)) {
        const allowed = (planLimits[key] || 0) + (addonLimits[key] || 0);
        if (allowed < currentUsage[key]) {
          throw new Error(`Upgrade violates ${key} limit (allowed ${allowed}, used ${currentUsage[key]})`);
        }
      }

      // Calculate proration
      const totalDays = Math.max(1, Math.ceil((subscription.endAt - subscription.startAt) / DAY_MS));
      const remainingDays = Math.max(0, Math.ceil((subscription.endAt - now) / DAY_MS));

      let paidAmount = subscription.planPricePaise || 0;
      if (subscription.activatedByOrderId) {
        const order = await orderModel.findById(subscription.activatedByOrderId);
        if (order?.final?.totalPaidPaise) paidAmount = order.final.totalPaidPaise;
      }

      const remainingValue = Math.round((paidAmount / totalDays) * remainingDays);
      const subtotal = newPlan.pricePaise;

      // Handle coupon using CouponService.validateAndApply which validates and
      // returns discountPaise + finalAmountPaise. We record discount in order.discounts.
      let discounts = [];
      let totalDiscount = 0;
      if (couponCode) {
        try {
          const applied = await CouponService.validateAndApply(couponCode, newPlan.code, subtotal);
          const c = applied.coupon;
          discounts.push({ couponId: c._id, couponCode: c.code, discountType: c.discountType, discountValue: c.discountValue, discountAppliedPaise: applied.discountPaise });
          totalDiscount = applied.discountPaise || 0;
        } catch (e) {
          throw new Error(`Coupon invalid: ${e.message}`);
        }
      }

      // Tax calculation respecting taxIncluded on new plan
      const taxPercent = 18;
      let taxFromIncluded = 0;
      let taxOnExcluded = 0;
      const subtotalAfterDiscount = Math.max(0, subtotal - totalDiscount);

      if (newPlan.hasTax && newPlan.taxIncluded) {
        taxFromIncluded = Math.round((subtotal * taxPercent) / (100 + taxPercent));
        taxOnExcluded = 0;
      } else if (newPlan.hasTax) {
        taxOnExcluded = Math.round(subtotalAfterDiscount * (taxPercent / 100));
      }

      const totalTax = newPlan.hasTax ? taxFromIncluded + taxOnExcluded : 0;
      const totalPayable = Math.max(0, subtotalAfterDiscount + taxOnExcluded - remainingValue);

      // Wallet handling
      let walletApplied = 0;
      let wallet = null;

      if (useWallet && totalPayable > 0) {
        wallet = await walletModel.findOne({ companyId: company._id });
        if (wallet) walletApplied = Math.min(wallet.balancePaise, totalPayable);
      }

      const amountDue = Math.max(0, totalPayable - walletApplied);

      // Create order items (include requested addons if any)
      const items = [{
        type: "plan",
        itemId: newPlan._id,
        name: newPlan.name,
        qty: 1,
        priceAtPurchasePaise: newPlan.pricePaise,
        lineSubtotalPaise: newPlan.pricePaise,
        taxConfig: { hasTax: newPlan.hasTax }
      }];

      if (Array.isArray(addons) && addons.length > 0) {
        const addonDocs = await addonModel.find({ _id: { $in: addons.map(a => a.addonId).filter(Boolean) } }).lean();
        const addonMap = {};
        addonDocs.forEach(a => { addonMap[String(a._id)] = a; });
        for (const a of addons) {
          const doc = addonMap[String(a.addonId)];
          if (!doc) continue;
          const qty = Math.max(1, Number(a.qty || 1));
          items.push({
            type: "addon",
            itemId: doc._id,
            name: doc.name,
            value: doc.value,
            qty,
            priceAtPurchasePaise: doc.pricePaise,
            lineSubtotalPaise: doc.pricePaise * qty,
            taxConfig: { hasTax: !!doc.hasTax, taxIncluded: !!doc.taxIncluded },
            provides: doc.provides || null,
            addonType: doc.type || 'limit'
          });
        }
      }

      const orderStatus = amountDue === 0 ? "paid" : walletApplied > 0 ? "partially_paid" : "pending";

      const order = await orderModel.create({
        companyId: company._id,
        orderType: "SUBSCRIPTION_UPGRADE",
        upgradeFromSubscriptionId: subscriptionId,
        items,
        discounts,
        walletUsed: {
          walletId: wallet?._id || null,
          amountPaise: walletApplied,
        },
        // payments will be recorded in Payment collection and linked after creation
        taxBreakdown: totalTax
          ? [{
            taxName: newPlan.taxName || "GST",
            percentage: 18,
            taxAmountPaise: totalTax,
          }]
          : [],
        totals: {
          subtotalPaise: subtotal,
          totalDiscountPaise: totalDiscount,
          taxableAmountPaise: subtotalAfterDiscount,
          totalTaxPaise: totalTax,
          includedTaxPaise: taxFromIncluded,
          excludedTaxPaise: taxOnExcluded,
          planCreditPaise: remainingValue,
          totalPayablePaise: totalPayable,
        },
        final: {
          totalPaidPaise: walletApplied,
          amountDuePaise: amountDue,
          refundedAmountPaise: 0,
        },
        status: orderStatus,
        meta: {
          upgradeFromSubscriptionId: subscriptionId,
          intendedStartAt: now,
        },
        createdBy,
      });

        // Activate subscription / apply addons if order is paid or partially_paid
        let newSubscription = null;
        if (order.status === "paid" || order.status === "partially_paid") {
          // increment coupon usage for applied coupon (best-effort)
          if (couponCode) {
            try { await CouponService.incrementUsage(couponCode); } catch (e) { /* ignore */ }
          }
          // Activate or update subscription
          newSubscription = await activateSubscriptionIfEligible(order);

          // Apply addon items to subscription/company similar to purchaseAddons
          try {
            // find active subscription (may be newSubscription or existing)
            const activeSub = newSubscription || await subscriptionModel.findOne({ companyId: company._id, status: 'ACTIVE' });
            const addonItems = (items || []).filter(it => it.type === 'addon');
            if (activeSub && addonItems.length) {
              const existing = activeSub.addonSnapshot || [];
              const existingMap = {};
              existing.forEach(a => { if (a && a.value) existingMap[a.value] = a; });
              for (const it of addonItems) {
                const doc = await addonModel.findById(it.itemId).lean();
                if (!doc) continue;
                const val = doc.value;
                if (existingMap[val]) {
                  existingMap[val].qty = (existingMap[val].qty || 0) + (it.qty || 1);
                } else {
                  const now = Date.now();
                  const durationDays = doc.durationDays || null;
                  const endAt = durationDays ? now + (durationDays * DAY_MS) : null;
                  existingMap[val] = {
                    addonId: it.itemId,
                    name: it.name,
                    value: val,
                    qty: it.qty || 1,
                    pricePaise: it.priceAtPurchasePaise,
                    hasTax: it.taxConfig?.hasTax || (doc && doc.hasTax) || false,
                    taxIncluded: it.taxConfig?.taxIncluded || (doc && doc.taxIncluded) || false,
                    provides: doc?.provides || null,
                    type: doc?.type || 'limit',
                    durationDays: durationDays,
                    startAt: now,
                    endAt: endAt,
                  };
                }
              }
              const merged = Object.values(existingMap);
              activeSub.addonSnapshot = merged;
              activeSub.addonPricePaise = merged.reduce((s,a) => s + (a.pricePaise || 0) * (a.qty || 1), 0);
              await activeSub.save();

              // update company.selectedAddons map
              const companyMap = company.selectedAddons || {};
              merged.forEach(a => { if (a && a.value) companyMap[a.value] = (companyMap[a.value] || 0) + (a.qty || 0); });
              company.selectedAddons = companyMap;
              // Recompute effectiveUserLimits from plan + subscription.addonSnapshot
              try {
                const planPricing = activeSub.planSnapshot && activeSub.planSnapshot.userPricing ? activeSub.planSnapshot.userPricing : {};
                const effectiveLimits = { ...(planPricing || {}) };
                (activeSub.addonSnapshot || []).forEach((a) => {
                  if (a && a.provides && typeof a.provides === 'object') {
                    for (const k of Object.keys(a.provides)) {
                      const addVal = Number(a.provides[k] || 0) * Number(a.qty || 1);
                      effectiveLimits[k] = (Number(effectiveLimits[k] || 0) + addVal);
                    }
                  }
                });
                company.effectiveUserLimits = effectiveLimits;
              } catch (e) {
                // ignore errors here
              }
              await company.save();
            }
          } catch (e) {
            console.error('Failed to apply addons during upgrade:', e);
          }
        }

      // Deduct wallet
      if (walletApplied > 0 && wallet) {
        wallet.balancePaise -= walletApplied;
        await wallet.save();
        await transactionModel.create({
          companyId: company._id,
          orderId: order._id,
          type: "WALLET_DEBIT",
          amountPaise: walletApplied,
          source: "WALLET",
          description: `Wallet debit for upgrade order ${order._id}`,
          createdBy,
        });
        // record payment document and link to order
        const wp = await paymentModel.create({ order: order._id, company: company._id, amountPaise: walletApplied, method: 'WALLET', status: 'SUCCESS', transactionId: 'WALLET', createdBy });
        order.paymentIds = order.paymentIds || [];
        order.paymentIds.push(wp._id);
        await order.save();
      }

      // Update company planSnapshot to new plan
      try {
        const snapshotToStore = newPlan && typeof newPlan.toObject === 'function' ? newPlan.toObject() : { ...newPlan };
        await Company.findByIdAndUpdate(company._id, { $set: { planSnapshot: snapshotToStore } });
      } catch (e) {
        console.error('Failed to update company planSnapshot on upgrade:', e);
      }

      // Update company status based on order payment status
      try {
        let newCompanyStatus = 'pending_payment';
        if (orderStatus === 'paid') {
          newCompanyStatus = 'active';
        } else if (orderStatus === 'partially_paid') {
          newCompanyStatus = 'partially_paid';
        }
        await Company.findByIdAndUpdate(company._id, { $set: { status: newCompanyStatus } }).catch(() => null);
      } catch (e) {
        console.error('Failed to update company status on upgrade:', e);
      }

      // // If order was NOT paid (no new active subscription), ensure company reflects
      // // selected addons and effective limits derived from plan snapshot + carried addons
      // if (!newSubscription) {
      //   try {
      //     // Build selectedAddons map from carriedAddons
      //     const selectedAddonsMap = {};
      //     (carriedAddons || []).forEach(a => { if (a && a.value) selectedAddonsMap[a.value] = (selectedAddonsMap[a.value] || 0) + (a.qty || 1); });

      //     // Compute effective limits from plan snapshot + carriedAddons.provides
      //     const planSnapshot = plan && plan.userPricing ? plan : (company.planSnapshot || {});
      //     const effectiveLimits = { ...((planSnapshot && planSnapshot.userPricing) ? planSnapshot.userPricing : {}) };
      //     for (const a of (carriedAddons || [])) {
      //       if (!a || !a.provides) continue;
      //       for (const k of Object.keys(a.provides)) {
      //         const addVal = Number(a.provides[k] || 0) * Number(a.qty || 1);
      //         effectiveLimits[k] = (Number(effectiveLimits[k] || 0) + addVal);
      //       }
      //     }

      //     await Company.updateOne({ _id: company._id }, { $set: { selectedAddons: selectedAddonsMap, effectiveUserLimits: effectiveLimits } }).catch(() => {});
      //   } catch (e) {
      //     console.error('Failed to update company selectedAddons/effectiveUserLimits after reactivation order:', e);
      //   }
      // }

      return {
        success: true,
        orderId: order._id,
        order,
        newSubscription: newSubscription || null,
        amountDuePaise: amountDue,
        remainingValuePaise: remainingValue,
        message: "Upgrade order created successfully",
      };
    } catch (err) {
      console.error("Error upgrading subscription:", err);
      throw err;
    }
  }

  // ========================= CALCULATE UPGRADE PRORATION =========================
  static async calculateUpgradeProration({ subscriptionId, newPlanId }) {
    try {
      const now = Date.now();

      // Validate subscription
      const subscription = await subscriptionModel.findById(subscriptionId);
      if (!subscription) throw new Error("Subscription not found");
      if (subscription.status !== "ACTIVE") throw new Error("Only ACTIVE subscriptions can be upgraded");

      // Validate plans
      const oldPlan = subscription.planSnapshot && Object.keys(subscription.planSnapshot || {}).length
        ? subscription.planSnapshot
        : (await loadCompanyPlanSnapshot(subscription.companyId)) || await planModel.findById(subscription.planId);
      const newPlan = await planModel.findById(newPlanId);

      if (!newPlan) throw new Error("New plan not found");
      if ((newPlan.pricePaise || 0) <= (oldPlan.pricePaise || 0)) {
        throw new Error("Upgrade must be to a higher-priced plan");
      }

      // Calculate proration
      const totalDays = Math.max(1, Math.ceil((subscription.endAt - subscription.startAt) / DAY_MS));
      const remainingDays = Math.max(0, Math.ceil((subscription.endAt - now) / DAY_MS));

      let paidAmount = subscription.planPricePaise || 0;
      if (subscription.activatedByOrderId) {
        const order = await orderModel.findById(subscription.activatedByOrderId);
        if (order?.final?.totalPaidPaise) paidAmount = order.final.totalPaidPaise;
      }

      const remainingValue = Math.round((paidAmount / totalDays) * remainingDays);
      const subtotal = newPlan.pricePaise;

      return {
        remainingValuePaise: remainingValue,
        subtotalPaise: subtotal,
      };
    } catch (err) {
      console.error("Error calculating upgrade proration:", err);
      throw err;
    }
  }

  /**
   * Schedule a plan change (downgrade or any change) to be applied at the next billing cycle.
   * Stores a planSnapshot on the subscription.scheduledChange with effectiveAt = current endAt + 1
   */
  static async schedulePlanChange({ subscriptionId, newPlanId, requestedBy }) {
    const subscription = await subscriptionModel.findById(subscriptionId);
    if (!subscription) throw new Error('Subscription not found');

    const plan = await planModel.findById(newPlanId).lean();
    if (!plan) throw new Error('Target plan not found');

    const planSnapshot = {
      planId: plan._id,
      code: plan.code,
      name: plan.name,
      billingCycle: plan.billingCycle,
      durationDays: plan.durationDays,
      pricePaise: plan.pricePaise,
      userPricing: plan.userPricing,
      modulePermissions: plan.modulePermissions
    };

    // Effective at next billing start
    const effectiveAt = (subscription.endAt || Date.now()) + 1;

    // only store scheduling metadata here; plan snapshot is available via subscription.planSnapshot when applied
    subscription.scheduledChange = {
      effectiveAt,
      requestedBy,
      createdAt: Date.now()
    };

    await subscription.save();

    // Also persist intention on company for quick access
    await Company.updateOne({ _id: subscription.companyId }, { $set: { 'settings.scheduledPlanChange': { planCode: plan.code, effectiveAt } } });

    return { subscriptionId, scheduledChange: subscription.scheduledChange };
  }

  /**
   * Purchase addons for a company. Creates an order of type ADDON_PURCHASE.
   * If paid immediately (wallet covers) the addon quantities are applied to
   * the active subscription and company.selectedAddons is updated.
   * addons: [{ addonId, qty }]
   */
  static async purchaseAddons({ companyId, addons = [], useWallet = false, createdBy }) {
    const couponCode = arguments[0].couponCode || null;
    const company = await Company.findById(companyId);
    if (!company) throw new Error('Company not found');

    // Load addons
    const addonDocs = await addonModel.find({ _id: { $in: addons.map(a => a.addonId) } }).lean();
    const addonMap = {};
    addonDocs.forEach(a => { addonMap[String(a._id)] = a; });

    const items = [];
    for (const a of addons) {
      const doc = addonMap[String(a.addonId)];
      if (!doc) throw new Error(`Addon not found: ${a.addonId}`);
      const qty = Math.max(1, Number(a.qty || 1));
      items.push({
        type: 'addon',
        itemId: doc._id,
        name: doc.name,
        value: doc.value,
        qty,
        priceAtPurchasePaise: doc.pricePaise,
        lineSubtotalPaise: doc.pricePaise * qty,
        taxConfig: { hasTax: !!doc.hasTax, taxIncluded: !!doc.taxIncluded },
        provides: doc.provides || null,
        addonType: doc.type || 'limit'
      });
    }

    const subtotalPaise = items.reduce((s,i) => s + (i.lineSubtotalPaise || 0), 0);

    // Apply coupon (if any) on subtotal first, using CouponService helper
    let coupon = null;
    let discountPaise = 0;
    let discountedSubtotal = subtotalPaise;
    if (couponCode) {
      const cs = require('./coupon.service');
      try {
        const applied = await cs.validateAndApply(couponCode, null, subtotalPaise);
        coupon = applied.coupon;
        discountPaise = applied.discountPaise || 0;
        discountedSubtotal = applied.finalAmountPaise;
      } catch (e) {
        throw new Error(`Coupon invalid: ${e.message}`);
      }
    }


    // Tax handling: respect addon-level taxIncluded flag. We'll compute included tax (for display)
    // and tax to add (exclusive) separately. Only exclusive tax is added to payable amount.
    const taxPercent = 18;
    let includedTaxPaise = 0;
    let exclusiveTaxBase = 0;
    const taxableTotal = items.filter(it => it.taxConfig?.hasTax).reduce((s,it)=>s+it.lineSubtotalPaise,0);
    const taxableIncludedTotal = items.filter(it => it.taxConfig?.hasTax && it.taxConfig?.taxIncluded).reduce((s,it)=>s+it.lineSubtotalPaise,0);
    const taxableExclusiveTotal = items.filter(it => it.taxConfig?.hasTax && !it.taxConfig?.taxIncluded).reduce((s,it)=>s+it.lineSubtotalPaise,0);

    // Allocate discount proportionally across subtotal then split across included/exclusive taxable buckets
    const discountOnTaxable = taxableTotal > 0 ? Math.round((taxableTotal / subtotalPaise) * discountPaise) : 0;
    const discountOnIncluded = taxableTotal > 0 ? Math.round((taxableIncludedTotal / taxableTotal) * discountOnTaxable) : 0;
    const discountOnExclusive = discountOnTaxable - discountOnIncluded;

    const taxableIncludedAfterDiscount = Math.max(0, taxableIncludedTotal - discountOnIncluded);
    const taxableExclusiveAfterDiscount = Math.max(0, taxableExclusiveTotal - discountOnExclusive);

    // included tax portion (for display only)
    if (taxableIncludedAfterDiscount > 0) {
      includedTaxPaise = Math.round(taxableIncludedAfterDiscount * (taxPercent / (100 + taxPercent)));
    }

    // tax to add on exclusive-tax items
    let exclusiveTaxPaise = 0;
    if (taxableExclusiveAfterDiscount > 0) {
      exclusiveTaxPaise = Math.round(taxableExclusiveAfterDiscount * (taxPercent / 100));
    }

    const totalTaxPaise = includedTaxPaise + exclusiveTaxPaise;

    const totalPayablePaise = Math.max(0, discountedSubtotal + exclusiveTaxPaise);

    // Wallet handling
    let walletApplied = 0;
    let walletDoc = null;
    if (useWallet && totalPayablePaise > 0) {
      walletDoc = await walletModel.findOne({ companyId });
      if (!walletDoc) walletDoc = await walletModel.create({ companyId, balancePaise: 0 });
      walletApplied = Math.min(walletDoc.balancePaise, totalPayablePaise);
    }

    const amountDuePaise = Math.max(0, totalPayablePaise - walletApplied);

    // Prepare discounts array
    const discounts = [];
    if (coupon && coupon.code) {
      discounts.push({ couponId: coupon._id, couponCode: coupon.code, discountType: coupon.discountType || 'fixed', discountAppliedPaise: discountPaise });
    }

    const totalsObj = {
      subtotalPaise,
      totalDiscountPaise: discountPaise,
      taxableAmountPaise: Math.max(0, taxableTotal - discountOnTaxable),
      totalTaxPaise: totalTaxPaise,
      totalPayablePaise
    };

    const order = await orderModel.create({
      companyId,
      orderType: 'ADDON_PURCHASE',
      items,
      totals: totalsObj,
      discounts,
      walletUsed: walletApplied > 0 ? { walletId: walletDoc?._id || null, amountPaise: walletApplied } : undefined,
      taxBreakdown: [],
      final: { totalPaidPaise: walletApplied, amountDuePaise },
      status: amountDuePaise === 0 ? 'paid' : (walletApplied > 0 ? 'partially_paid' : 'pending'),
      // payments are stored in Payment collection; link via paymentIds when applicable
    });

    // Deduct wallet if used
    if (walletApplied > 0) {
      const upd = await walletModel.updateOne({ _id: walletDoc._id, balancePaise: { $gte: walletApplied } }, { $inc: { balancePaise: -walletApplied } });
      if (upd.modifiedCount !== 1) throw new Error('Wallet balance changed. Retry');
      await transactionModel.create({ companyId, orderId: order._id, type: 'WALLET_DEBIT', amountPaise: walletApplied, source: 'WALLET', description: `Wallet payment for addons order ${order._id}`, createdBy });
      const walletPayment = await paymentModel.create({ order: order._id, company: companyId, amountPaise: walletApplied, method: 'WALLET', status: 'SUCCESS', transactionId: 'WALLET', createdBy });
      order.paymentIds = order.paymentIds || [];
      order.paymentIds.push(walletPayment._id);
      await order.save();
    }

    // Build taxBreakdown for the order (include both included and to-add taxes)
    const taxBreakdown = [];
    if (includedTaxPaise > 0) {
      taxBreakdown.push({ taxName: 'GST', percentage: taxPercent, taxAmountPaise: includedTaxPaise, included: true });
    }
    if (exclusiveTaxPaise > 0) {
      taxBreakdown.push({ taxName: 'GST', percentage: taxPercent, taxAmountPaise: exclusiveTaxPaise, included: false });
    }
    if (taxBreakdown.length) {
      order.taxBreakdown = taxBreakdown;
      await order.save();
    }

    // If there is an unpaid remainder assume an offline/direct payment and mark order paid
    if (amountDuePaise > 0) {
      // create transaction record (use allowed enums: CASH_PAYMENT / CASH)
      await transactionModel.create({ companyId, orderId: order._id, type: 'CASH_PAYMENT', amountPaise: amountDuePaise, source: 'CASH', description: `Offline payment for addons order ${order._id}`, createdBy });
      // create a Payment document marked SUCCESS
      const offlinePayment = await paymentModel.create({ order: order._id, company: companyId, amountPaise: amountDuePaise, method: 'OFFLINE', status: 'SUCCESS', transactionId: 'OFFLINE', createdBy });
      order.paymentIds = order.paymentIds || [];
      order.paymentIds.push(offlinePayment._id);
      order.final = order.final || { totalPaidPaise: 0, amountDuePaise };
      order.final.totalPaidPaise = (order.final.totalPaidPaise || 0) + amountDuePaise;
      order.final.amountDuePaise = 0;
      order.status = 'paid';
      await order.save();
    }

    // If paid, apply addons to active subscription
    if (order.status === 'paid' || order.status === 'partially_paid') {
      // Increment coupon usage if applied
      if (coupon && coupon.code) {
        try { await require('./coupon.service').incrementUsage(coupon.code); } catch (e) { /* ignore */ }
      }
      const subscription = await subscriptionModel.findOne({ companyId, status: 'ACTIVE' });
      if (subscription) {
        // merge addonSnapshot
        const existing = subscription.addonSnapshot || [];
        const existingMap = {};
        existing.forEach(a => { if (a && a.value) existingMap[a.value] = a; });
        for (const it of items) {
          const addonDoc = addonDocs.find(ad => String(ad._id) === String(it.itemId));
          if (!addonDoc) continue;
          const val = addonDoc.value;
          if (existingMap[val]) {
            existingMap[val].qty = (existingMap[val].qty || 0) + (it.qty || 1);
          } else {
            const now = Date.now();
            const durationDays = addonDoc.durationDays || null;
            const endAt = durationDays ? now + (durationDays * DAY_MS) : null;
            existingMap[val] = {
              addonId: it.itemId,
              name: it.name,
              value: val,
              qty: it.qty || 1,
              pricePaise: it.priceAtPurchasePaise,
              hasTax: it.taxConfig?.hasTax || (addonDoc && addonDoc.hasTax) || false,
              taxIncluded: it.taxConfig?.taxIncluded || (addonDoc && addonDoc.taxIncluded) || false,
              provides: addonDoc?.provides || null,
              type: addonDoc?.type || 'limit',
              durationDays: durationDays,
              startAt: now,
              endAt: endAt,
            };
          }
        }
        const merged = Object.values(existingMap);
        subscription.addonSnapshot = merged;
        subscription.addonPricePaise = merged.reduce((s,a) => s + (a.pricePaise || 0) * (a.qty || 1), 0);
        await subscription.save();

        // update company.selectedAddons map
        const companyMap = company.selectedAddons || {};
        merged.forEach(a => { if (a && a.value) companyMap[a.value] = (companyMap[a.value] || 0) + (a.qty || 0); });
        company.selectedAddons = companyMap;
        // Recompute effectiveUserLimits from plan + subscription.addonSnapshot
        try {
          const planPricing = subscription.planSnapshot && subscription.planSnapshot.userPricing ? subscription.planSnapshot.userPricing : {};
          const effectiveLimits = { ...(planPricing || {}) };
          (subscription.addonSnapshot || []).forEach((a) => {
            if (a && a.provides && typeof a.provides === 'object') {
              for (const k of Object.keys(a.provides)) {
                const addVal = Number(a.provides[k] || 0) * Number(a.qty || 1);
                effectiveLimits[k] = (Number(effectiveLimits[k] || 0) + addVal);
              }
            }
          });
          company.effectiveUserLimits = effectiveLimits;
        } catch (e) {
          // ignore errors here - keep existing limits
        }
        await company.save();
      } else {
        // No active subscription: still update company selectedAddons and effective limits
        const companyMap = company.selectedAddons || {};
        items.forEach((it) => {
          if (!it || !it.value) return;
          companyMap[it.value] = (companyMap[it.value] || 0) + (it.qty || 0);
        });
        company.selectedAddons = companyMap;

        // Recompute effectiveUserLimits using company.planSnapshot (fallback) + addon provides
        try {
          const planPricing = (company.planSnapshot && company.planSnapshot.userPricing) ? company.planSnapshot.userPricing : {};
          const effectiveLimits = { ...(planPricing || {}) };
          // Use addonDocs to lookup provides
          items.forEach((it) => {
            const addonDoc = addonDocs.find(ad => String(ad._id) === String(it.addonId || it.itemId));
            if (!addonDoc) return;
            const provides = addonDoc.provides || null;
            if (provides && typeof provides === 'object') {
              for (const k of Object.keys(provides)) {
                const addVal = Number(provides[k] || 0) * Number(it.qty || 0);
                effectiveLimits[k] = (Number(effectiveLimits[k] || 0) + addVal);
              }
            }
          });
          company.effectiveUserLimits = effectiveLimits;
        } catch (e) {
          // ignore
        }
        await company.save();
      }
    }

    // Update company status based on order payment status
    try {
      let newCompanyStatus = 'pending_payment';
      if (order.status === 'paid') {
        newCompanyStatus = 'active';
      } else if (order.status === 'partially_paid') {
        newCompanyStatus = 'partially_paid';
      }
      await Company.findByIdAndUpdate(companyId, { $set: { status: newCompanyStatus } }).catch(() => null);
    } catch (e) {
      console.error('Failed to update company status on addon purchase:', e);
    }

    return { orderId: order._id, status: order.status };
  }

  // Update company usage counts atomically. adjustments: [{ key, delta }] where delta can be positive or negative
  static async updateUsage(companyId, adjustments = []) {
    if (!companyId) throw new Error('companyId required');
    if (!Array.isArray(adjustments) || adjustments.length === 0) throw new Error('adjustments required');

    // Build $inc object
    const inc = {};
    for (const adj of adjustments) {
      const key = adj.key;
      const delta = Number(adj.delta || 0);
      if (!key || delta === 0) continue;
      inc[`usage.${key}`] = (inc[`usage.${key}`] || 0) + delta;
    }

    if (Object.keys(inc).length === 0) throw new Error('no valid adjustments');

    // Apply atomic update
    const updated = await Company.findOneAndUpdate({ _id: companyId }, { $inc: inc }, { new: true }).lean();

    // Optional: ensure no negative usage values (repair by setting to zero)
    const usage = updated.usage || {};
    const fixes = {};
    for (const k of Object.keys(usage)) {
      if (usage[k] < 0) fixes[`usage.${k}`] = 0 - usage[k];
    }
    if (Object.keys(fixes).length) {
      await Company.updateOne({ _id: companyId }, { $inc: fixes });
    }

    return { success: true, usage: (await Company.findById(companyId).lean()).usage };
  }

  // ========================= REACTIVATE SUBSCRIPTION =========================
  static async reactivateSubscription({ subscriptionId, couponCode, useWallet, createdBy }) {
    try {
      const now = Date.now();

      const subscription = await subscriptionModel.findById(subscriptionId);
      if (!subscription) throw new Error("Subscription not found");

      // Prefer the subscription's stored snapshot for plan details; fallback to canonical plan doc
      const plan = subscription.planSnapshot && Object.keys(subscription.planSnapshot || {}).length
        ? subscription.planSnapshot
        : (await loadCompanyPlanSnapshot(subscription.companyId)) || await planModel.findById(subscription.planId);
      const company = await Company.findById(subscription.companyId);

      if (!plan || !company) throw new Error("Plan or company not found");

      // Determine reactivation mode
      let orderType;
      let subscriptionStartAt;

      if (subscription.status === "ACTIVE" && now < subscription.endAt) {
        // Renewal for next cycle
        orderType = "SUBSCRIPTION_RENEWAL";
        subscriptionStartAt = subscription.endAt + 1;
      } else if (subscription.status === "EXPIRED") {
        const graceEnd = subscription.endAt + (7 * DAY_MS);

        if (now <= graceEnd) {
          // Immediate restore within grace period
          orderType = "SUBSCRIPTION_REACTIVATE";
          subscriptionStartAt = now;
        } else {
          // Fresh subscription after grace period
          orderType = "SUBSCRIPTION_PURCHASE";
          subscriptionStartAt = now;
        }
      } else {
        throw new Error("Invalid subscription state for reactivation");
      }

      const carriedAddons = subscription.addonSnapshot || [];

      // Build order items
      const items = [
        {
          type: "plan",
          itemId: plan._id,
          name: plan.name,
          qty: 1,
          priceAtPurchasePaise: plan.pricePaise,
          lineSubtotalPaise: plan.pricePaise,
          taxConfig: { hasTax: plan.hasTax }
        },
        ...carriedAddons.map(a => ({
          type: "addon",
          itemId: a.addonId,
          name: a.name,
          value: a.value,
          qty: a.qty,
          priceAtPurchasePaise: a.pricePaise,
          lineSubtotalPaise: a.pricePaise * a.qty,
          taxConfig: { hasTax: a.hasTax }
        }))
      ];

      const subtotal = items.reduce((s, i) => s + i.lineSubtotalPaise, 0);

      // Handle coupon
      let discounts = [];
      if (couponCode) {
        const coupon = await couponModel.findOne({ code: couponCode, isActive: true });

        if (coupon &&
          (!coupon.validFrom || now >= coupon.validFrom) &&
          (!coupon.validTo || now <= coupon.validTo) &&
          (!coupon.minSpendPaise || subtotal >= coupon.minSpendPaise)
        ) {
          let applied = coupon.discountType === CouponType.PERCENT
            ? Math.floor((subtotal * coupon.discountValue) / 100)
            : Number(coupon.discountValue || 0);

          if (coupon.maxDiscountPaise) applied = Math.min(applied, coupon.maxDiscountPaise);

          discounts.push({
            couponId: coupon._id,
            couponCode: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAppliedPaise: applied
          });
        }
      }

      const totalDiscount = discounts.reduce((s, d) => s + d.discountAppliedPaise, 0);

      // Tax calculation
      let taxableAmount = 0;
      for (const item of items) {
        if (item.taxConfig?.hasTax) {
          taxableAmount += item.lineSubtotalPaise;
        }
      }
      taxableAmount = Math.max(0, taxableAmount - totalDiscount);

      const totalTax = plan.hasTax ? Math.round(taxableAmount * 0.18) : 0;
      const totalPayable = subtotal - totalDiscount + totalTax;

      // Wallet handling
      let walletApplied = 0;
      let wallet = null;

      if (useWallet === true && totalPayable > 0) {
        wallet = await walletModel.findOne({ companyId: company._id });
        if (!wallet) {
          wallet = await walletModel.create({ companyId: company._id, balancePaise: 0 });
        }
        walletApplied = Math.min(wallet.balancePaise, totalPayable);
      }

      const amountDue = Math.max(0, totalPayable - walletApplied);

      let orderStatus = "pending";
      if (walletApplied > 0 && amountDue > 0) orderStatus = "partially_paid";
      if (amountDue === 0) orderStatus = "paid";

      // Create order
      const order = await orderModel.create({
        companyId: company._id,
        orderType,
        items,
        discounts,
        walletUsed: {
          walletId: wallet?._id || null,
          amountPaise: walletApplied
        },
        // payments are stored separately in Payment collection and linked via paymentIds
        taxBreakdown: plan.hasTax
          ? [{
            taxName: plan.taxName || "GST",
            percentage: 18,
            taxAmountPaise: totalTax
          }]
          : [],
        totals: {
          subtotalPaise: subtotal,
          totalDiscountPaise: totalDiscount,
          taxableAmountPaise: taxableAmount,
          totalTaxPaise: totalTax,
          totalPayablePaise: totalPayable
        },
        final: {
          totalPaidPaise: walletApplied,
          amountDuePaise: amountDue,
          refundedAmountPaise: 0
        },
        status: orderStatus,
        meta: {
          reactivateFromSubscriptionId: subscriptionId,
          intendedStartAt: subscriptionStartAt
        },
        createdBy,
      });

      // Activate subscription if fully paid
      let newSubscription = null;
      if (orderStatus === "paid") {
        newSubscription = await activateSubscriptionIfEligible(order);
      }

      // Deduct wallet
      if (walletApplied > 0) {
        wallet.balancePaise -= walletApplied;
        await wallet.save();

        await transactionModel.create({
          companyId: company._id,
          orderId: order._id,
          type: "WALLET_DEBIT",
          amountPaise: walletApplied,
          source: "WALLET",
          description: `Wallet debit for ${orderType} order ${order._id}`,
          createdBy,
        });
        // create payment record for wallet usage and link to order
        const wp = await paymentModel.create({ order: order._id, company: company._id, amountPaise: walletApplied, method: 'WALLET', status: 'SUCCESS', transactionId: 'WALLET', createdBy });
        order.paymentIds = order.paymentIds || [];
        order.paymentIds.push(wp._id);
        await order.save();
      }

      // Update company status based on order payment status
      try {
        let newCompanyStatus = 'pending_payment';
        if (orderStatus === 'paid') {
          newCompanyStatus = 'active';
        } else if (orderStatus === 'partially_paid') {
          newCompanyStatus = 'partially_paid';
        }
        await Company.findByIdAndUpdate(company._id, { $set: { status: newCompanyStatus } }).catch(() => null);
      } catch (e) {
        console.error('Failed to update company status on reactivation:', e);
      }

      return {
        success: true,
        message: "Reactivation order created",
        orderId: order._id,
        order,
        newSubscription: newSubscription || null,
        amountDuePaise: amountDue,
      };
    } catch (err) {
      console.error("Error reactivating subscription:", err);
      throw err;
    }
  }

  // Get all payment history for a company
  static async getCompanyPaymentHistory(companyId, { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = {}) {
    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === "desc" ? -1 : 1;

    try {
      // Get all orders for the company with their payment details
      const orders = await orderModel.aggregate([
        { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
        {
          $project: {
            _id: 1,
            orderNumber: 1,
            status: 1,
            orderType: 1,
            createdAt: 1,
            updatedAt: 1,
            items: 1,
            totals: 1,
            payments: 1,
            "planItem": {
              $first: {
                $filter: {
                  input: "$items",
                  as: "item",
                  cond: { $eq: ["$$item.type", "plan"] }
                }
              }
            }
          }
        },
        {
          $addFields: {
            totalAmount: { $divide: [{ $ifNull: ["$totals.totalPayablePaise", 0] }, 100] },
            planName: "$planItem.name",
            paymentsList: {
              $map: {
                input: { $ifNull: ["$payments", []] },
                as: "payment",
                in: {
                  _id: "$$payment._id",
                  method: "$$payment.method",
                  status: "$$payment.status",
                  amountPaise: "$$payment.amountPaise",
                  amount: { $divide: [{ $ifNull: ["$$payment.amountPaise", 0] }, 100] },
                  transactionId: "$$payment.transactionId",
                  createdAt: "$$payment.createdAt",
                  metadata: "$$payment.metadata"
                }
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            orderNumber: 1,
            status: 1,
            orderType: 1,
            totalAmount: 1,
            planName: 1,
            paymentsList: 1,
            paymentCount: { $size: { $ifNull: ["$payments", []] } },
            createdAt: 1,
            updatedAt: 1
          }
        },
        { $sort: { [sortBy]: sortDirection } },
        { $skip: skip },
        { $limit: limit }
      ]);

      // Get total count
      const totalCount = await orderModel.countDocuments({ companyId: new mongoose.Types.ObjectId(companyId) });

      return {
        payments: orders,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (err) {
      console.error("Error getting company payment history:", err);
      throw err;
    }
  }

  // Get full company details with plan, orders, payments, wallet, and transactions
  static async getCompanyFullDetails(companyId) {
    try {
      const company = await Company.findById(companyId).lean();
      if (!company) return null;
      // Get wallet
      const wallet = await walletModel.findOne({ companyId }).lean();

      // Get branches for company
      const branches = await require('../models/branch.model').find({ companyId }).lean().catch(() => []);

      // Get client users for company
      const clientUsers = await require('../models/clientUser.model').find({ companyId }).lean().catch(() => []);

      // Get active subscription with plan details
      let planData = null;
      if (company.activeSubscriptionId) {
        const subscription = await subscriptionModel.findById(company.activeSubscriptionId).lean();
        if (subscription) {
          planData = {
            subscriptionId: subscription._id,
            planSnapshot: subscription.planSnapshot,
            planPricePaise: subscription.planPricePaise,
            status: subscription.status,
            endAt: subscription.endAt,
            addonSnapshot: subscription.addonSnapshot,
            previousSubscriptionId: subscription.previousSubscriptionId,
          };
        }
      }
 // recent orders (latest 5)
      const recentOrdersRaw = await orderModel.find({ companyId }).sort({ createdAt: -1 }).limit(5).lean();

      // If no active subscription, try to infer plan from the latest order's plan item
      if (!planData) {
        const latestOrder = recentOrdersRaw && recentOrdersRaw.length ? recentOrdersRaw[0] : null;
        if (latestOrder) {
          const planItem = (latestOrder.items || []).find(it => it.type === 'plan');
          if (planItem && planItem.itemId) {
            try {
              // Prefer company.planSnapshot if present
              if (company.planSnapshot && Object.keys(company.planSnapshot || {}).length) {
                const p = company.planSnapshot;
                planData = {
                  subscriptionId: null,
                  planSnapshot: {
                    _id: p._id || null,
                    code: p.code,
                    name: p.name,
                    pricePaise: p.pricePaise,
                    billingCycle: p.billingCycle,
                  },
                  planPricePaise: planItem.priceAtPurchasePaise || p.pricePaise,
                  status: latestOrder.status || null,
                  endAt: null,
                  addonSnapshot: (latestOrder.items || []).filter(i => i.type === 'addon').map(a => ({ addonId: a.itemId, name: a.name, qty: a.qty, pricePaise: a.priceAtPurchasePaise }))
                };
              } else {
                const planDoc = await planModel.findById(planItem.itemId).lean();
                if (planDoc) {
                  planData = {
                    subscriptionId: null,
                    planSnapshot: {
                      _id: planDoc._id,
                      code: planDoc.code,
                      name: planDoc.name,
                      pricePaise: planDoc.pricePaise,
                      billingCycle: planDoc.billingCycle,
                    },
                    planPricePaise: planItem.priceAtPurchasePaise || planDoc.pricePaise,
                    status: latestOrder.status || null,
                    endAt: null,
                    addonSnapshot: (latestOrder.items || []).filter(i => i.type === 'addon').map(a => ({ addonId: a.itemId, name: a.name, qty: a.qty, pricePaise: a.priceAtPurchasePaise }))
                  };
                }
              }
            } catch (err) {
              console.error('Error fetching plan for latest order:', err);
            }
          }
        }
      }

     
      // all orders for payment summary
      const allOrders = await orderModel.find({ companyId }).sort({ createdAt: -1 }).lean();

      // fetch payments for these orders from payments collection
      const orderIds = (allOrders || []).map(o => o._id).filter(Boolean);
      const payments = orderIds.length ? await paymentModel.find({ order: { $in: orderIds } }).lean() : [];
      const paymentsByOrder = {};
      for (const p of payments) {
        const k = String(p.order);
        paymentsByOrder[k] = paymentsByOrder[k] || [];
        paymentsByOrder[k].push(p);
      }

      const orderSummary = {
        totalOrders: await orderModel.countDocuments({ companyId }),
        recentOrders: recentOrdersRaw.map(o => ({
          _id: o._id,
          orderNumber: o.orderNumber || null,
          status: o.status,
          orderType: o.orderType || null,
          items: (o.items || []).map(item => ({
            type: item.type,
            itemId: item.itemId || null,
            name: item.name,
            qty: item.qty || 1,
            priceAtPurchasePaise: item.priceAtPurchasePaise || 0,
            lineSubtotalPaise: item.lineSubtotalPaise || 0,
          })),
          totals: {
            subtotalPaise: o.totals?.subtotalPaise || 0,
            totalDiscountPaise: o.totals?.totalDiscountPaise || 0,
            taxableAmountPaise: o.totals?.taxableAmountPaise || 0,
            totalTaxPaise: o.totals?.totalTaxPaise || 0,
            planCreditPaise: o.totals?.planCreditPaise || 0,
            totalPayablePaise: o.totals?.totalPayablePaise || 0,
          },
          discounts: o.discounts || [],
          walletUsed: o.walletUsed || null,
          taxBreakdown: o.taxBreakdown || [],
          payments: (paymentsByOrder[String(o._id)] || []).map(p => ({
            _id: p._id,
            method: p.method,
            referenceId: p.transactionId || null,
            amountPaise: p.amountPaise || 0,
            amount: (p.amountPaise || 0) / 100,
            status: p.status,
            paidAt: p.createdAt || null,
          })),
          final: {
            totalPaidPaise: o.final?.totalPaidPaise || 0,
            amountDuePaise: o.final?.amountDuePaise || 0,
            refundedAmountPaise: o.final?.refundedAmountPaise || 0,
          },
          createdAt: o.createdAt,
        })),
      };

      // Build compact payment totals to keep payload small
      let totalPaymentsMade = 0;
      let totalPendingAcrossOrders = 0;

      for (const p of payments) {
        if (String(p.company) === String(companyId) && p.status === 'SUCCESS') totalPaymentsMade += p.amountPaise || 0;
      }
      for (const order of allOrders) {
        totalPendingAcrossOrders += order.final?.amountDuePaise || 0;
      }

      const paymentTotals = {
        totalPaidPaise: totalPaymentsMade,
        totalPendingPaise: totalPendingAcrossOrders,
      };

      // Get transactions (latest 10)
      const transactions = await transactionModel.find({ companyId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      return {
        company: {
          _id: company._id,
          name: company.name,
          email: company.contact?.email,
          status: company.status,
          createdAt: company.createdAt,
          updatedAt: company.updatedAt,
          isTrialUsed : company.isTrialUsed || false,
          subscription: planData ? { previousSubscriptionId: planData.previousSubscriptionId } : null,
        },
        plan: planData,
        wallet: wallet ? {
          balancePaise: wallet.balancePaise,
          balance: wallet.balancePaise / 100,
          status: wallet.status,
        } : null,
        orderSummary,
        paymentTotals,
        transactions: transactions.map(t => ({
          _id: t._id,
          type: t.type,
          amountPaise: t.amountPaise,
          amount: t.amountPaise / 100,
          source: t.source,
          description: t.description,
          createdAt: t.createdAt,
        })),
        branches: branches || [],
        clientUsers: clientUsers || [],
      };
    } catch (err) {
      console.error("Error getting company full details:", err);
      throw err;
    }
  }
  
    // Minimal projection for sync step 1: company, branches, client users
    static async getCompanySyncStep1Data(companyId) {
      try {
        const company = await Company.findById(companyId).lean();
        if (!company) return null;

        const branches = await branchModel.find({ companyId }).lean().catch(() => []);
        const clientUsers = await clientUserModel.find({ companyId }).lean().catch(() => []);

        return {
          company: {
            _id: company._id.toString(),
            name: company.name,
            code: company.code || null,
            contact: company.contact || {},
            email: company.contact?.email || company.email || null,
            status: company.status,
            createdAt: company.createdAt,
            updatedAt: company.updatedAt,
            pan: company.panNo || null,
            gstn: company.gstNo || null,
          },
          branches: branches || [],
          clientUsers: clientUsers || [],
        };
      } catch (err) {
        console.error('Error in getCompanySyncStep1Data:', err);
        throw err;
      }
    }

    // Minimal projection for sync step 2: plan, orderSummary, transactions, wallet
    static async getCompanySyncStep2Data(companyId) {
      try {
        const company = await Company.findById(companyId).lean();
        if (!company) return null;

        // Wallet
        const wallet = await walletModel.findOne({ companyId }).lean().catch(() => null);

        // Plan snapshot: active subscription or infer from latest order (without heavy fields)
        let planData = null;
        if (company.activeSubscriptionId) {
          const subscription = await subscriptionModel.findById(company.activeSubscriptionId).lean();
          if (subscription) {
            planData = {
              subscriptionId: subscription._id,
              planSnapshot: {...subscription.planSnapshot,validity_start : formatDate(subscription.startAt), validity_end: formatDate(subscription.endAt)} || {},
              planPricePaise: subscription.planPricePaise,
              status: subscription.status,
              addonSnapshot: subscription.addonSnapshot || [],
            };
          }
        }

        // recent orders (latest 5)
        const recentOrdersRaw = await orderModel.find({ companyId }).sort({ createdAt: -1 }).limit(5).lean();

        // If no active subscription, try infer from latest order
        if (!planData && recentOrdersRaw && recentOrdersRaw.length) {
          const latestOrder = recentOrdersRaw[0];
          const planItem = (latestOrder.items || []).find(it => it.type === 'plan');
          if (planItem && planItem.itemId) {
            try {
              // Prefer company plan snapshot if available
              if (company.planSnapshot && Object.keys(company.planSnapshot || {}).length) {
                const p = company.planSnapshot;
                planData = {
                  subscriptionId: null,
                  planSnapshot: { _id: p._id || null, code: p.code, name: p.name, pricePaise: p.pricePaise, billingCycle: p.billingCycle },
                  planPricePaise: planItem.priceAtPurchasePaise || p.pricePaise,
                  status: latestOrder.status || null,
                  endAt: null,
                  addonSnapshot: (latestOrder.items || []).filter(i => i.type === 'addon').map(a => ({ addonId: a.itemId, name: a.name, qty: a.qty, pricePaise: a.priceAtPurchasePaise }))
                };
              } else {
                const planDoc = await planModel.findById(planItem.itemId).lean();
                if (planDoc) {
                  planData = {
                    subscriptionId: null,
                    planSnapshot: { _id: planDoc._id, code: planDoc.code, name: planDoc.name, pricePaise: planDoc.pricePaise, billingCycle: planDoc.billingCycle },
                    planPricePaise: planItem.priceAtPurchasePaise || planDoc.pricePaise,
                    status: latestOrder.status || null,
                    endAt: null,
                    addonSnapshot: (latestOrder.items || []).filter(i => i.type === 'addon').map(a => ({ addonId: a.itemId, name: a.name, qty: a.qty, pricePaise: a.priceAtPurchasePaise }))
                  };
                }
              }
            } catch (e) {
              console.error('Error fetching plan for latest order (step2):', e);
            }
          }
        }

        // all orders summary (compact)
        const allOrders = await orderModel.find({ companyId }).sort({ createdAt: -1 }).lean();

        const orderSummary = {
          totalOrders: await orderModel.countDocuments({ companyId }),
          recentOrders: recentOrdersRaw.map(o => ({
            _id: o._id,
            orderNumber: o.orderNumber || null,
            status: o.status,
            orderType: o.orderType || null,
            items: (o.items || []).map(item => ({ type: item.type, itemId: item.itemId || null, name: item.name, qty: item.qty || 1, priceAtPurchasePaise: item.priceAtPurchasePaise || 0, lineSubtotalPaise: item.lineSubtotalPaise || 0 })),
            totals: {
              subtotalPaise: o.totals?.subtotalPaise || 0,
              totalDiscountPaise: o.totals?.totalDiscountPaise || 0,
              taxableAmountPaise: o.totals?.taxableAmountPaise || 0,
              totalTaxPaise: o.totals?.totalTaxPaise || 0,
              totalPayablePaise: o.totals?.totalPayablePaise || 0,
            },
            payments: [],
            final: { totalPaidPaise: o.final?.totalPaidPaise || 0, amountDuePaise: o.final?.amountDuePaise || 0 },
            createdAt: o.createdAt,
          })),
        };

        // transactions (latest 10)
        const transactions = await transactionModel.find({ companyId }).sort({ createdAt: -1 }).limit(10).lean();

        return {
          company_id: company._id.toString(),
          plan: planData,
          orderSummary,
          transactions: transactions.map(t => ({ _id: t._id, type: t.type, amountPaise: t.amountPaise, source: t.source, description: t.description, createdAt: t.createdAt })),
          wallet: wallet ? { balancePaise: wallet.balancePaise, status: wallet.status } : null,
        };
      } catch (err) {
        console.error('Error in getCompanySyncStep2Data:', err);
        throw err;
      }
    }

    // Minimal projection for sync step 3: modulePermissions (flattened) and company basic
    static async getCompanySyncStep3Data(companyId) {
      try {
        const company = await Company.findById(companyId).lean();
        if (!company) return null;

        let planSnapshot = null;
        if (company.activeSubscriptionId) {
          const subscription = await subscriptionModel.findById(company.activeSubscriptionId).lean();
          if (subscription) planSnapshot = subscription.planSnapshot || null;
        } else {
          // try latest order
          const latestOrder = await orderModel.findOne({ companyId }).sort({ createdAt: -1 }).lean();
          if (latestOrder) {
            const planItem = (latestOrder.items || []).find(i => i.type === 'plan');
            if (planItem && planItem.itemId) {
              try {
                if (company.planSnapshot && Object.keys(company.planSnapshot || {}).length) {
                  const p = company.planSnapshot;
                  planSnapshot = { _id: p._id || null, code: p.code, name: p.name, modulePermissions: p.modulePermissions || [] };
                } else {
                  const planDoc = await planModel.findById(planItem.itemId).lean();
                  if (planDoc) planSnapshot = { _id: planDoc._id, code: planDoc.code, name: planDoc.name, modulePermissions: planDoc.modulePermissions || [] };
                }
              } catch (e) { /* ignore */ }
            }
          }
        }

        const modules = (planSnapshot && planSnapshot.modulePermissions) || [];
        const modulePermissions = [];
        modules.forEach((m) => {
          if (Array.isArray(m.actions)) {
            m.actions.forEach((a) => {
              if (a && a.key && a.enabled === true) {
                modulePermissions.push(a.key.replace(/^saas\./, ''))
              }
            });
          }
        });

        return {
          company_id: company._id.toString(),
          modulePermissions,
        };
      } catch (err) {
        console.error('Error in getCompanySyncStep3Data:', err);
        throw err;
      }
    }

        // Minimal projection for sync step 4: financial year, serial numbers
        static async getCompanySyncStep4Data(companyId) {
          try {
            const company = await Company.findById(companyId).lean();
            if (!company) return null;

            // const fy = (company.settings && company.settings.financialYear) || null;
            // const serials = (company.settings && company.settings.serialNumbers) || null;

            return {
              company_id: company._id.toString(),
              // financialYear: fy,
              // serialNumbers: serials,
            };
          } catch (err) {
            console.error('Error in getCompanySyncStep4Data:', err);
            throw err;
          }
        }

        // Minimal projection for sync step 5: general settings
        static async getCompanySyncStep5Data(companyId) {
          try {
            const company = await Company.findById(companyId).lean();
            if (!company) return null;

            // const general = (company.settings && company.settings.general) || company.settings || {};

            return {
              company_id: company._id.toString(),
              // settings: general,
            };
          } catch (err) {
            console.error('Error in getCompanySyncStep5Data:', err);
            throw err;
          }
        }
}

// Export internal helpers for workers/tests
CompanyService.activateSubscriptionIfEligible = activateSubscriptionIfEligible;

module.exports = CompanyService;

/** Soft-delete and restore utilities */
CompanyService.softDeleteCompany = async function(companyId, deletedBy) {
  const now = Date.now();
  const cid = new mongoose.Types.ObjectId(companyId);

  const company = await Company.findByIdAndDelete(companyId, { isDeleted: true, deletedAt: now, deletedBy }, { new: true });
  if (!company) throw new Error('Company not found');

  // Cascade soft-delete to related models
  await Promise.all([
  subscriptionModel.deleteMany({ companyId: cid }),
  orderModel.deleteMany({ companyId: cid }),
  transactionModel.deleteMany({ companyId: cid }),
  walletModel.deleteMany({ companyId: cid }),
  walletTransactionModel.deleteMany({ companyId: cid }),
  paymentModel.deleteMany({ company: cid }),
  auditTrailModel.deleteMany({ companyId: cid }),
  branchModel.deleteMany({ companyId: cid }),
  clientUserModel.deleteMany({ companyId: cid }),
  syncLogModel.deleteMany({ companyId: cid }),
]);

  // Notify third-party callback if configured
  try {
    const cb = process.env.COMPANY_DELETION_CALLBACK_URL;
    if (cb) {
      // Node 18+ has global fetch
      await fetch(cb, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, deletedAt: now })
      });
    }
  } catch (e) {
    console.error('Error notifying deletion callback:', e);
  }

  return { success: true, companyId, deletedAt: now };
};

CompanyService.deleteAllCompanyData = async function() {
  await Promise.all([
    Company.deleteMany({}),
    orderModel.deleteMany({}),
    subscriptionModel.deleteMany({}),
    walletModel.deleteMany({}),
    walletTransactionModel.deleteMany({}),
    paymentModel.deleteMany({}),
    auditTrailModel.deleteMany({}),
    branchModel.deleteMany({}),
    clientUserModel.deleteMany({}),
    syncLogModel.deleteMany({}),
    transactionModel.deleteMany({}),
  ]);
  return { success: true };
};

CompanyService.listDeletedCompanies = async function({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const filter = { isDeleted: true };
  const total = await Company.countDocuments(filter);
  const items = await Company.find(filter).sort({ deletedAt: -1 }).skip(skip).limit(Number(limit)).lean();
  return { items, total, page: Number(page), limit: Number(limit) };
};

CompanyService.restoreCompany = async function(companyId, restoredBy) {
  const now = Date.now();
  const cid = mongoose.Types.ObjectId(companyId);
  const company = await Company.findByIdAndUpdate(companyId, { isDeleted: false, deletedAt: null, deletedBy: null, updatedBy: restoredBy }, { new: true });
  if (!company) throw new Error('Company not found');

  await Promise.all([
    subscriptionModel.updateMany({ companyId: cid }, { isDeleted: false, deletedAt: null }),
    orderModel.updateMany({ companyId: cid }, { isDeleted: false, deletedAt: null }),
    transactionModel.updateMany({ companyId: cid }, { isDeleted: false, deletedAt: null }),
    walletModel.updateMany({ companyId: cid }, { isDeleted: false, deletedAt: null }),
    walletTransactionModel.updateMany({ companyId: cid }, { isDeleted: false, deletedAt: null }),
    paymentModel.updateMany({ companyId: cid }, { isDeleted: false, deletedAt: null }),
    auditTrailModel.updateMany({ companyId: cid }, { isDeleted: false, deletedAt: null }),
    branchModel.updateMany({ companyId: cid }, { isDeleted: false, deletedAt: null }),
    clientUserModel.updateMany({ companyId: cid }, { isDeleted: false, deletedAt: null }),
    syncLogModel.updateMany({ companyId: cid }, { isDeleted: false, deletedAt: null }),
  ]);

  return company;
};
// name belongs to trial plan then showing trial sync & isTroialUsed true else false, when actual plan buy  just upgrade 
//downgrade timw hide trial if actual plan started then