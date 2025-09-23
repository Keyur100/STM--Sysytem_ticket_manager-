// generate-backend-structure.js
import fs from "fs";
import path from "path";

// ========== UTILITY ==========
function createStructure(base, obj) {
  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      if (typeof item === "string") {
        const filePath = path.join(base, item);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, `// ${item}\n`);
          console.log(`[create] ${filePath}`);
        } else {
          console.log(`[skip] ${filePath} already exists`);
        }
      } else if (typeof item === "object") {
        Object.entries(item).forEach(([folder, content]) => {
          const dir = path.join(base, folder);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`[create] ${dir}/`);
          }
          createStructure(dir, content);
        });
      }
    });
  } else if (typeof obj === "object") {
    Object.entries(obj).forEach(([folder, content]) => {
      const dir = path.join(base, folder);
      if (folder !== "") {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`[create] ${dir}/`);
        }
      }
      createStructure(folder === "" ? base : dir, content);
    });
  }
}

// ========== BACKEND STRUCTURE ==========
const backendBase = path.resolve("./support-backend");

const backendStructure = {
  "": [
    ".env",
    ".env.example",
    "package-lock.json",
    "package.json",
    "pm2.worker.config.js",
  ],
  src: {
    constants: ["index.js", "ticket.constant.js"],
    "": ["constantsJobs.js", "server.js"],
    controllers: [
      "analytics.controller.js",
      "audit.controller.js",
      "auth.controller.js",
      "department.controller.js",
      "reply.controller.js",
      "role.controller.js",
      "tag.controller.js",
      "ticket.controller.js",
      "user.controller.js",
      "worker.controller.js",
    ],
    libs: [
      "jobQueue.js",
      "logger.js",
      "rateLimiter.js",
      "reaper.js",
      "redisClient.js",
    ],
    middlewares: [
      "authJwt.js",
      "errorHandler.js",
      "rbac.js",
      "tryCatch.js",
      "validation.js",
    ],
    models: [
      "audit.model.js",
      "department.model.js",
      "job.model.js",
      "mongoose.js",
      "reply.model.js",
      "replyAttachment.model.js",
      "role.model.js",
      "summary.ticket_by_agent.model.js",
      "tag.model.js",
      "ticket.model.js",
      "ticketAssignment.model.js",
      "ticketRelationship.model.js",
      "user.model.js",
      "userMembership.model.js",
      "worker.model.js",
    ],
    routes: ["api.js"],
    seed: ["initialData.js"],
    services: {
      auth: ["auth.helper.service.js", "auth.service.js"],
      ticket: ["assign_reassign.service.js", "sla.service.js"],
    },
    utils: ["bcrypt.js", "pagination.js", "response.js", "token.service.js"],
    validators: [
      "auth.login.js",
      "auth.register.js",
      "department.create.js",
      "department.update.js",
      "role.create.js",
      "role.update.js",
      "tag.create.js",
      "tag.update.js",
      "user.create.js",
      "yupSchemas.js",
    ],
    workers: [
      "assignmentWorker.js",
      "auditWorker.js",
      "autocloseWorker.js",
      "baseWorker.js",
      "escalationWorker.js",
      "notificationWorker.js",
      "replyWorker.js",
    ],

    // SaaS specific structure
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
  },
};

// ========== MAIN ==========
function main() {
  console.log("🚀 Creating Support Backend...");
  createStructure(backendBase, backendStructure);
  console.log("✅ Support backend structure created!");
}

main();
