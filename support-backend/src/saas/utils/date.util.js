// date.util.js
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(startDate, endDate) {
  const start = new Date(startDate).setHours(0,0,0,0);
  const end = new Date(endDate).setHours(0,0,0,0);
  const diffMs = Math.max(0, end - start);
  return Math.ceil(diffMs / (24 * 3600 * 1000));
}

/**
 * Given a subscription cycle start & end, returns number of days in that cycle.
 * Accepts Date or ISO strings.
 */
function daysInCycle(startDate, endDate) {
  return daysBetween(startDate, endDate) || 1;
}

/**
 * Proration accounting helpers:
 * - returns integer paisa amounts
 */
function prorateCharge(planCostPaisa, cycleDays, daysUsed) {
  // planCostPaisa and result are integers (paisas).
  if (cycleDays <= 0) return 0;
  // use precise math then round
  const perDay = planCostPaisa / cycleDays;
  return Math.round(perDay * daysUsed);
}

module.exports = { addDays, daysBetween, daysInCycle, prorateCharge };
