const yup = require("yup");
module.exports = yup.object({
  name: yup.string().required(),
  isSystem: yup.boolean().optional()
});
