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

class CompanyService {

   /** ✅ Step 1 — Create Draft Company */
  static async createDraftCompany(payload, createdBy) {
    const company = await Company.create({
      name: payload.name || "Untitled Company",
      url: payload.url || {},
      panNo: payload.panNo || {},
      gstNo: payload.gstNo || {},
      contact: payload.contact || {},
      status: "DRAFT",
      createdBy,
      updatedBy: createdBy,
    });

    // auto create wallet
    await WalletService.createForCompany(company._id, createdBy);
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

  /** ✅ Step 3 — Signup with Plan + Payment (already given by you) */
//   | Scenario                     | Wallet Balance | Plan Price | Payment Method | Expected Behavior                                       |
// | ---------------------------- | -------------- | ---------- | -------------- | ------------------------------------------------------- |
// | Wallet disabled              | ₹0             | ₹1000      | Razorpay       | Pay ₹1000 via Razorpay                                  |
// | Wallet enabled (partial)     | ₹300           | ₹1000      | Razorpay       | Deduct ₹300 from wallet → Pay ₹700 via Razorpay         |
// | Wallet enabled (full)        | ₹1200          | ₹1000      | Razorpay       | Deduct ₹1000 from wallet → no Razorpay call, mark paid  |
// | Wallet enabled + Offline     | ₹300           | ₹1000      | Offline        | Deduct ₹300 wallet → mark ₹700 as offline payment       |
// | Wallet only (enough balance) | ₹1500          | ₹1000      | Any            | Deduct ₹1000 from wallet only → mark paid (no Razorpay) |

//  static async signupCompany(payload, createdBy) {
//   const plan = payload.plan;
//   if (!plan) throw new Error("Plan required");

//   const company = await Company.findById(payload.companyId);
//   if (!company) throw new Error("Company not found");

//   // calculate price
//   let amountPaise = plan.pricePaise || 0;
//   if (payload.couponCode) {
//     const result = await CouponService.validateAndApply(payload.couponCode, plan.code, amountPaise);
//     amountPaise = result.finalAmountPaise;
//   }

//   // ✅ Apply wallet deduction if opted
//   let walletUsedPaise = payload.useWallet ? (payload.walletAmountPaise || 0) : 0;
//   if (walletUsedPaise > 0) {
//     await WalletService.deductAmount(company._id, walletUsedPaise, 'PLAN_PARTIAL_PAYMENT', null);
//     amountPaise = Math.max(0, amountPaise - walletUsedPaise);
//   }

//   // ✅ Free or fully wallet-covered plan
//   if (amountPaise <= 0) {
//     const order = await orderModel.create({ company: company._id, type: "PLAN", targetId: plan._id, amountPaise: 0, status: "PAID", createdBy, updatedBy: createdBy });
//     const payment = await paymentModel.create({ order: order._id, company: company._id, amountPaise: 0, method: "WALLET", status: "SUCCESS", createdBy, updatedBy: createdBy });
//     await SubscriptionService.newSubscription(company._id, plan, payment);
//     return { company, order, payment };
//   }

//   // ✅ Partial wallet + Razorpay/Offline flow
//   const { order, payment, rzpOrder } = await PaymentService.createOrderAndPayment({
//     companyId: company._id,
//     type: "PLAN",
//     targetId: plan._id,
//     amountPaise,
//     paymentMethod: payload.paymentMethod,
//     couponCode: payload.couponCode,
//     renewalType: "NEW",
//     createdBy,
//     plan
//   });

//   return { company, order, payment, rzpOrder };
// }

// // inside CompanyService
// static async updateSignupCompany(payload, updatedBy) {
//   const { companyId, plan, paymentMethod, couponCode, useWallet, walletAmountPaise } = payload;
//   if (!plan) throw new Error("Plan required");
//   if (!companyId) throw new Error("Company ID required");

//   const company = await Company.findById(companyId).populate('subscription');
//   if (!company) throw new Error("Company not found");

//   // Get current plan
//   const currentSub = company.subscription ? await Subscription.findById(company.subscription) : null;
//   const currentPlan = currentSub ? await Plan.findById(currentSub.planId) : null;

//   // Calculate base amount for new plan
//   let amountPaise = plan.pricePaise || 0;

//   // ✅ Apply coupon if any
//   if (couponCode) {
//     const result = await CouponService.validateAndApply(couponCode, plan.code, amountPaise);
//     amountPaise = result.finalAmountPaise;
//   }

//   // ✅ Apply wallet deduction
//   let walletUsedPaise = useWallet ? (walletAmountPaise || 0) : 0;
//   if (walletUsedPaise > 0) {
//     await WalletService.deductAmount(company._id, walletUsedPaise, 'PLAN_PARTIAL_PAYMENT');
//     amountPaise = Math.max(0, amountPaise - walletUsedPaise);
//   }

//   // ✅ If no payment needed (wallet or free)
//   if (amountPaise <= 0) {
//     const order = await orderModel.create({
//       company: company._id,
//       type: "PLAN",
//       targetId: plan._id,
//       amountPaise: 0,
//       renewalType: currentPlan
//         ? plan.pricePaise > currentPlan.pricePaise
//           ? "UPGRADE"
//           : plan.pricePaise < currentPlan.pricePaise
//           ? "DOWNGRADE"
//           : "RENEWAL"
//         : "NEW",
//       status: "PAID",
//       createdBy: updatedBy,
//       updatedBy,
//     });

//     const payment = await paymentModel.create({
//       order: order._id,
//       company: company._id,
//       amountPaise: 0,
//       method: "WALLET",
//       status: "SUCCESS",
//       createdBy: updatedBy,
//       updatedBy,
//     });

//     // ✅ Handle new subscription / upgrade / downgrade
//     await SubscriptionService.changePlan(company._id, plan, payment);

//     return { company, order, payment };
//   }

//   // ✅ If payment is required (after wallet/coupon)
//   const renewalType = currentPlan
//     ? plan.pricePaise > currentPlan.pricePaise
//       ? "UPGRADE"
//       : plan.pricePaise < currentPlan.pricePaise
//       ? "DOWNGRADE"
//       : "RENEWAL"
//     : "NEW";

//   // ✅ Create order and payment via PaymentService
//   const { order, payment, rzpOrder } = await PaymentService.createOrderAndPayment({
//     companyId: company._id,
//     type: "PLAN",
//     targetId: plan._id,
//     amountPaise,
//     paymentMethod,
//     couponCode,
//     renewalType,
//     createdBy: updatedBy,
//     plan,
//   });

//   return { company, order, payment, rzpOrder };
// }

// ✅ Combined logic for new or existing plan purchase
static async signupOrUpdateCompany(payload, userId) {
  const { companyId, plan, paymentMethod, couponCode, useWallet, walletAmountPaise } = payload;

  if (!plan) throw new Error("Plan required");
  if (!companyId) throw new Error("Company ID required");

  const company = await Company.findById(companyId).populate("subscription");
  if (!company) throw new Error("Company not found");

  // ✅ Check if company already has an active subscription
  const hasActiveSub = !!company.subscription;
  const currentSub = hasActiveSub ? await Subscription.findById(company.subscription) : null;
  const currentPlan = currentSub ? await Plan.findById(currentSub.planId) : null;

  // ✅ Calculate base plan amount
  let amountPaise = plan.pricePaise || 0;

  // ✅ Apply coupon if provided
  if (couponCode) {
    const result = await CouponService.validateAndApply(couponCode, plan.code, amountPaise);
    amountPaise = result.finalAmountPaise;
  }

  // ✅ Apply wallet if opted
  let walletUsedPaise = useWallet ? (walletAmountPaise || 0) : 0;
  if (walletUsedPaise > 0) {
    await WalletService.deductAmount(company._id, walletUsedPaise, "PLAN_PARTIAL_PAYMENT", null);
    amountPaise = Math.max(0, amountPaise - walletUsedPaise);
  }

  // ✅ Case 1: No Payment Needed (wallet fully covered or free)
  if (amountPaise <= 0) {
    // Determine renewalType
    const renewalType = hasActiveSub
      ? plan.pricePaise > currentPlan.pricePaise
        ? "UPGRADE"
        : plan.pricePaise < currentPlan.pricePaise
        ? "DOWNGRADE"
        : "RENEWAL"
      : "NEW";

    // Create Order & Payment
    const order = await orderModel.create({
      company: company._id,
      type: "PLAN",
      targetId: plan._id,
      amountPaise: 0,
      renewalType,
      status: "PAID",
      createdBy: userId,
      updatedBy: userId,
    });

    const payment = await paymentModel.create({
      order: order._id,
      company: company._id,
      amountPaise: 0,
      method: "WALLET",
      status: "SUCCESS",
      createdBy: userId,
      updatedBy: userId,
    });

    // ✅ Apply new or updated subscription
    if (hasActiveSub) {
      await SubscriptionService.changePlan(company._id, plan, payment);
    } else {
      await SubscriptionService.newSubscription(company._id, plan, payment);
    }

    return { company, order, payment };
  }

  // ✅ Case 2: Payment Required (after wallet/coupon deduction)
  const renewalType = hasActiveSub
    ? plan.pricePaise > currentPlan.pricePaise
      ? "UPGRADE"
      : plan.pricePaise < currentPlan.pricePaise
      ? "DOWNGRADE"
      : "RENEWAL"
    : "NEW";

  // ✅ Create order + payment record (via PaymentService)
  const { order, payment, rzpOrder } = await PaymentService.createOrderAndPayment({
    companyId: company._id,
    type: "PLAN",
    targetId: plan._id,
    amountPaise,
    paymentMethod,
    couponCode,
    renewalType,
    createdBy: userId,
    plan,
  });

  return { company, order, payment, rzpOrder };
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
    return Company.findById(companyId)
      // .populate("subscription")
      // .populate("wishlist")
      .lean();
  }

}

module.exports = CompanyService;
