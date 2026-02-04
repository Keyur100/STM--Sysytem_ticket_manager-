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

      // ✅ Join Subscription to get plan expiry
      {
        $lookup: {
          from: "subscriptions",
          localField: "subscription",
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

      // ✅ Join Payment to get last payment details
      {
        $lookup: {
          from: "payments",
          let: { companyId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$company", "$$companyId"] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: "payment",
        },
      },
      {
        $unwind: {
          path: "$payment",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ✅ Project only required fields for frontend
      {
        $project: {
          name: 1,
          email: "$contact.email",
          status: 1,
          "plan.name": "$plan.name",
          "plan.pricePaise": "$plan.pricePaise",
          planExpiry: "$subscription.endDate",
          paymentMethod: "$payment.method",
          paymentStatus: "$payment.status",
          paymentAmount: {
            $cond: [
              { $ifNull: ["$payment.amountPaise", false] },
              { $divide: ["$payment.amountPaise", 100] },
              null,
            ],
          },
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
        status: "completed",
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
}

module.exports = CompanyService;
