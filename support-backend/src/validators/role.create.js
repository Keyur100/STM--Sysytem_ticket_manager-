const yup = require("yup");
module.exports = yup.object({
  name: yup.string().required(),
  permissions: yup.array().of(yup.string()).optional(),
  isSystem: yup.boolean().optional()
});
