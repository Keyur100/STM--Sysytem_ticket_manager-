const Joi = require("joi");
const { CouponType } = require("../constants/saas.constant");

exports.create = Joi.object({
  code: Joi.string().trim().uppercase().required(),
  description: Joi.string().allow(""),
  type: Joi.string().valid(...Object.values(CouponType)).required(),
  value: Joi.number().min(0).required(),
  minSpendPaise: Joi.number().min(0).default(0),
  maxUses: Joi.number().min(0).default(0),
  validFrom: Joi.date().optional(),
  validTo: Joi.date().optional(),
  eligiblePlanCodes: Joi.array().items(Joi.string()).optional()
});

exports.update = Joi.object({
  description: Joi.string().allow(""),
  value: Joi.number().optional(),
  validFrom: Joi.date().optional(),
  validTo: Joi.date().optional(),
  maxUses: Joi.number().optional(),
  eligiblePlanCodes: Joi.array().items(Joi.string()).optional()
});
