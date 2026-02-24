const endpoints = {
  company: {
    list: "/saas/company",
    create: "/saas/company/signup",
    update: (id) => `/saas/company/${id}`,
    get: (id) => `/saas/company/${id}`,
  },

  wallet: {
    get: (companyId) => `/saas/wallet/${companyId}`,
    topup: (companyId) => `/saas/wallet/topup/${companyId}`,
    deduct: (companyId) => `/saas/wallet/deduct/${companyId}`,
    transactions: (companyId) => `/saas/wallet/${companyId}/transactions`,
  },

  subscription: {
    list: "/saas/subscription",
    get: (id) => `/saas/subscription/${id}`,
  },

  addon: {
    list: "/saas/addons",
    get: (id) => `/saas/addons/${id}`,
  },
  branch: {
    list: "/saas/branch",
    get: (id) => `/saas/branch/${id}`,
    create: "/saas/branch",
    update: (id) => `/saas/branch/${id}`,
    remove: (id) => `/saas/branch/${id}`,
  },
};

export default endpoints;
