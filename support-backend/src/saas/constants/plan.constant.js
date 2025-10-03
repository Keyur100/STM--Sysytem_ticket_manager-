// src/saas/constants/plan.constant.js
const env = {
  DEFAULT_PLAN_CODE: process.env.SAAS_DEFAULT_PLAN_CODE || 'BASIC_MONTHLY',
  DEFAULT_BILLING_DAYS: parseInt(process.env.SAAS_DEFAULT_BILLING_DAYS || '30'),
  MONEY_MULTIPLIER: parseInt(process.env.SAAS_MONEY_MULTIPLIER || '100') // paise multiplier
};

module.exports = {
  env,
  // Default example plan tiers you requested - stored here for seeding or quick reference
  DEFAULT_PLANS: [
    {
      code: 'PLAN_SMALL',
      name: 'Small',
      pricePaise: 500 * env.MONEY_MULTIPLIER, // 500 INR -> paise
      durationDays: env.DEFAULT_BILLING_DAYS,
      userPricing: [
        { max_employees: 5, max_branch: 1, max_customers: 50, max_suppliers: 20 }
      ]
    },
    {
      code: 'PLAN_MEDIUM',
      name: 'Medium',
      pricePaise: 300 * env.MONEY_MULTIPLIER, // 300 INR
      durationDays: env.DEFAULT_BILLING_DAYS,
      userPricing: [
        { max_employees: 10, max_branch: 2, max_customers: 150, max_suppliers: 220 }
      ]
    },
    {
      code: 'PLAN_LARGE',
      name: 'Large',
      pricePaise: 200 * env.MONEY_MULTIPLIER, // 200 INR example (you can adjust)
      durationDays: env.DEFAULT_BILLING_DAYS,
      userPricing: [
        { max_employees: 15, max_branch: 3, max_customers: 250, max_suppliers: 320 }
      ]
    }
  ]
};
