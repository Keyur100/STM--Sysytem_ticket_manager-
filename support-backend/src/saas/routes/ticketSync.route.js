const router = require('express').Router();
const authJwt = require('../../middlewares/authJwt');
const rbac = require('../../middlewares/rbac');
const tryCatch = require('../../middlewares/tryCatch');
const ticketSyncController = require('../controllers/ticketSync.controller');

// List tickets proxied from Laravel
router.get('/', authJwt, rbac('ticket.read'), tryCatch(ticketSyncController.fetchTickets));

// Update ticket status and sync back to Laravel
router.post('/:id/status', authJwt, rbac('ticket.update'), tryCatch(ticketSyncController.updateTicketStatus));

module.exports = router;
