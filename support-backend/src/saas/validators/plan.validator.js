// src/saas/validators/plan.validator.js
const Joi = require("joi");

exports.create = Joi.object({
  code: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().allow(""),
  planGroup: Joi.string().allow(""),
  pricePaise: Joi.number().min(0).default(0),
  billingCycle: Joi.string().valid("ONETIME", "DAILY", "TRIAL", "WEEKLY", "MONTHLY", "YEARLY").default("MONTHLY"),
  durationDays: Joi.number().allow(null),

  userPricing: Joi.object({
    max_employees: Joi.number().default(0),
    max_branch: Joi.number().default(0),
    max_customers: Joi.number().default(0),
    max_suppliers: Joi.number().default(0),
    max_reseller: Joi.number().default(0),
    storageMB: Joi.number().default(150 * 1024)
  }),

  modulePermissions: Joi.array().items(Joi.object()).default([]),

  isSystem: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
  isCustom: Joi.boolean().default(false),
  isDefault: Joi.boolean().default(false),

  hasTax: Joi.boolean().default(true),
  taxName: Joi.string().default("GST"),
  taxIncluded: Joi.boolean().default(true)
});

exports.update = Joi.object({
  name: Joi.string(),
  description: Joi.string().allow(""),
  pricePaise: Joi.number().min(0),
  billingCycle: Joi.string().valid("ONETIME", "DAILY", "TRIAL", "WEEKLY", "MONTHLY", "YEARLY"),
  durationDays: Joi.number().allow(null),
  userPricing: Joi.object().optional(),
  modulePermissions: Joi.array().items(Joi.object()).optional(),
  isActive: Joi.boolean(),
  hasTax: Joi.boolean(),
  taxName: Joi.string(),
  taxIncluded: Joi.boolean()
});

exports.list = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  search: Joi.string().allow(""),
  planGroup: Joi.string().allow(""),
  billingCycle: Joi.string().allow(""),
  isActive: Joi.boolean().optional()
});
