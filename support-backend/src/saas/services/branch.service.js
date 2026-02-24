const Branch = require('../models/branch.model');
const ClientUser = require('../models/clientUser.model');
const bcrypt = require('bcrypt');

class BranchService {
  static async createBranch(payload, createdBy) {
    const {
      companyId,
      name,
      code,
      companyName,
      tagline,
      address,
      logo,
      phone,
      phone2,
      email,
      gstn,
      pan,
      status,
      contactInfo,
      contactPerson, // { name, email, phone }
    } = payload;

    const branch = await Branch.create({
      companyId,
      code,
      companyName,
      name,
      tagline,
      address,
      logo,
      phone,
      phone2,
      email,
      gstn,
      pan,
      status,
      contactInfo,
    });

    // Optionally create a client user for this branch
    if (contactPerson && contactPerson.email && contactPerson.name) {
      const defaultPassword = 'R@ndom@12345';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(defaultPassword, salt);

      await ClientUser.create({
        companyId,
        branchId: branch._id,
        name: contactPerson.name,
        email: contactPerson.email,
        phone: contactPerson.phone || null,
        passwordHash: hash,
      });
    }

    return branch;
  }

  static async listBranchesByCompany(companyId, { page = 1, limit = 50 } = {}) {
    const skip = (page - 1) * limit;
    const query = { companyId };
    const items = await Branch.find(query).skip(skip).limit(limit).lean();
    const total = await Branch.countDocuments(query);
    return { items, total, page, limit };
  }

  static async getBranchById(id) {
    return Branch.findById(id).lean();
  }

  static async updateBranch(id, payload) {
    return Branch.findByIdAndUpdate(id, { $set: payload }, { new: true }).lean();
  }

  static async deleteBranch(id) {
    return Branch.findByIdAndDelete(id);
  }
}

module.exports = BranchService;
