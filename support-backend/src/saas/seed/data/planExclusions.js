// src/constants/saas/planExclusions.js

module.exports = {
  // 🌿 Trial Plans
  TRIAL_XS: {
    excludeModules: ["supplier", "customer", "product", "billing", "reports"],
    excludeActions: {
      user: ["saas.user_add", "saas.user_edit", "saas.user_delete"],
      employee: ["saas.employee_add", "saas.employee_edit", "saas.employee_delete"],
    },
  },

  TRIAL_S: {
    excludeModules: ["billing", "reports"], // allow most features but no billing/reports
    excludeActions: {
      product: ["saas.product_delete"],
    },
  },

  // 🌱 Monthly Plans
  BASIC_MONTHLY_XS: {
    excludeModules: ["customer", "product"],
    excludeActions: {
      user: ["saas.user_add", "saas.user_edit", "saas.user_delete"],
    },
  },
  BASIC_MONTHLY_S: {
    excludeModules: ["customer"],
    excludeActions: {
      product: ["saas.product_delete"],
    },
  },
  BASIC_MONTHLY_M: {
    excludeActions: {
      product: ["saas.product_delete"],
    },
  },
  BASIC_MONTHLY_L: {},
  BASIC_MONTHLY_XL: {},
  BASIC_MONTHLY_XXL: {}, // ✅ full access

  // 🌗 Half-Yearly Plans (inherits same exclusion)
  BASIC_HALFYEARLY_XS: {
    excludeModules: ["customer", "product"],
    excludeActions: {
      user: ["saas.user_add", "saas.user_edit", "saas.user_delete"],
    },
  },
  BASIC_HALFYEARLY_S: {
    excludeModules: ["customer"],
    excludeActions: {
      product: ["saas.product_delete"],
    },
  },
  BASIC_HALFYEARLY_M: {
    excludeActions: {
      product: ["saas.product_delete"],
    },
  },
  BASIC_HALFYEARLY_L: {},
  BASIC_HALFYEARLY_XL: {},
  BASIC_HALFYEARLY_XXL: {},

  // 🌞 Yearly Plans (inherits same exclusion)
  BASIC_YEARLY_XS: {
    excludeModules: ["customer", "product"],
    excludeActions: {
      user: ["saas.user_add", "saas.user_edit", "saas.user_delete"],
    },
  },
  BASIC_YEARLY_S: {
    excludeModules: ["customer"],
    excludeActions: {
      product: ["saas.product_delete"],
    },
  },
  BASIC_YEARLY_M: {
    excludeActions: {
      product: ["saas.product_delete"],
    },
  },
  BASIC_YEARLY_L: {},
  BASIC_YEARLY_XL: {},
  BASIC_YEARLY_XXL: {}, // ✅ full access

  // 🧩 Default Plan (base limited plan, minimal access)
  DEFAULT_PLAN: {
    excludeModules: [
      "product",
      "customer",
      "supplier",
      "employee",
      "reseller",
      "billing",
      "reports",
    ],
    excludeActions: {
      user: ["saas.user_add", "saas.user_edit", "saas.user_delete"],
      product: ["saas.product_add", "saas.product_edit", "saas.product_delete"],
      employee: ["saas.employee_add", "saas.employee_edit", "saas.employee_delete"],
    },
  },
};
