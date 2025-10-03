// Calculate prorated charges or credits in paisa
function calculateProration({ totalPlanCost, daysInCycle, daysUsed }) {
  if (!totalPlanCost || !daysInCycle || !daysUsed) return 0;
  return Math.round((totalPlanCost / daysInCycle) * daysUsed);
}

module.exports = { calculateProration };
