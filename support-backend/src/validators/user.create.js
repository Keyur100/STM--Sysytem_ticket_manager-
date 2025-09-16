// validators/user.create.js
const yup = require("yup");

module.exports = yup.object({
  email: yup.string().email().required(),
  password: yup.string().min(6).required(),
  name: yup.string().required(),
  memberships: yup.array().of(
    yup.object({
      role: yup.string().required(),
      department: yup.string().optional(),
      isPrimary: yup.boolean().default(false)
    })
  ).required()
});
