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
};

export default endpoints;
