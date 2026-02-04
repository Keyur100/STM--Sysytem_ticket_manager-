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
const auditTrailModel = require("../models/auditTrail.model");
const planModel = require("../models/plan.model");
const subscriptionModel = require("../models/subscription.model");
const transactionModel = require("../models/transaction.model");
const mongoose = require("mongoose");
const PlanService = require("./plan.service");
const couponModel = require("../models/coupon.model");
const addonModel = require("../models/addon.model");

const DAY_MS = 24 * 60 * 60 * 1000;

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

 
async function activateSubscriptionIfEligible(order) {
  if (order.status !== "paid") return null;
  if (order.subscriptionId) return null;

  const planItem = order.items.find(i => i.type === "plan");
  if (!planItem) throw new Error("Paid order missing plan item");

  const plan = await planModel.findById(planItem.itemId);
  if (!plan) throw new Error("Plan not found for paid order");

  const now = Date.now();

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
     COLLECT ADDONS FROM ORDER
  ========================= */
  const addonSnapshots = order.items
    .filter(i => i.type === "addon")
    .map(i => ({
      addonId: i.itemId,
      name: i.name,
      qty: i.qty,
      pricePaise: i.priceAtPurchasePaise,
      hasTax: i.taxConfig?.hasTax || false,
      value: i.value || null
    }));

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
     CREATE NEW SUBSCRIPTION
  ========================= */
  const [subscription] = await subscriptionModel.create(
    [
      {
        companyId: order.companyId,
        planId: plan._id,

        planSnapshot: {
          planId: plan._id,
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
      }
    ]
  );

  // Link order → subscription
  await orderModel.updateOne(
    { _id: order._id },
    { $set: { subscriptionId: subscription._id } }
  );

  // Update company
  await Company.updateOne(
    { _id: order.companyId },
    {
      $set: {
        status: "active",
        activeSubscriptionId: subscription._id,
        planId: plan._id,
        planSnapshot: subscription.planSnapshot,
        modulePermissionsSnapshot: plan.modulePermissions || {}
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
    const company = await Company.create({
      name: payload?.name || "Untitled Company",
      url: payload?.url || '',
      panNo: payload?.panNo || '',
      gstNumber: payload?.gstNo || '',
      bankAccount: payload?.bankAccount || '',
      contact: payload?.contact || '',
      status: "draft",
      createdBy,
      updatedBy: createdBy,
      activeSubscriptionId: null,
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
    const company = await Company.findByIdAndUpdate(
      companyId,
      { $set: { ...payload, updatedBy } },
      { new: true }
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

  const plan = await planModel.findById(planData._id);
  if (!plan) throw new Error("Plan not found");

  /* =========================
     BUILD ORDER ITEMS
  ========================= */
  const items = [];
  const planPricePaise = Number(plan.pricePaise || 0);

  items.push({
    type: "plan",
    itemId: plan._id,
    name: plan.name,
    qty: 1,
    priceAtPurchasePaise: planPricePaise,
    lineSubtotalPaise: planPricePaise,
    taxConfig: { hasTax: plan.hasTax }
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
      taxConfig: { hasTax: addon.hasTax }
    });
  }

  // If there are invalid addons, log them for debugging
  if (invalidAddons.length > 0) {
    console.log("❌ Invalid addons detected:", invalidAddons);
  }

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
      (coupon.eligiblePlanCodes.length === 0 || coupon.eligiblePlanCodes.includes(plan.code)) &&
      (coupon.maxUses === 0 || coupon.usedCount < coupon.maxUses)
    ) {
      let applied =
        coupon.discountType === "percentage"
          ? Math.floor((subtotalPaise * coupon.discountValue) / 100)
          : Number(coupon.discountValue || 0);

      if (coupon.maxDiscountPaise)
        applied = Math.min(applied, coupon.maxDiscountPaise);

      discounts.push({
        couponId: coupon._id,
        couponCode: coupon.code,
        discountType: coupon.discountType,
        // discountValue: coupon.discountValue,
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
  let taxableAmountPaise = items
    .filter(i => i.taxConfig?.hasTax)
    .reduce((s, i) => s + i.lineSubtotalPaise, 0);

  taxableAmountPaise = Math.max(0, taxableAmountPaise - totalDiscountPaise);

  const totalTaxPaise = plan.hasTax //TODO plan level tax only, addons tax check?
    ? Math.round(taxableAmountPaise * 0.18)
    : 0;

  const totalPayablePaise =
    subtotalPaise - totalDiscountPaise + totalTaxPaise;//TODO tax show in ui

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
  const order = await orderModel.create({
    companyId,
    orderType: "SUBSCRIPTION_PURCHASE",
    items,
    discounts,
    walletUsed: {
      walletId: walletDoc?._id || null,
      amountPaise: walletAppliedPaise
    },
    payments: walletAppliedPaise
      ? [{
          method: "manual",
          amountPaise: walletAppliedPaise,
          status: "success",
          paidAt: Date.now(),
          referenceId: "WALLET"
        }]
      : [],
    taxBreakdown: totalTaxPaise
      ? [{
          taxName: plan.taxName || "GST",
          percentage: taxPercent,
          taxAmountPaise: totalTaxPaise
        }]
      : [],
    totals: {
      subtotalPaise,
      totalDiscountPaise,
      taxableAmountPaise,
      totalTaxPaise,
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
  if (orderStatus === "paid") {
    await activateSubscriptionIfEligible(order);
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
      source: "PAYMENT",
      description: `Wallet payment for order ${order._id}`
    });
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
    sortOrder = "asc",
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
                payments: "$$order.payments",
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
    return (
      Company.findById(companyId)
        // .populate("subscription")
        // .populate("wishlist")
        .lean()
    );
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

      // 5. Idempotency check - prevent duplicate cash receipts
      const alreadyRecorded = order.payments?.some(
        (p) => p.method === "cash" && p.referenceId?.trim() === cashReceiptNo.trim()
      );
      if (alreadyRecorded) {
        throw new Error("Cash receipt already recorded for this order");
      }

      // 6. Validate amount due
      const amountPaise = order.final?.amountDuePaise;
      if (!amountPaise || amountPaise <= 0) {
        throw new Error("No amount due for this order");
      }

      // 7. 💰 Record payment directly in order
      if (!order.payments) {
        order.payments = [];
      }

      order.payments.push({
        method: "cash",
        amountPaise,
        referenceId: cashReceiptNo.trim(),
        status: "success",
        paidAt: Date.now()
      });

      // 8. Update final amounts
      order.final.totalPaidPaise = (order.final?.totalPaidPaise || 0) + amountPaise;
      order.final.amountDuePaise = Math.max(
        0,
        (order.totals?.totalPayablePaise || 0) - order.final.totalPaidPaise
      );

      // 9. Update order status
      order.status = order.final.amountDuePaise === 0 ? "paid" : "partially_paid";

      // 10. Save order
      await order.save();

      // 11. Create transaction record
      await transactionModel.create({
        companyId,
        type: "CASH_PAYMENT",
        amountPaise,
        source: "cash",
        reference: cashReceiptNo.trim(),
        orderId,
        description: `Cash payment recorded for order ${orderId}`,
        status: "COMPLETED",
        createdBy,
      });

      // 12. Activate subscription if fully paid
      let subscription = null;
      if (order.status === "paid") {
        subscription = await activateSubscriptionIfEligible(order);
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
  static async upgradeSubscription({ subscriptionId, newPlanId, couponCode, useWallet, createdBy }) {
    try {
      const now = Date.now();

      // Validate subscription
      const subscription = await subscriptionModel.findById(subscriptionId);
      if (!subscription) throw new Error("Subscription not found");
      if (subscription.status !== "ACTIVE") throw new Error("Only ACTIVE subscriptions can be upgraded");

      // Validate plans
      const oldPlan = await planModel.findById(subscription.planId);
      const newPlan = await planModel.findById(newPlanId);

      if (!newPlan) throw new Error("New plan not found");
      if (newPlan.pricePaise <= oldPlan.pricePaise) {
        throw new Error("Upgrade must be to a higher-priced plan");
      }

      // Validate company and limits
      const company = await Company.findById(subscription.companyId);
      if (!company) throw new Error("Company not found");

      const currentUsage = company.usage || {};
      const planLimits = newPlan.userPricing || {};
      const addonLimits = {};

      for (const addon of subscription.addonSnapshot || []) {
        addonLimits[addon.value] = (addonLimits[addon.value] || 0) + addon.qty;
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

      // Handle coupon
      let discounts = [];
      if (couponCode) {
        const coupon = await couponModel.findOne({ code: couponCode, isActive: true });

        if (coupon &&
          (!coupon.validFrom || now >= coupon.validFrom) &&
          (!coupon.validTo || now <= coupon.validTo) &&
          (!coupon.minSpendPaise || subtotal >= coupon.minSpendPaise)
        ) {
          let applied = coupon.discountType === "percentage"
            ? Math.floor((subtotal * coupon.discountValue) / 100)
            : Number(coupon.discountValue || 0);

          if (coupon.maxDiscountPaise) applied = Math.min(applied, coupon.maxDiscountPaise);

          discounts.push({
            couponId: coupon._id,
            couponCode: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAppliedPaise: applied,
          });
        }
      }

      const totalDiscount = discounts.reduce((s, d) => s + d.discountAppliedPaise, 0);

      // Tax calculation
      const taxableAmount = Math.max(0, subtotal - totalDiscount);
      const totalTax = newPlan.hasTax ? Math.round(taxableAmount * 0.18) : 0;

      let totalPayable = taxableAmount + totalTax - remainingValue;
      totalPayable = Math.max(0, totalPayable);

      // Wallet handling
      let walletApplied = 0;
      let wallet = null;

      if (useWallet && totalPayable > 0) {
        wallet = await walletModel.findOne({ companyId: company._id });
        if (wallet) walletApplied = Math.min(wallet.balancePaise, totalPayable);
      }

      const amountDue = Math.max(0, totalPayable - walletApplied);

      // Create order
      const items = [{
        type: "plan",
        itemId: newPlan._id,
        name: newPlan.name,
        qty: 1,
        priceAtPurchasePaise: newPlan.pricePaise,
        lineSubtotalPaise: newPlan.pricePaise,
        taxConfig: { hasTax: newPlan.hasTax }
      }];

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
        payments: walletApplied
          ? [{
            method: "manual",
            amountPaise: walletApplied,
            paidAt: now,
            status: "success",
            referenceId: "WALLET",
          }]
          : [],
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
          taxableAmountPaise: taxableAmount,
          totalTaxPaise: totalTax,
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

      // Activate subscription if fully paid
      let newSubscription = null;
      if (order.status === "paid") {
        newSubscription = await activateSubscriptionIfEligible(order);
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
          source: "wallet",
          description: `Wallet debit for upgrade order ${order._id}`,
          createdBy,
        });
      }

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

  // ========================= REACTIVATE SUBSCRIPTION =========================
  static async reactivateSubscription({ subscriptionId, couponCode, useWallet, createdBy }) {
    try {
      const now = Date.now();

      const subscription = await subscriptionModel.findById(subscriptionId);
      if (!subscription) throw new Error("Subscription not found");

      const plan = await planModel.findById(subscription.planId);
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
          let applied = coupon.discountType === "percentage"
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
        payments: walletApplied
          ? [{
            method: "manual",
            amountPaise: walletApplied,
            status: "success",
            paidAt: now,
            referenceId: "WALLET"
          }]
          : [],
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
          source: "wallet",
          description: `Wallet debit for ${orderType} order ${order._id}`,
          createdBy,
        });
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
          };
        }
      }

      // recent orders (latest 5)
      const recentOrdersRaw = await orderModel.find({ companyId }).sort({ createdAt: -1 }).limit(5).lean();

      // all orders for payment summary
      const allOrders = await orderModel.find({ companyId }).sort({ createdAt: -1 }).lean();

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
            totalPayablePaise: o.totals?.totalPayablePaise || 0,
          },
          discounts: o.discounts || [],
          walletUsed: o.walletUsed || null,
          taxBreakdown: o.taxBreakdown || [],
          payments: (o.payments || []).map(p => ({
            method: p.method,
            referenceId: p.referenceId || null,
            amountPaise: p.amountPaise || 0,
            amount: (p.amountPaise || 0) / 100,
            status: p.status,
            paidAt: p.paidAt || null,
          })),
          final: {
            totalPaidPaise: o.final?.totalPaidPaise || 0,
            amountDuePaise: o.final?.amountDuePaise || 0,
            refundedAmountPaise: o.final?.refundedAmountPaise || 0,
          },
          createdAt: o.createdAt,
        })),
      };

      // Build payment summary and grouped-by-method view
      let totalPaymentsMade = 0;
      let totalPendingAcrossOrders = 0;
      const paymentMethodsDetailed = {};

      const paymentsList = allOrders.map(order => {
        const orderPayments = (order.payments || []).map(p => ({
          referenceId: p.referenceId || null,
          method: p.method || null,
          amountPaise: p.amountPaise || 0,
          amount: (p.amountPaise || 0) / 100,
          status: p.status || null,
          paidAt: p.paidAt || null,
          orderId: order._id,
        }));

        (order.payments || []).forEach(p => {
          const amt = p.amountPaise || 0;
          if (p.status === 'success') totalPaymentsMade += amt;
          const method = p.method || 'unknown';
          if (!paymentMethodsDetailed[method]) paymentMethodsDetailed[method] = { totalAmountPaise: 0, payments: [] };
          paymentMethodsDetailed[method].totalAmountPaise += amt;
          paymentMethodsDetailed[method].payments.push({
            referenceId: p.referenceId || null,
            amountPaise: amt,
            amount: amt / 100,
            status: p.status || null,
            paidAt: p.paidAt || null,
            orderId: order._id,
          });
        });

        const pendingForOrder = order.final?.amountDuePaise || 0;
        totalPendingAcrossOrders += pendingForOrder;

        return {
          orderId: order._id,
          orderNumber: order.orderNumber || null,
          orderType: order.orderType || null,
          status: order.status || null,
          totals: {
            subtotalPaise: order.totals?.subtotalPaise || 0,
            totalDiscountPaise: order.totals?.totalDiscountPaise || 0,
            taxableAmountPaise: order.totals?.taxableAmountPaise || 0,
            totalTaxPaise: order.totals?.totalTaxPaise || 0,
            totalPayablePaise: order.totals?.totalPayablePaise || 0,
          },
          discounts: order.discounts || [],
          walletUsed: order.walletUsed || null,
          taxBreakdown: order.taxBreakdown || [],
          payments: orderPayments,
          final: {
            totalPaidPaise: order.final?.totalPaidPaise || 0,
            refundedAmountPaise: order.final?.refundedAmountPaise || 0,
            amountDuePaise: pendingForOrder,
          },
          createdAt: order.createdAt,
        };
      });

      const paymentByMethod = Object.entries(paymentMethodsDetailed).map(([method, info]) => ({
        method,
        totalAmountPaise: info.totalAmountPaise,
        totalAmount: info.totalAmountPaise / 100,
        payments: info.payments,
      }));

      const paymentSummary = {
        totalPaidPaise: totalPaymentsMade,
        totalPendingPaise: totalPendingAcrossOrders,
        payments: paymentsList,
        paymentByMethod,
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
        },
        plan: planData,
        wallet: wallet ? {
          balancePaise: wallet.balancePaise,
          balance: wallet.balancePaise / 100,
          status: wallet.status,
        } : null,
        orderSummary,
        paymentSummary,
        transactions: transactions.map(t => ({
          _id: t._id,
          type: t.type,
          amountPaise: t.amountPaise,
          amount: t.amountPaise / 100,
          source: t.source,
          description: t.description,
          createdAt: t.createdAt,
        })),
      };
    } catch (err) {
      console.error("Error getting company full details:", err);
      throw err;
    }
  }
}

module.exports = CompanyService;
