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

    // Ensure branch code uniqueness per company (if provided)
    if (code) {
      const exists = await Branch.findOne({ companyId, code }).lean().catch(() => null);
      if (exists) throw new Error('Branch code already exists for this company');
    }

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
      // const defaultPassword = 'R@ndom@12345';
      // const salt = await bcrypt.genSalt(10);
      // const hash = await bcrypt.hash(defaultPassword, salt);

      // Ensure client user email uniqueness within company
      const existingUser = await ClientUser.findOne({ companyId, email: contactPerson.email }).catch(() => null);
      if (existingUser) {
        // If a client user already exists for this company, associate it to this branch instead of failing.
        try {
          existingUser.branchId = existingUser.branchId || branch._id;
          await ClientUser.updateOne({ _id: existingUser._id }, { $set: { branchId: branch._id } });
        } catch (e) {
          // fallback: do nothing
        }
      } else {
        await ClientUser.create({
          companyId,
          branchId: branch._id,
          name: contactPerson.name,
          email: contactPerson.email,
          phone: contactPerson.phone || null,
          // passwordHash: hash,
        });
      }
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

  static async listAllBranches({ page = 1, limit = 50 } = {}) {
    const skip = (page - 1) * limit;
    const query = {}; // no filter — return all branches
    const items = await Branch.find(query).skip(skip).limit(limit).lean();
    const total = await Branch.countDocuments(query);
    return { items, total, page, limit };
  }

  static async getBranchById(id) {
    return Branch.findById(id).lean();
  }

  static async updateBranch(id, payload) {
    // If code is being changed, ensure uniqueness per company
    if (payload && payload.code && payload.companyId) {
      const exists = await Branch.findOne({ companyId: payload.companyId, code: payload.code, _id: { $ne: id } }).lean().catch(() => null);
      if (exists) throw new Error('Branch code already exists for this company');
    }

    if (payload && payload.email && payload.companyId) {
      const existsEmail = await Branch.findOne({ companyId: payload.companyId, email: payload.email, _id: { $ne: id } }).lean().catch(() => null);
      if (existsEmail) throw new Error('Branch email already exists for this company');
    }

    const updated = await Branch.findByIdAndUpdate(id, { $set: payload }, { new: true }).lean();

    // If contactPerson info is provided during update, update the existing ClientUser (do not create new users on update)
    try {
      if (payload && payload.contactPerson && payload.contactPerson.email) {
        const existing = await ClientUser.findOne({ companyId: payload.companyId, branchId: id }).catch(() => null);
        if (existing) {
          // update fields if provided
          const upd = {};
          if (payload.contactPerson.name) upd.name = payload.contactPerson.name;
          if (payload.contactPerson.email) upd.email = payload.contactPerson.email;
          if (payload.contactPerson.phone) upd.phone = payload.contactPerson.phone;
          if (Object.keys(upd).length) {
            await ClientUser.updateOne({ _id: existing._id }, { $set: upd }).catch(() => null);
          }
        } else {
          // try to find by email within company and associate to this branch (do not create new user)
          const byEmail = await ClientUser.findOne({ companyId: payload.companyId, email: payload.contactPerson.email }).catch(() => null);
          if (byEmail) {
            await ClientUser.updateOne({ _id: byEmail._id }, { $set: { branchId: id } }).catch(() => null);
          }
        }
      }
    } catch (e) {
      // swallow errors to avoid breaking branch update
    }

    return updated;
  }

  static async deleteBranch(id) {
    return Branch.findByIdAndDelete(id);
  }
}

module.exports = BranchService;
