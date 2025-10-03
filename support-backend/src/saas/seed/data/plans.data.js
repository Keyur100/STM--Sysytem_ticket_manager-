// src/constants/saas/plans.js
const { getPlanPermissions } = require("./modules.data");

const trialPlans = [
  {
    code: "TRIAL_XS",
    name: "Trial XS (7 Days)",
    description: "Free trial plan for small teams with limited features.",
    planGroup: "TRIAL",
    billingCycle: "TRIAL",
    pricePaise: 0,
    durationDays: 7,
    userPricing: {
      max_employees: 2,
      max_branch: 1,
      max_reseller: 1,
      max_customers: 10,
      max_suppliers: 5,
      storageMB: 512,
    },
    modulePermissions: getPlanPermissions("TRIAL_XS"),
    isSystem: true,
    isActive: true,
  },
  {
    code: "TRIAL_S",
    name: "Trial S (7 Days)",
    description: "Free trial plan with broader access for testing.",
    planGroup: "TRIAL",
    billingCycle: "TRIAL",
    pricePaise: 0,
    durationDays: 7,
    userPricing: {
      max_employees: 5,
      max_branch: 1,
      max_reseller: 1,
      max_customers: 20,
      max_suppliers: 10,
      storageMB: 1024,
    },
    modulePermissions: getPlanPermissions("TRIAL_S"),
    isSystem: true,
    isActive: true,
  },
];

// 🧩 Monthly Plans
const monthlyPlans = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
].map((size, index) => {
  const priceList = [50000, 100000, 200000, 300000, 500000, 800000, 1200000];
  const planCode = `BASIC_MONTHLY_${size}`;

  return {
    code: planCode,
    name: `Basic ${size} (Monthly)`,
    description: `Monthly plan (${size}) for various business needs.`,
    planGroup: "BASIC",
    billingCycle: "MONTHLY",
    pricePaise: priceList[index],
    durationDays: 30,
    userPricing: {
      max_employees: [5, 10, 20, 50, 100, 200, 500][index],
      max_branch: [1, 2, 5, 10, 20, 50, 100][index],
      max_reseller: [1, 2, 5, 10, 20, 50, 100][index],
      max_customers: [50, 100, 200, 500, 1000, 2000, 5000][index],
      max_suppliers: [20, 50, 100, 200, 500, 1000, 2000][index],
      storageMB: [1024, 2048, 4096, 8192, 16384, 32768, 65536][index],
    },
    modulePermissions: getPlanPermissions(planCode),
    isSystem: true,
    isActive: true,
  };
});

// 🔑 Derived Plans
const halfYearlyPlans = monthlyPlans.map((plan) => {
  const code = plan.code.replace("MONTHLY", "HALFYEARLY");
  return {
    ...plan,
    code,
    name: plan.name.replace("Monthly", "Half-Yearly"),
    description: plan.description.replace("monthly", "half-yearly"),
    billingCycle: "HALFYEARLY",
    pricePaise: Math.floor(plan.pricePaise * 5),
    durationDays: 182,
    modulePermissions: getPlanPermissions(code),
  };
});

const yearlyPlans = monthlyPlans.map((plan) => {
  const code = plan.code.replace("MONTHLY", "YEARLY");
  return {
    ...plan,
    code,
    name: plan.name.replace("Monthly", "Yearly"),
    description: plan.description.replace("monthly", "yearly"),
    billingCycle: "YEARLY",
    pricePaise: Math.floor(plan.pricePaise * 10),
    durationDays: 365,
    modulePermissions: getPlanPermissions(code),
  };
});

// 🌟 Default Plan (No time limit)
const defaultPlan = [{
  code: "DEFAULT_PLAN",
  name: "Default Plan",
  description: "Base system plan with unlimited duration (no expiry).",
  planGroup: "DEFAULT",
  billingCycle: null, // No billing cycle constraint
  pricePaise: 0,
  durationDays: null, // No time limit
  userPricing: {
    max_employees: 1,
    max_branch: 1,
    max_reseller: 0,
    max_customers: 5,
    max_suppliers: 5,
    storageMB: 256,
  },
  modulePermissions: getPlanPermissions("DEFAULT_PLAN"),
  isSystem: true,
  isActive: true,
  isDefault: true, // ✅ Default plan flag
}]

module.exports = {
  trial: trialPlans,
  monthly: monthlyPlans,
  halfYearly: halfYearlyPlans,
  yearly: yearlyPlans,
  defaultPlan
};
