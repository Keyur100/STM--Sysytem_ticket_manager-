const Joi = require("joi");

const actionSchema = Joi.object({
  key: Joi.string().required(),
  label: Joi.string().required(),
});

module.exports = {
  create: Joi.object({
    group: Joi.string().required(),
    moduleKey: Joi.string().required(),
    displayName: Joi.string().required(),
    actions: Joi.array().items(actionSchema).min(1).required(),
  }),

  update: Joi.object({
    group: Joi.string().optional(),
    moduleKey: Joi.string().optional(),
    displayName: Joi.string().optional(),
    actions: Joi.array().items(actionSchema).optional(),
    isActive: Joi.boolean().optional(),
    isDeleted: Joi.boolean().optional(),
  }),

  list: Joi.object({
    search: Joi.string().allow("", null),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    isActive: Joi.boolean().optional(),
  }),
};
