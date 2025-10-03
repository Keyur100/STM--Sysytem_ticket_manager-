// src/saas/services/company.service.js
const Company = require("../models/company.model");
const WalletService = require("./wallet.service");
const SubscriptionService = require("./subscription.service");
const OrderService = require("./order.service");
const PaymentService = require("./payment.service");
const { env } = require("../constants/saas.constant");
const { enqueueJob } = require("../libs/jobQueue");

class CompanyService {
  // Sign up: create company, wallet, default order/payment/subscription (free) and apply default plan
  static async signupCompany(payload, createdBy) {
    const company = await Company.create({
      ...payload,
      createdBy,
      updatedBy:createdBy
    });

    // wallet
    await WalletService.createForCompany(company._id,createdBy);

    // default plan order/payment: create zero-value order and mark paid
    // const Plan = require("../models/plan.model");
    const Payment = require("../models/payment.model");
    const Order = require("../models/order.model");

    // const defaultPlan = await Plan.findOne({
    //   code: payload.code || env.DEFAULT_PLAN_CODE,
    // });

    // Create order and payment (zero/ledger)
    const order = await Order.create({
      company: company._id,
      type: "PLAN",
      targetId: payload.plan._id,
      amountPaise: payload.plan?.pricePaise  ||0,
      status: "PAID",
      createdBy,
      updatedBy:createdBy

    });
//TODO if amountpaise is more than  0 then u need to do actual payment insted wallet ,now i am considering in cash payment
    const payment = await Payment.create({
      order: order._id,
      company: company._id,
      amountPaise: order.amountPaise,
      method: "OFFLINE",//"WALLET",
      status: "SUCCESS",
      createdBy,
      updatedBy:createdBy
    });
     
    const updatedBy=createdBy
    // assign default plan (creates subscription and applies permissions)
    const subscription = await SubscriptionService.assignDefaultPlan(
      company._id,
      createdBy,
      updatedBy,
      payload.plan,
      payment
    );

    // Enqueue audit log job + welcome/notification email
    await enqueueJob({
      type: "audit.log_event",
      payload: {
        action: "signup",
        entityType: "Company",
        entityId: company._id,
        createdBy,
      },
      priority: 5,
    });

    await enqueueJob({
      type: "notification.send_welcome",
      payload: {
        companyId: company._id,
        email: company.contact && company.contact.email,
      },
      priority: 1,
      scheduledAt: Date.now() + 1000,
    });

    return company;
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

  // Update company
  static async updateCompany(companyId, payload, updatedBy) {
    const company = await Company.findByIdAndUpdate(
      companyId,
      { ...payload, updatedBy },
      { new: true }
    );

    if (!company) throw new Error("Company not found");

    await enqueueJob({
      type: "audit.log_event",
      payload: {
        action: "update",
        entityType: "Company",
        entityId: companyId,
        updatedBy,
      },
      priority: 10,
    });

    return company;
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

    // 🔽 Sorting logic
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // 🧩 Aggregation pipeline
    const pipeline = [
      { $match: match },
      { $sort: sort },

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

    // ✅ Return clean formatted data
    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      sortBy,
      sortOrder,
    };
  }


  // Fetch company by ID
  static async getCompanyById(companyId) {
    return Company.findById(companyId)
      .populate("subscription")
      // .populate("wishlist")
      .lean();
  }
}

module.exports = CompanyService;
