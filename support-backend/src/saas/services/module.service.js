// src/saas/services/module.service.js
const Module = require("../models/module.model");
const { Job } = require("../models/job.model");
const { JOB_TYPES } = require("../constants/job.constant");

class ModuleService {
  /**
   * 🧩 Create a new module
   */
  static async createModule(data, userId) {
    const { group, moduleKey, displayName, actions } = data;

    // Check for duplicate module
    const exists = await Module.findOne({ moduleKey });
    if (exists) throw new Error("Module already exists");

    // Create module
    const module = await Module.create({
      group,
      moduleKey,
      displayName,
      actions,
      createdBy: userId,
      updatedBy: userId,
    });

    // 🧾 Audit log
    await ModuleService.enqueueAudit("module", module._id, "CREATE", null, module, userId);

    return module;
  }

  /**
   * 📋 Get all modules with filters + pagination
   */
  static async getAllModules(query) {
    const { page = 1, limit = 20, search, isActive } = query;

    const filter = { isDeleted: false };

    if (search) {
      filter.$or = [
        { group: new RegExp(search, "i") },
        { moduleKey: new RegExp(search, "i") },
        { displayName: new RegExp(search, "i") },
      ];
    }

    if (typeof isActive !== "undefined") filter.isActive = isActive;

    const total = await Module.countDocuments(filter);
    const modules = await Module.find(filter)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    return { total, page: +page, limit: +limit, modules };
  }

  /**
   * 🔍 Get module by ID
   */
  static async getModuleById(id) {
    const module = await Module.findById(id);
    if (!module) throw new Error("Module not found");
    return module;
  }

  /**
   * ✏️ Update module by ID
   */
  static async updateModule(id, data, userId) {
    const oldModule = await Module.findById(id);
    if (!oldModule) throw new Error("Module not found");

    const updatedModule = await Module.findByIdAndUpdate(
      id,
      { ...data, updatedBy: userId },
      { new: true }
    );

    // 🧾 Audit log
    await ModuleService.enqueueAudit("module", id, "UPDATE", oldModule, updatedModule, userId);

    return updatedModule;
  }

  /**
   * ❌ Soft delete module by ID
   */
  static async deleteModule(id, userId) {
    const oldModule = await Module.findById(id);
    if (!oldModule) throw new Error("Module not found");

    oldModule.isDeleted = true;
    oldModule.isActive = false;
    await oldModule.save();

    // 🧾 Audit log
    await ModuleService.enqueueAudit("module", id, "DELETE", oldModule, null, userId);

    return oldModule;
  }

  /**
   * 🧾 Enqueue audit log
   */
  static async enqueueAudit(entityType, entityId, action, before, after, userId) {
    await ModuleService.enqueueJob(JOB_TYPES.AUDIT_LOG, {
      entityType,
      entityId,
      action,
      before,
      after,
      createdBy: userId,
    });
  }

  /**
   * ⚙️ Generic job enqueue helper
   */
  static async enqueueJob(type, payload) {
    const job = new Job({
      type,
      payload,
      status: "PENDING",
      retries: 0,
      maxRetries: 5,
      scheduledAt: Date.now(),
    });
    await job.save();
    return job;
  }
}

module.exports = ModuleService;
