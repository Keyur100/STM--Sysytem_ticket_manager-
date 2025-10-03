// src/api/endpoints.js
const endpoints = {
  company: {
    list: "/saas/company",
    create: "/saas/company/signup",
    update: (id) => `/saas/company/${id}`,
    get: (id) => `/saas/company/${id}`,
  },
};
export default endpoints;
