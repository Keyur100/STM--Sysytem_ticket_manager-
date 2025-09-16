// src/controllers/reply.controller.js
const { Reply } = require("../models/reply.model");
const { Ticket } = require("../models/ticket.model");
const { UserMembership } = require("../models/userMembership.model");
const { sendSuccess, sendError } = require("../utils/response");

// Create a reply
async function createReply(req, res) {
  try {
    const payload = req.validatedBody || req.body;
    const user = req.user; // should be set by auth middleware
    const ticketId = payload.ticketId;

    if (!ticketId) throw new Error("ticketId is required");
    if (!payload.message) throw new Error("Reply message is required");

    // Identify user type
    const isNormalUser = user.type === "NU";
    const isAgentOrSU = !isNormalUser; // SU types

    // 1. Create reply
    const reply = await Reply.create({
      ticketId,
      senderId: user._id,
      message: payload.message,
      type: "public",//isNormalUser ? "public" : payload.type || "internal",TODO
      meta: payload.meta || {},
    });

    // 2. Update ticket counts & status
    const update = {
      $inc: {
        replyCount: 1,
        agentReplyCount: isAgentOrSU ? 1 : 0,
        customerReplyCount: isNormalUser ? 1 : 0,
      },
      $set: {
        statusKey: isNormalUser ? "pending_agent" : "pending_customer",
        updatedBy: user._id,
        lastActivityAt: new Date(),
      },
    };

    await Ticket.findByIdAndUpdate(ticketId, update);

    return sendSuccess(res, reply, "Reply created and ticket updated successfully");
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}


async function getReplies(req, res) {
  try {
    const { id } = req.params;
    const user = req.user; // populated from auth middleware

    if (!id) throw new Error("ticketId is required");

    //  Ensure ticket exists
    const ticket = await Ticket.findById(id)
      .populate("createdBy", "email type")
      .populate("assignedAgentId", "email type");

    if (!ticket) throw new Error("Ticket not found");

    let filter = { ticketId:id };

    //  Normal user (NU) – can only view their own ticket + only public replies
    if (user.type === "NU") {
      if (ticket.createdBy._id.toString() !== user._id.toString()) {
        return sendError(res, 403, "You are not allowed to see this ticket's replies");
      }
      filter.type = "public";
    } else {
      //  Agents/Managers/SuperAdmin
      // Optional: enforce department-based access
      if (user.type === "SU") {
        // Check if agent belongs to same department as ticket
        const membership = await UserMembership.findOne({ userId: user._id,departmentId: ticket.department, });
        if (
          !membership 
        ) {
          return sendError(res, 403, "Not allowed to see replies outside your department");
        }
      }

      // SA (superadmin) sees everything, SU (subuser/agent) limited to department logic
      // so we don’t filter `type`
    }

    //  Fetch replies
    const replies = await Reply.find(filter)
      .sort({ createdAt: 1 })
      .populate("senderId", "name type");

    return sendSuccess(res, replies, "Replies fetched successfully");
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}



module.exports = { createReply,getReplies };
