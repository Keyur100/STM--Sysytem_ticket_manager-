const Company = require('../models/company.model');

async function getCompany(req, res) {
  try {
    const id = req.params.companyId;
    const c = await Company.findById(id).lean();
    if (!c) return res.status(404).json({ error: 'Company not found' });
    return res.status(200).json(c);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Failed' }); }
}

module.exports = { getCompany };
