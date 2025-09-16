const yup = require("yup");
const ticketCreateSchema = yup.object({
  title: yup.string().required(),
  description: yup.string().required(),
  createdBy: yup.string().optional(),
  tags: yup.array().of(yup.string()).optional(),
  department: yup.string().required(),
  assignedAgentId : yup.string().optional(),
});
const ticketUpdateSchema = yup.object({
  title: yup.string().optional(),
  description: yup.string().optional(),
  statusKey: yup.string().optional(),
  tags: yup.array().of(yup.string()).optional(),
  department: yup.string().required(),
  assignedAgentId : yup.string().optional(),
  priority: yup.string().optional(),
});
const replyCreateSchema = yup.object({
  ticketId: yup.string().required(),
  message: yup.string().required(),
  createdBy: yup.string().optional()
});
module.exports = { ticketCreateSchema, ticketUpdateSchema, replyCreateSchema };
