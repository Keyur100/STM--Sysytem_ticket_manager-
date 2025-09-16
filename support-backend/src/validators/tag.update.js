const yup = require("yup");
module.exports = yup.object({
  name: yup.string().optional(),
  slug: yup.string().optional()
});
