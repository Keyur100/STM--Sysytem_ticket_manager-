const Tag = require("../models/tag.model").Tag;
const Ticket = require("../models/ticket.model").Ticket;
const { sendSuccess, sendError } = require("../utils/response");

async function createTag(req, res) {
  try {
    const { name, slug, isSystem = false } = req.validatedBody || req.body;
    const existing = await Tag.findOne({ name }).lean();
    if (existing) return sendError(res, 400, "Tag already exists");
    const t = await Tag.create({ name, slug: slug || name, isSystem });
    return sendSuccess(res, t, "Tag created");
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

async function listTags(req, res) {
  try {
    const { page = 1, limit = 10, search, sortBy = "name", sortOrder = "asc" } = req.query;
    const skip = (page - 1) * limit;

    // 1️⃣ Match stage for optional search
    const matchStage = {};
    if (search?.trim()) {
      matchStage.name = { $regex: search.trim(), $options: "i" };
    }

    // 2️⃣ Sort stage
    const sortStage = {};
    sortStage[sortBy] = sortOrder === "desc" ? -1 : 1;

    // 3️⃣ Aggregation pipeline with facet
    const aggPipeline = [
      { $match: matchStage },
      {
        $facet: {
          paginatedResults: [
            { $sort: sortStage },
            { $skip: skip },
            { $limit: Number(limit) },
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ];

    const result = await Tag.aggregate(aggPipeline);

    const tags = result[0]?.paginatedResults || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    return sendSuccess(res, {
      items: tags,
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


async function updateTag(req, res) {
  try {
    const id = req.params.id;
    const tag = await Tag.findById(id);
    if (!tag) return sendError(res, 404, "Tag not found");
    if (tag.isSystem) return sendError(res, 403, "System tag cannot be modified");
    const { name, slug } = req.validatedBody || req.body;
    if (name) {
      const exist = await Tag.findOne({ name, _id: { $ne: id } }).lean();
      if (exist) return sendError(res, 400, "Another tag with same name exists");
      tag.name = name;
    }
    if (slug) tag.slug = slug;
    await tag.save();
    return sendSuccess(res, tag, "Tag updated");
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

async function deleteTag(req, res) {
  try {
    const id = req.params.id;
    const tag = await Tag.findById(id);
    if (!tag) return sendError(res, 404, "Tag not found");
    if (tag.isSystem) return sendError(res, 403, "System tag cannot be deleted");
    // Remove tag references from tickets (pull)
    await Ticket.updateMany({}, { $pull: { tags: tag._id } });
    await Tag.deleteOne({ _id: tag._id });
    return sendSuccess(res, null, "Tag deleted and ticket references cleaned");
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

module.exports = { createTag, listTags, updateTag, deleteTag };
