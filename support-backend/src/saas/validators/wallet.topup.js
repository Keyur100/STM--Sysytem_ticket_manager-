const Joi = require('joi');

module.exports = Joi.object({
  amountPaise: Joi.number().integer().min(1).required(),
  method: Joi.string().valid('CARD','UPI','NETBANKING','WALLET','OFFLINE').optional()
});
