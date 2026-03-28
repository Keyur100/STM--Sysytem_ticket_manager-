const router = require('express').Router();
const clientUserController = require('../controllers/clientUser.controller');
const authJwt = require('../../middlewares/authJwt');
const rbac = require('../../middlewares/rbac');
const tryCatch = require('../../middlewares/tryCatch');

// Global client users listing & CRUD
router.get(
  '/',
  authJwt,
  rbac('company_view'),
  tryCatch(clientUserController.listClientUsers)
);

router.get(
  '/:id',
  authJwt,
  rbac('company_view'),
  tryCatch(clientUserController.getClientUser)
);

router.put(
  '/:id',
  authJwt,
  rbac('company_update'),
  tryCatch(clientUserController.updateClientUser)
);

module.exports = router;
