// src/saas/seed/data/addon.data.js
// Add-on seed data with pricing information
// Addon values correspond to userPricing and company.usage keys

const addonData = [
  {
    value: "max_employees",
    name: "Extra Employees",
    description: "Add additional employees to your plan",
    pricePaise: 50000, // ₹500
    hasTax: true,
    taxIncluded: false,
    taxName: "GST",
    isSystem: true,
    isActive: true,
    isDeleted: false,
  },
  {
    value: "max_branch",
    name: "Extra Branch",
    description: "Add additional branch to your plan",
    pricePaise: 50000, // ₹500
    hasTax: true,
    taxIncluded: false,
    taxName: "GST",
    isSystem: true,
    isActive: true,
    isDeleted: false,
  },
  {
    value: "max_reseller",
    name: "Extra Reseller",
    description: "Add additional reseller to your plan",
    pricePaise: 50000, // ₹500
    hasTax: true,
    taxIncluded: false,
    taxName: "GST",
    isSystem: true,
    isActive: true,
    isDeleted: false,
  },
  {
    value: "max_customers",
    name: "Extra Customers",
    description: "Add additional customers to your plan",
    pricePaise: 50000, // ₹500
    hasTax: true,
    taxIncluded: false,
    taxName: "GST",
    isSystem: true,
    isActive: true,
    isDeleted: false,
  },
  {
    value: "max_suppliers",
    name: "Extra Suppliers",
    description: "Add additional suppliers to your plan",
    pricePaise: 50000, // ₹500
    hasTax: true,
    taxIncluded: false,
    taxName: "GST",
    isSystem: true,
    isActive: true,
    isDeleted: false,
  },
  {
    value: "storageMB",
    name: "Extra Storage 124MB",
    description: "Add storage to your account",
    pricePaise: 30000, 
    hasTax: true,
    taxIncluded: false,
    taxName: "GST",
    isSystem: true,
    isActive: true,
    isDeleted: false,
  },
];

module.exports = addonData;
//   { // TODO support 24/7 addons
//     value: "ADDON_API_ACCESS",
//     name: "Advanced API Access",
//     description: "Unlimited API calls with advanced features",
//     pricePaise: 149900, // ₹1499
//     hasTax: true,
//     taxIncluded: false,
//     taxName: "GST",
//     isSystem: true,
//     isActive: true,
//     isDeleted: false,
//   },
//   {
//     value: "ADDON_WHITE_LABEL",
//     name: "White Label Solution",
//     description: "White label your instance with custom branding",
//     pricePaise: 299900, // ₹2999
//     hasTax: true,
//     taxIncluded: false,
//     taxName: "GST",
//     isSystem: true,
//     isActive: true,
//     isDeleted: false,
//   },
//   {
//     value: "ADDON_SSO_INTEGRATION",
//     name: "SSO Integration",
//     description: "Enable Single Sign-On (SSO) for your organization",
//     pricePaise: 79900, // ₹799
//     hasTax: true,
//     taxIncluded: false,
//     taxName: "GST",
//     isSystem: true,
//     isActive: true,
//     isDeleted: false,
//   },
//   {
//     value: "ADDON_ADVANCED_ANALYTICS",
//     name: "Advanced Analytics",
//     description: "Get detailed analytics and insights for your business",
//     pricePaise: 129900, // ₹1299
//     hasTax: true,
//     taxIncluded: false,
//     taxName: "GST",
//     isSystem: true,
//     isActive: true,
//     isDeleted: false,
//   },
// ];

module.exports = addonData;
