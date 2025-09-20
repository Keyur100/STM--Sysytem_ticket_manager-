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

// list departments with search, sorting, pagination
async function listDepartments(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "asc",
    } = req.query;

    const skip = (page - 1) * Number(limit);

    // 1. Match stage
    const match = {};
    if (search?.trim()) {
      match.name = { $regex: search.trim(), $options: "i" };
    }

    // 2. Sort stage
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // 3. Aggregation pipeline
    const pipeline = [
      { $match: match },

      // Example: count users in each department
      // {
      //   $lookup: {
      //     from: "userprofiles",   // collection name in Mongo
      //     localField: "_id",      // Department._id
      //     foreignField: "departmentId",
      //     as: "users",
      //   },
      // },
      // { $addFields: { userCount: { $size: "$users" } } },

      { $sort: sort },
      {
        $facet: {
          items: [
            { $skip: skip },
            { $limit: Number(limit) },
          ],
          totalCount: [
            { $count: "count" },
          ],
        },
      },
    ];

    const result = await Department.aggregate(pipeline);

    const items = result[0]?.items || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    return sendSuccess(res, {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      sortBy,
      sortOrder,
    });
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
