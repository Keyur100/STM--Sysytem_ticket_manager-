const Joi = require("joi");

// Common sub-schemas
const bankAccountSchema = Joi.object({
  accountNumber: Joi.string().trim().required(),
  ifsc: Joi.string().trim().required(),
}).required();

const contactSchema = Joi.object({
  personName: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().trim().required(),
  address: Joi.string().trim().required(),
}).required();

const planSchema = Joi.object({
  _id: Joi.string().required(),
  name: Joi.string().required(),
  duration: Joi.string().valid("monthly", "yearly", "trial").required(),
  price: Joi.number().min(0).required(),
  modulePermissions: Joi.array()
    .items(
      Joi.object({
        moduleKey: Joi.string().required(),
        actions: Joi.array()
          .items(
            Joi.object({
              key: Joi.string().required(),
              // label: Joi.string().required(),
            })
          )
          .required(),
      })
    )
    .required(),
}).required();

const permissionsSchema = Joi.object().pattern(
  Joi.string(), // moduleKey
  Joi.array().items(Joi.string()) // list of action keys
);

// 🏗️ Create company
const create = Joi.object({
  name: Joi.string().trim().required(),
  url: Joi.string().uri().optional(),
  panNo: Joi.string().trim().required(),
  gstNo: Joi.string().trim().required(),
  bankAccount: bankAccountSchema,
  contact: contactSchema,
  plan: planSchema,
  permissions: permissionsSchema.required(),
}).required();

// ✏️ Update company
const update = Joi.object({
  name: Joi.string().trim().optional(),
  url: Joi.string().uri().optional(),
  panNo: Joi.string().trim().optional(),
  gstNo: Joi.string().trim().optional(),
  bankAccount: bankAccountSchema.optional(),
  contact: contactSchema.optional(),
  plan: planSchema.optional(),
  permissions: permissionsSchema.optional(),
}).required();

// 📋 List companies (pagination, search, sorting)
const list = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow("").optional(),
  sortBy: Joi.string().valid("name", "createdAt", "updatedAt").default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("asc"),
}).required();

module.exports = {
  create,
  update,
  list,
};
