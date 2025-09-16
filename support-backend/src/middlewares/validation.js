module.exports = function (schema) {
  return async function (req, res, next) {
    try {
      if (!schema) return next();
      const validated = await schema.validate(req.body, { abortEarly: false, stripUnknown: true });
      req.validatedBody = validated;
      next();
    } catch (err) {
      return res.status(400).json({ success: false, error: err.errors || err.message });
    }
  };
};
