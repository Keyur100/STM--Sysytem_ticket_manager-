const Ticket = require("../models/ticket.model").Ticket;
const { default: mongoose } = require("mongoose");
// const TicketAssignment = require("../models/ticketAssignment.model").TicketAssignment;
const { ASSIGNMENT_TYPE } = require("../constants/ticket.constant");
const { enqueueJob } = require("../libs/jobQueue");
const { TicketSummaryByAgent } = require("../models/summary.ticket_by_agent.model");
const { UserMembership } = require("../models/userMembership.model");
const { recordAssignment, updateAgentSummaries } = require("../services/ticket/assign_reassign.service");
const { rescheduleSLA } = require("../services/ticket/sla.service");
const { sendSuccess, sendError } = require("../utils/response");
const Reply = require("../models/reply.model").Reply;
// const TicketRelationship = require("../models/ticketRelationship.model").TicketRelationship;

async function createTicket(req, res) {
  try {
    const user = req.user;
    const { title, description, tags = [], department, assignedAgentId, priority } =
      req.validatedBody || req.body;

    const ticket = await Ticket.create({
      ticketNumber: `T-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      description,
      createdBy: user._id,
      updatedBy:user._id,
      department,
      tags,
      priority: priority || 'p3',
      statusKey: 'new',
    });

    // Manual assignment by SU
    if (user.type === 'SU'  && assignedAgentId) {
      const oldAgentId = null;

      ticket.assignedAgentId = assignedAgentId;
      ticket.statusKey = 'assigned';
      ticket.lastActivityAt = new Date();
      await ticket.save();

      await recordAssignment({
        ticketId: ticket._id,
        agentId: assignedAgentId,
        assignedBy: user._id,
        assignmentType: ASSIGNMENT_TYPE.MANUAL,
      });

      await updateAgentSummaries({
        oldAgentId,
        newAgentId: assignedAgentId,
        priority: ticket.priority,
      });

      await enqueueJob({ type: 'audit.log_event', payload: { action: 'create', entityType: 'Ticket', entityId: ticket._id, createdBy: user._id } });
      await enqueueJob({ type: 'audit.log_event', payload: { action: 'assign', entityType: 'Ticket', entityId: ticket._id, assignedTo: assignedAgentId, assignedBy: user._id } });

      // Schedule SLA
      await rescheduleSLA(ticket);

    } else {
      // Auto assignment for non-SU users
      await enqueueJob({ type: 'ticket.assignment', payload: { ticketId: ticket._id, departmentId: department } });
      await enqueueJob({ type: 'audit.log_event', payload: { action: 'create', entityType: 'Ticket', entityId: ticket._id, createdBy: user._id } });
    }

    // Schedule auto-close
    const autoCloseDate =  Date.now() + 5 * 24 * 60 * 60 * 1000;
    await enqueueJob({ type: 'ticket.autoclose', payload: { ticketId: ticket._id }, scheduledAt: autoCloseDate });

    return sendSuccess(res, ticket, 'Ticket created successfully');
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}

async function updateTicket(req, res) {
  try {
    const user = req.user;
    const { assignedAgentId, statusKey, priority, ...rest } = req.validatedBody || req.body;
    let status = statusKey
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return sendError(res, 404, 'Ticket not found');

    const before = ticket.toObject();

    if (ticket.statusKey === 'closed') {
      const editableMinutes = 60;
      if ((new Date() - ticket.lastActivityAt) / (1000 * 60) > editableMinutes) {
        return sendError(res, 403, 'Closed ticket cannot be edited');
      }
    }

    // Status change
    if (status) {
      if (['resolved', 'closed'].includes(before.statusKey) && ['new', "open",'assigned', 'in_progress'].includes(status)) {
        ticket.reopenCount += 1;
        await TicketSummaryByAgent.updateOne({ agentId: before.assignedAgentId }, { $inc: { reopenCount: 1 } });
      }
      ticket.statusKey = status;

      if (['resolved', 'pending_customer'].includes(status)) {
        const autoCloseDate =  Date.now() + 5 * 24 * 60 * 60 * 1000;
        await enqueueJob({ type: 'ticket.autoclose', payload: { ticketId: ticket._id }, scheduledAt: autoCloseDate });
      }
    }

    if (priority && user.type === 'SU') ticket.priority = priority;

    Object.assign(ticket, rest);
    ticket.lastActivityAt = new Date();
    ticket.updatedBy=user._id,

    await ticket.save();

    await enqueueJob({ type: 'audit.log_event', payload: { action: 'update', entityType: 'Ticket', entityId: ticket._id, before, after: ticket.toObject(), updatedBy: user._id } });

    // Assignment / reassignment
    // if (assignedAgentId && user.type === 'SU' && user.roles.permissions.includes('ticket.assign')) {
    if (assignedAgentId && user.type === 'SU') {
      
    const oldAgentId = ticket.assignedAgentId || null;
      if (oldAgentId && !ticket.previousAgents.includes(oldAgentId)) ticket.previousAgents.push(oldAgentId);

      ticket.assignedAgentId = assignedAgentId;
      ticket.statusKey = 'assigned';
      ticket.lastActivityAt = new Date();
      await ticket.save();

      await recordAssignment({
        ticketId: ticket._id,
        agentId: assignedAgentId,
        assignedBy: user._id,
        assignmentType: oldAgentId ? ASSIGNMENT_TYPE.REASSIGN.MANUAL : ASSIGNMENT_TYPE.MANUAL,
      });

      await updateAgentSummaries({ oldAgentId, newAgentId: assignedAgentId, priority: ticket.priority });

      await enqueueJob({
        type: 'audit.log_event',
        payload: { action: 'assign', entityType: 'Ticket', entityId: ticket._id, before: { assignedAgentId: oldAgentId }, after: { assignedAgentId }, assignedBy: user._id },
      });

      // Reschedule SLA
      await rescheduleSLA(ticket);
    }

    // Auto assignment for non-SU
    if (!assignedAgentId && user.type !== 'SU') {
      await enqueueJob({ type: 'ticket.assignment', payload: { ticketId: ticket._id, departmentId: ticket.department, priority: ticket.priority } });
    }

    return sendSuccess(res, ticket, 'Ticket updated successfully');
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}



async function replyTicket(req, res) {
  try {
    const user = req.user;
    const { ticketId, message, type = "NU" } = req.body;

    const reply = await Reply.create({ ticketId, senderId: user._id, message, type });
    await Ticket.findByIdAndUpdate(ticketId, { lastActivityAt: new Date() });

    return sendSuccess(res, reply, "Reply added");
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}




async function listTickets(req, res) {
  try {
    const user = req.user;
    const { page = 1, limit = 10, skip = 0, search = "" } = req.query;

    const match = {};

    // 🔍 Search filter
    if (search) {
      match.$or = [
        { title: { $regex: search, $options: "i" } },
        { priority: { $regex: search, $options: "i" } },

        // { description: { $regex: search, $options: "i" } },
      ];
    }

    if (user.type === "NU") {
      match.createdBy = user._id;
    } else if (user.type === "SU") {
      const memberships = await UserMembership.find({ userId: user._id })
        .populate("roleId departmentId")
        .lean();

      const allowedDeptIds = [
        ...new Set(
          memberships
            .filter((m) =>
              m.roleId?.permissions?.some(
                (p) => ["ticket.read", "ticket.update"].includes(p) || p === "*"
              )
            )
            .map((m) => m.departmentId?._id?.toString())
            .filter(Boolean)
        ),
      ];

      if (allowedDeptIds.length) {
        match.department = {
          $in: allowedDeptIds.map((id) => new mongoose.Types.ObjectId(id)),
        };
      } else {
        match.department = null;
      }
    }
    // ⚡ SuperAdmin bypass: no restriction

    const skipDocs = parseInt(skip) || (page - 1) * parseInt(limit);

    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 } },

      // Department
      {
        $lookup: {
          from: "departments",
          localField: "department",
          foreignField: "_id",
          as: "department",
        },
      },
      { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },

      // Tags
      {
        $lookup: {
          from: "tags",
          localField: "tags",
          foreignField: "_id",
          as: "tags",
        },
      },

      // Assigned Agent
    {
  $lookup: {
    from: "userprofiles",
    localField: "assignedAgentId",
    foreignField: "userId",
    as: "assignedAgentId",
  },
},
{ $unwind: { path: "$assignedAgent", preserveNullAndEmptyArrays: true } },

      // Creator
    {
  $lookup: {
    from: "userprofiles",
    localField: "createdBy",
    foreignField: "userId",
    as: "creator",
  },
},
{ $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
      // Pagination
      { $skip: skipDocs },
      { $limit: parseInt(limit) },

      //  Projection with missing fields
      {
        $project: {
          title: 1,
          description: 1,
          statusKey: 1,          // include status
          priority: 1,
          createdAt: 1,
          updatedAt: 1,
          "department._id": 1,
          "department.name": 1,
          "tags._id": 1,
          "tags.name": 1,
          "assignedAgentId._id": 1,
          "assignedAgentId.name": 1,   // 🔥 include agent name
          "creator._id": 1,
          "creator.name": 1,
        },
      },
    ];

    const [result] = await Ticket.aggregate([
      { $match: match },
      {
        $facet: {
          items: pipeline,
          total: [{ $count: "count" }],
        },
      },
    ]);

    const total = result.total[0]?.count || 0;

    return sendSuccess(
      res,
      { items: result.items, total, page: Number(page), limit: Number(limit) },
      "Tickets fetched"
    );
  } catch (err) {
    console.error("listTickets error:", err);
    return res.status(500).json({ error: err.message });
  }
}




 const getTicketDetail  = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("department", "name")
      .populate("tags", "name")
      .populate("assignedAgentId", "name email");

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    return sendSuccess(res,ticket, "Ticket fetched");

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching ticket" });
  }
}


// GET /api/agents/:agentId/summary

async function getAgentSummary(req, res) {
  try {
    const { agentId } = req.params;
    const { startDate, endDate, interval = "day" } = req.query;

    if (!agentId) return sendError(res, 400, "AgentId is required");

    // Parse date filters
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // 1. Summary from TicketSummaryByAgent
    const summary = await TicketSummaryByAgent.findOne({ agentId }).lean();

    // 2. Historical tickets where agent appeared previously
    const ticketsWithHistory = await Ticket.find({
      previousAgents: agentId
    })
      .select("ticketNumber title previousAgents priority statusKey createdAt")
      .lean();

    const previousAgentCount = ticketsWithHistory.length;

    // 3. Trend graph
    let dateFormat = "%Y-%m-%d"; // default daily
    if (interval === "week") dateFormat = "%Y-%U"; // week number
    if (interval === "month") dateFormat = "%Y-%m";

    const trends = await Ticket.aggregate([
      {
        $match: {
          $and: [
            {
              $or: [
                { assignedAgentId: new mongoose.Types.ObjectId(agentId) },
                { previousAgents: new mongoose.Types.ObjectId(agentId) }
              ]
            },
            dateFilter
          ]
        }
      },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: dateFormat, date: "$createdAt" } },
            status: "$statusKey"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.period",
          counts: {
            $push: { status: "$_id.status", count: "$count" }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format trends
    const formattedTrends = trends.map(t => {
      const base = { created: 0, closed: 0, reopened: 0 };
      t.counts.forEach(c => {
        if (["new", "assigned"].includes(c.status)) base.created += c.count;
        if (c.status === "closed") base.closed += c.count;
        if (c.status === "reopened") base.reopened += c.count;
      });
      return { period: t._id, ...base };
    });

    return sendSuccess(res, {
      agentId,
      summary: summary || {
        openCount: 0,
        closedCount: 0,
        reopenCount: 0,
        prioritySummary: { p1: 0, p2: 0, p3: 0 },
        lastAssignedAt: null
      },
      history: {
        previousAgentCount,
        tickets: ticketsWithHistory
      },
      trends: formattedTrends
    });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

// GET /api/agents/summary?page=1&limit=20
// With this:

// Daily → detailed trend graph

// Weekly → performance overview

// Monthly → management reporting
async function listAgentSummaries(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;

    const summaries = await TicketSummaryByAgent.find({})
      .sort({ lastAssignedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await TicketSummaryByAgent.countDocuments();

    return sendSuccess(res, {
      data: summaries,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}
// GET /api/tickets/:ticketId/history
async function getTicketHistory(req, res) {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId)
      .populate("assignedAgentId", "name email")
      .populate("previousAgents", "name email")
      .lean();

    if (!ticket) return sendError(res, 404, "Ticket not found");

    return sendSuccess(res, {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      currentAgent: ticket.assignedAgentId,
      previousAgents: ticket.previousAgents,
      reopenCount: ticket.reopenCount,
      priority: ticket.priority,
      status: ticket.statusKey,
      createdAt: ticket.createdAt,
      lastActivityAt: ticket.lastActivityAt,
    });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}



module.exports = { createTicket, updateTicket, replyTicket, listTickets,getTicketDetail,getAgentSummary,listAgentSummaries,getTicketHistory };
