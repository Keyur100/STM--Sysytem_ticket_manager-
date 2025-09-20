import fs from "fs";
import path from "path";

// Base backend folder
const baseDir = path.resolve("./backend/src");

const structure = {
  constants: [
    "saas.constant.js",
    "billing.constant.js",
    "wallet.constant.js",
    "subscription.constant.js",
  ],
  controllers: {
    saas: [
      "company.controller.js",
      "subscription.controller.js",
      "billing.controller.js",
      "wallet.controller.js",
      "order.controller.js",
      "payment.controller.js",
      "resource.controller.js",
      "coupon.controller.js",
    ],
  },
  models: {
    saas: [
      "company.model.js",
      "subscription.model.js",
      "plan.model.js",
      "addon.model.js",
      "wallet.model.js",
      "order.model.js",
      "payment.model.js",
      "coupon.model.js",
      "usageRecord.model.js",
    ],
  },
  services: {
    saas: [
      "company.service.js",
      "subscription.service.js",
      "billing.service.js",
      "wallet.service.js",
      "order.service.js",
      "payment.service.js",
      "resource.service.js",
      "coupon.service.js",
      "notification.service.js",
      "moduleProvisioning.service.js",
      "usage.service.js",
      "audit.service.js",
    ],
  },
  routes: [
    "saas.routes.js",
    {
      saas: [
        "company.routes.js",
        "subscription.routes.js",
        "billing.routes.js",
        "wallet.routes.js",
        "order.routes.js",
        "payment.routes.js",
        "resource.routes.js",
        "coupon.routes.js",
      ],
    },
  ],
  validators: {
    saas: [
      "company.create.js",
      "company.update.js",
      "subscription.create.js",
      "order.create.js",
      "wallet.topup.js",
      "coupon.apply.js",
    ],
  },
  workers: {
    saas: [
      "trialExpiryWorker.js",
      "billingWorker.js",
      "prorationWorker.js",
      "addonUsageBillingWorker.js",
      "paymentReconciliationWorker.js",
      "moduleProvisioningWorker.js",
      "resourceSyncWorker.js",
      "usageQuotaEnforcementWorker.js",
      "walletTopupWorker.js",
      "walletDeductionWorker.js",
      "autoTicketWorker.js",
      "ticketFollowupWorker.js",
      "usageAggregationWorker.js",
      "auditLoggingWorker.js",
    ],
  },
};

// Recursive folder & file creation
function createStructure(base, obj) {
  if (Array.isArray(obj)) {
    obj.forEach((file) => {
      const filePath = path.join(base, file);
      fs.writeFileSync(filePath, `// ${file}\n`);
    });
  } else if (typeof obj === "object") {
    Object.entries(obj).forEach(([folder, content]) => {
      const dir = path.join(base, folder);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      createStructure(dir, content);
    });
  }
}

function main() {
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  createStructure(baseDir, structure);

  console.log("✅ Backend folder structure created successfully!");
}

main();
