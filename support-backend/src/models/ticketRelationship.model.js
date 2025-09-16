const { Schema, model } = require("mongoose");
const TicketRelationshipSchema = new Schema({
  parentTicketId: { type: Schema.Types.ObjectId, ref: "Ticket" },
  childTicketId: { type: Schema.Types.ObjectId, ref: "Ticket" }
});
const TicketRelationship = model("TicketRelationship", TicketRelationshipSchema);
module.exports = { TicketRelationship };
