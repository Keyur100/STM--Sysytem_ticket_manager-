const Joi = require('joi');

module.exports = Joi.object({
  planCode: Joi.string().required(),
  method: Joi.string().valid('CARD','UPI','NETBANKING','WALLET','OFFLINE').optional(),
  couponCode: Joi.string().optional()
});
