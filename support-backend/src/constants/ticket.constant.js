const ASSIGNMENT_TYPE = {
  AUTO: "auto_first_time",                  // First-time automatic assignment by system
  MANUAL: "manual_first_time",              // FIrst time Manual assignment by SU or Admin
         
  REASSIGN: {  // Reassignment of ticket from one agent to another
    AUTO:"auto_reassign",
    MANUAL:"manual_reassign",
    ESCALATION: "escalation_reassign",      // ReAssignment triggered by SLA escalation
}
}
module.exports = {
    ASSIGNMENT_TYPE
}