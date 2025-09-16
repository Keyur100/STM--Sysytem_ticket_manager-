const Role = require("../models/role.model").Role;
const UserMembership = require("../models/userMembership.model").UserMembership;
const { sendSuccess, sendError } = require("../utils/response");

// create role (check existence)
async function createRole(req, res) {
  try {
    const { name, permissions = [], isSystem = false } = req.validatedBody || req.body;
    const existing = await Role.findOne({ name }).lean();
    if (existing) return sendError(res, 400, "Role already exists");
    const role = await Role.create({ name, permissions, isSystem });
    return sendSuccess(res, role, "Role created");
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

// list roles
async function listRoles(req, res) {
  try {
    const roles = await Role.find({}).lean();
    return sendSuccess(res, roles);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

// update role - do not allow modifying system roles
async function updateRole(req, res) {
  try {
    const id = req.params.id;
    const role = await Role.findById(id);
    if (!role) return sendError(res, 404, "Role not found");
    if (role.isSystem) return sendError(res, 403, "System role cannot be modified");
    const { name, permissions } = req.validatedBody || req.body;
    if (name) {
      const exist = await Role.findOne({ name, _id: { $ne: id } }).lean();
      if (exist) return sendError(res, 400, "Another role with same name exists");
      role.name = name;
    }
    if (permissions) role.permissions = permissions;
    await role.save();
    return sendSuccess(res, role, "Role updated");
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

// delete role - protect system roles and cascade delete userMemberships referencing this role
async function deleteRole(req, res) {
  try {
    const id = req.params.id;
    const role = await Role.findById(id);
    if (!role) return sendError(res, 404, "Role not found");
    if (role.isSystem) return sendError(res, 403, "System role cannot be deleted");
    // remove memberships
    await UserMembership.deleteMany({ roleId: role._id });
    await Role.deleteOne({ _id: role._id });
    return sendSuccess(res, null, "Role deleted and references cleaned");
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

module.exports = { createRole, listRoles, updateRole, deleteRole };
