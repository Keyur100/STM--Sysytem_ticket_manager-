const router = require('express').Router();
const branchController = require('../controllers/branch.controller');
const authJwt = require('../../middlewares/authJwt');
const rbac = require('../../middlewares/rbac');
const tryCatch = require('../../middlewares/tryCatch');

// Create branch
router.post('/', authJwt, rbac('saas.branch_add'), tryCatch(branchController.createBranch));

// List branches (by companyId query)
router.get('/', authJwt, rbac('saas.branch_list'), tryCatch(branchController.listBranches));

router.get('/:id', authJwt, rbac('saas.branch_show'), tryCatch(branchController.getBranch));
router.put('/:id', authJwt, rbac('saas.branch_edit'), tryCatch(branchController.updateBranch));
router.delete('/:id', authJwt, rbac('saas.branch_delete'), tryCatch(branchController.deleteBranch));

module.exports = router;
