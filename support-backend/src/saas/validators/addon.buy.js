const Joi = require('joi');

module.exports = Joi.object({
  addonCode: Joi.string().required(),
  units: Joi.number().integer().min(1).default(1),
  method: Joi.string().valid('CARD','UPI','NETBANKING','WALLET','OFFLINE').optional()
});
