const Department = require("../models/department.model").Department;
const UserMembership = require("../models/userMembership.model").UserMembership;
const { sendSuccess, sendError } = require("../utils/response");

async function createDepartment(req, res) {
  try {
    const { name, isSystem = false } = req.validatedBody || req.body;
    const existing = await Department.findOne({ name }).lean();
    if (existing) return sendError(res, 400, "Department already exists");
    const d = await Department.create({ name, isSystem });
    return sendSuccess(res, d, "Department created");
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

async function listDepartments(req, res) {
  try {
    const depts = await Department.find({}).lean();
    return sendSuccess(res, depts);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

async function updateDepartment(req, res) {
  try {
    const id = req.params.id;
    const dept = await Department.findById(id);
    if (!dept) return sendError(res, 404, "Department not found");
    if (dept.isSystem) return sendError(res, 403, "System department cannot be modified");
    const { name } = req.validatedBody || req.body;
    if (name) {
      const exist = await Department.findOne({ name, _id: { $ne: id } }).lean();
      if (exist) return sendError(res, 400, "Another department with same name exists");
      dept.name = name;
    }
    await dept.save();
    return sendSuccess(res, dept, "Department updated");
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

async function deleteDepartment(req, res) {
  try {
    const id = req.params.id;
    const dept = await Department.findById(id);
    if (!dept) return sendError(res, 404, "Department not found");
    if (dept.isSystem) return sendError(res, 403, "System department cannot be deleted");
    // remove membership references
    await UserMembership.updateMany({ departmentId: dept._id }, { $unset: { departmentId: "" } });
    await Department.deleteOne({ _id: dept._id });
    return sendSuccess(res, null, "Department deleted and references cleaned");
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

module.exports = { createDepartment, listDepartments, updateDepartment, deleteDepartment };
