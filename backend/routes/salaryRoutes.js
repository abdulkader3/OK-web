const express = require('express')
const router = express.Router()
const salaryController = require('../controllers/salaryController')

// Note: Authentication middleware should populate req.user before these routes.
// 6. Get My Salary (staff viewing their own payments)
router.get('/my-salary', salaryController.getMySalary)

// 6. Get Single Salary Payment
router.get('/:id', salaryController.getSalary)

// 7. Update Salary Payment
router.patch('/:id', salaryController.updateSalary)

// 8. Delete Salary Payment (hard delete)
router.delete('/:id', salaryController.deleteSalary)

// 9. Get Salary Summary (owner only)
router.get('/summary', salaryController.getSalarySummary)

module.exports = router
