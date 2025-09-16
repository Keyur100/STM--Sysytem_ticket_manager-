const yup = require("yup");
module.exports = yup.object({
  name: yup.string().required(),
  slug: yup.string().optional(),
  isSystem: yup.boolean().optional()
});
