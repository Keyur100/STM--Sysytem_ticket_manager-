// // generate-backend-structure.js
// import fs from "fs";
// import path from "path";

// // ========== UTILITY ==========
// function createStructure(base, obj) {
//   if (Array.isArray(obj)) {
//     obj.forEach((item) => {
//       if (typeof item === "string") {
//         const filePath = path.join(base, item);
//         if (!fs.existsSync(filePath)) {
//           fs.writeFileSync(filePath, `// ${item}\n`);
//           console.log(`[create] ${filePath}`);
//         } else {
//           console.log(`[skip] ${filePath} already exists`);
//         }
//       } else if (typeof item === "object") {
//         Object.entries(item).forEach(([folder, content]) => {
//           const dir = path.join(base, folder);
//           if (!fs.existsSync(dir)) {
//             fs.mkdirSync(dir, { recursive: true });
//             console.log(`[create] ${dir}/`);
//           }
//           createStructure(dir, content);
//         });
//       }
//     });
//   } else if (typeof obj === "object") {
//     Object.entries(obj).forEach(([folder, content]) => {
//       const dir = path.join(base, folder);
//       if (folder !== "") {
//         if (!fs.existsSync(dir)) {
//           fs.mkdirSync(dir, { recursive: true });
//           console.log(`[create] ${dir}/`);
//         }
//       }
//       createStructure(folder === "" ? base : dir, content);
//     });
//   }
// }

// // ========== BACKEND STRUCTURE ==========
// const backendBase = path.resolve("./support-backend");

// const backendStructure = {
//   "": [
//     ".env",
//     ".env.example",
//     "package-lock.json",
//     "package.json",
//     "pm2.worker.config.js",
//   ],
//   src: {
//     constants: ["index.js", "ticket.constant.js"],
//     "": ["constantsJobs.js", "server.js"],
//     controllers: [
//       "analytics.controller.js",
//       "audit.controller.js",
//       "auth.controller.js",
//       "department.controller.js",
//       "reply.controller.js",
//       "role.controller.js",
//       "tag.controller.js",
//       "ticket.controller.js",
//       "user.controller.js",
//       "worker.controller.js",
//     ],
//     libs: [
//       "jobQueue.js",
//       "logger.js",
//       "rateLimiter.js",
//       "reaper.js",
//       "redisClient.js",
//     ],
//     middlewares: [
//       "authJwt.js",
//       "errorHandler.js",
//       "rbac.js",
//       "tryCatch.js",
//       "validation.js",
//     ],
//     models: [
//       "audit.model.js",
//       "department.model.js",
//       "job.model.js",
//       "mongoose.js",
//       "reply.model.js",
//       "replyAttachment.model.js",
//       "role.model.js",
//       "summary.ticket_by_agent.model.js",
//       "tag.model.js",
//       "ticket.model.js",
//       "ticketAssignment.model.js",
//       "ticketRelationship.model.js",
//       "user.model.js",
//       "userMembership.model.js",
//       "worker.model.js",
//     ],
//     routes: ["api.js"],
//     seed: ["initialData.js"],
//     services: {
//       auth: ["auth.helper.service.js", "auth.service.js"],
//       ticket: ["assign_reassign.service.js", "sla.service.js"],
//     },
//     utils: ["bcrypt.js", "pagination.js", "response.js", "token.service.js"],
//     validators: [
//       "auth.login.js",
//       "auth.register.js",
//       "department.create.js",
//       "department.update.js",
//       "role.create.js",
//       "role.update.js",
//       "tag.create.js",
//       "tag.update.js",
//       "user.create.js",
//       "yupSchemas.js",
//     ],
//     workers: [
//       "assignmentWorker.js",
//       "auditWorker.js",
//       "autocloseWorker.js",
//       "baseWorker.js",
//       "escalationWorker.js",
//       "notificationWorker.js",
//       "replyWorker.js",
//     ],

//     // SaaS specific structure
//     constants: [
//       "saas.constant.js",
//       "billing.constant.js",
//       "wallet.constant.js",
//       "subscription.constant.js",
//     ],
//     controllers: {
//       saas: [
//         "company.controller.js",
//         "subscription.controller.js",
//         "billing.controller.js",
//         "wallet.controller.js",
//         "order.controller.js",
//         "payment.controller.js",
//         "resource.controller.js",
//         "coupon.controller.js",
//       ],
//     },
//     models: {
//       saas: [
//         "company.model.js",
//         "subscription.model.js",
//         "plan.model.js",
//         "addon.model.js",
//         "wallet.model.js",
//         "order.model.js",
//         "payment.model.js",
//         "coupon.model.js",
//         "usageRecord.model.js",
//       ],
//     },
//     services: {
//       saas: [
//         "company.service.js",
//         "subscription.service.js",
//         "billing.service.js",
//         "wallet.service.js",
//         "order.service.js",
//         "payment.service.js",
//         "resource.service.js",
//         "coupon.service.js",
//         "notification.service.js",
//         "moduleProvisioning.service.js",
//         "usage.service.js",
//         "audit.service.js",
//       ],
//     },
//     routes: [
//       "saas.routes.js",
//       {
//         saas: [
//           "company.routes.js",
//           "subscription.routes.js",
//           "billing.routes.js",
//           "wallet.routes.js",
//           "order.routes.js",
//           "payment.routes.js",
//           "resource.routes.js",
//           "coupon.routes.js",
//         ],
//       },
//     ],
//     validators: {
//       saas: [
//         "company.create.js",
//         "company.update.js",
//         "subscription.create.js",
//         "order.create.js",
//         "wallet.topup.js",
//         "coupon.apply.js",
//       ],
//     },
//     workers: {
//       saas: [
//         "trialExpiryWorker.js",
//         "billingWorker.js",
//         "prorationWorker.js",
//         "addonUsageBillingWorker.js",
//         "paymentReconciliationWorker.js",
//         "moduleProvisioningWorker.js",
//         "resourceSyncWorker.js",
//         "usageQuotaEnforcementWorker.js",
//         "walletTopupWorker.js",
//         "walletDeductionWorker.js",
//         "autoTicketWorker.js",
//         "ticketFollowupWorker.js",
//         "usageAggregationWorker.js",
//         "auditLoggingWorker.js",
//       ],
//     },
//   },
// };

// // ========== MAIN ==========
// function main() {
//   console.log("🚀 Creating Support Backend...");
//   createStructure(backendBase, backendStructure);
//   console.log("✅ Support backend structure created!");
// }

// main();


// create_file_folder.js
// Run: node create_file_folder.js

const fs = require("fs");
const path = require("path");

const baseDir = path.join(__dirname, "support-backend", "src", "saas");

const folders = [
  "constants",
  "models",
  "services",
  "controllers",
  "workers",
  "helpers",
  "routes",
  "validators",
];

const files = {
  constants: [
    "saas.constant.js",
    "subscription.constant.js",
    "wallet.constant.js",
    "billing.constant.js",
  ],
  models: [
    "company.model.js",
    "wallet.model.js",
    "plan.model.js",
    "subscription.model.js",
    "addon.model.js",
    "module.model.js",
    "usageRecord.model.js",
    "payment.model.js",
    "order.model.js",
    "coupon.model.js",
    "refund.model.js",
    "invoice.model.js",
  ],
  services: [
    "company.service.js",
    "subscription.service.js",
    "addon.service.js",
    "payment.service.js",
    "order.service.js",
    "wallet.service.js",
    "usage.service.js",
    "billing.service.js",
    "coupon.service.js",
    "notification.service.js",
    "audit.service.js",
  ],
  controllers: [
    "company.controller.js",
    "subscription.controller.js",
    "addon.controller.js",
    "payment.controller.js",
    "order.controller.js",
    "wallet.controller.js",
    "billing.controller.js",
    "coupon.controller.js",
    "resource.controller.js",
    "usage.controller.js",
    "admin.controller.js",
  ],
  workers: [
    "subscriptionExpiry.worker.js",
    "addonExpiry.worker.js",
    "pendingAddonApplier.worker.js",
    "paymentReconciliation.worker.js",
    "usageQuotaEnforcement.worker.js",
    "billing.worker.js",
    "proration.worker.js",
    "walletDeduction.worker.js",
    "trialExpiry.worker.js",
    "health.worker.js",
  ],
  helpers: [
    "db.helper.js",
    "response.helper.js",
    "validation.helper.js",
    "logger.helper.js",
  ],
};

// ---------- Templates ----------

// Worker template (model, service, controller inside)
const workerTemplate = (name) => `// ${name}
// Worker model, service, controller entry

// model
class ${toClassName(name)}Model {
  constructor(data) {
    this.data = data;
  }
  static async findJobs() {
    // TODO: implement fetching jobs from DB
    return [];
  }
}

// service
class ${toClassName(name)}Service {
  static async run(job) {
    // TODO: implement worker logic
    console.log("[${name}] running job:", job);
  }
}

// controller
class ${toClassName(name)}Controller {
  static async trigger(req, res) {
    try {
      const jobs = await ${toClassName(name)}Model.findJobs();
      for (const job of jobs) {
        await ${toClassName(name)}Service.run(job);
      }
      return res.json({ success: true, worker: "${name}", processed: jobs.length });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = { ${toClassName(name)}Model, ${toClassName(name)}Service, ${toClassName(name)}Controller };
`;

// Route template for controllers
const controllerRouteTemplate = (controller) => `// ${controller.replace(
  ".controller.js",
  ""
)}.route.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/${controller}");

router.get("/", (req, res) => controller.getAll?.(req, res));
router.post("/", (req, res) => controller.create?.(req, res));

module.exports = router;
`;

// Validator template
const validatorTemplate = (controller) => `// ${controller.replace(
  ".controller.js",
  ""
)}.validator.js
module.exports = {
  create: (req, res, next) => {
    // TODO: add validation logic for create
    next();
  },
  update: (req, res, next) => {
    // TODO: add validation logic for update
    next();
  },
};
`;

// Helper: convert worker file name → ClassName
function toClassName(file) {
  return file
    .replace(".worker.js", "")
    .split(/[-_.]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

// ---------- Execution ----------

// 1. Create all folders first
folders.forEach((folder) => {
  const folderPath = path.join(baseDir, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`📁 Created folder: ${folderPath}`);
  }
});

// 2. Create files
folders.forEach((folder) => {
  const folderPath = path.join(baseDir, folder);

  // Controllers → also create routes + validators
  if (folder === "controllers") {
    files.controllers.forEach((file) => {
      const controllerPath = path.join(folderPath, file);
      if (!fs.existsSync(controllerPath)) {
        fs.writeFileSync(controllerPath, `// ${file}\n`);
        console.log(`📄 Created controller: ${controllerPath}`);
      }

      // Route file
      const routePath = path.join(
        baseDir,
        "routes",
        file.replace(".controller.js", ".route.js")
      );
      if (!fs.existsSync(routePath)) {
        fs.writeFileSync(routePath, controllerRouteTemplate(file));
        console.log(`📄 Created route: ${routePath}`);
      }

      // Validator file
      const validatorPath = path.join(
        baseDir,
        "validators",
        file.replace(".controller.js", ".validator.js")
      );
      if (!fs.existsSync(validatorPath)) {
        fs.writeFileSync(validatorPath, validatorTemplate(file));
        console.log(`📄 Created validator: ${validatorPath}`);
      }
    });
  }

  // Workers → add model/service/controller code
  else if (folder === "workers") {
    files.workers.forEach((file) => {
      const filePath = path.join(folderPath, file);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, workerTemplate(file));
        console.log(`📄 Created worker: ${filePath}`);
      }
    });
  }

  // Other folders → plain files
  else {
    (files[folder] || []).forEach((file) => {
      const filePath = path.join(folderPath, file);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, `// ${file}\n`);
        console.log(`📄 Created file: ${filePath}`);
      }
    });
  }
});

console.log("\n✅ SaaS structure created successfully with workers, routes, and validators!");
