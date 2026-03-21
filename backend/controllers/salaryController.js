const mongoose = require('mongoose')
const SalaryPayment = require('../models/SalaryPayment')

// Simple in-memory cache for staff salary history (regenerative mode)
// TTL: 5 minutes
const MY_SALARY_CACHE_TTL_MS = 5 * 60 * 1000
const mySalaryCache = new Map()

function cacheKey(staffId, year, page, limit) {
  return `${staffId}|${year ?? ''}|${page}|${limit}`
}

function setMySalaryCache(key, value) {
  mySalaryCache.set(key, { value, expiry: Date.now() + MY_SALARY_CACHE_TTL_MS })
}

function getMySalaryCache(key) {
  const entry = mySalaryCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    mySalaryCache.delete(key)
    return null
  }
  return entry.value
}

function clearMySalaryCacheForStaff(staffId) {
  const prefix = `${staffId}|`
  for (const k of mySalaryCache.keys()) {
    if (k.startsWith(prefix)) mySalaryCache.delete(k)
  }
}

// Helper: extract ownerId string from authenticated user payload
function getReqOwnerId(req) {
  if (!req.user) return null
  // common shapes: { ownerId: ObjectId|String, _id: …, role: 'owner' }
  const id = req.user.ownerId || req.user._id
  if (!id) return null
  try {
    return id.toString()
  } catch (_) {
    return String(id)
  }
}

// Helper: authorization check
function isAuthorized(payment, req) {
  if (!req.user) return false
  const ownerId = payment.ownerId && payment.ownerId._id ? payment.ownerId._id.toString() : (payment.ownerId ? payment.ownerId.toString() : null)
  const reqOwnerId = getReqOwnerId(req)
  const isOwner = req.user && req.user.role === 'owner'
  return isOwner || (ownerId && reqOwnerId && ownerId === reqOwnerId)
}

// 6. Get Single Salary Payment
async function getSalary(req, res) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid salary id' })
    }
    const payment = await SalaryPayment.findById(id).populate('staffId ownerId createdBy')
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Salary payment not found' })
    }
    // Authorization: owner || owner of salary || staff viewing their own payment
    const user = req.user
    const isOwner = user && user.role === 'owner'
    const isOwnerAssociated = payment.ownerId && user && user._id && payment.ownerId._id && payment.ownerId._id.toString() === user._id.toString()
    const isStaffViewingOwn = payment.staffId && user && user._id && payment.staffId._id && payment.staffId._id.toString() === user._id.toString()
    if (!(isOwner || isOwnerAssociated || isStaffViewingOwn)) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }
    res.json({ success: true, data: { payment } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// 6.5. Get My Salary (staff viewing their own payments)
// Route: GET /api/salary/my-salary
async function getMySalary(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }
    const staffId = mongoose.Types.ObjectId(req.user._id)
    const match = { staffId }
    // Optional owner scoping to ensure per-owner view restricted to the same owner as the requester
    if (req.user.ownerId) {
      match.ownerId = mongoose.Types.ObjectId(req.user.ownerId)
    }
    // Optional year filter (staff can filter by year)
    if (req.query.year) {
      const y = parseInt(req.query.year)
      if (!Number.isNaN(y)) {
        match.year = y
      }
    }
    // Pagination
    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const limit = Math.max(parseInt(req.query.limit) || 50, 1)
    const skip = (page - 1) * limit

    // Caching
    const key = `${staffId.toString()}|${req.query.year ?? ''}|${page}|${limit}`
    const cached = getMySalaryCache(key)
    if (cached) {
      return res.json({ success: true, data: cached })
    }

    const total = await SalaryPayment.countDocuments(match)
    const payments = await SalaryPayment.find(match)
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(limit)
      .populate('staffId ownerId createdBy')

    const agg = await SalaryPayment.aggregate([
      { $match: match },
      { $group: { _id: null, totalPaid: { $sum: '$amount' } } }
    ])
    const totalPaid = agg[0]?.totalPaid ?? 0

    // Attach staff metadata for frontend typing compatibility
    const staffMeta = {
      _id: staffId.toString(),
      name: req.user?.name || '',
      email: req.user?.email || '',
      monthlySalary: req.user?.monthlySalary
    }
    const response = { staff: staffMeta, payments, totalPaid: total, page, limit, total }
    setMySalaryCache(key, response)
    res.json({ success: true, data: response })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// 7. Update Salary Payment
async function updateSalary(req, res) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid salary id' })
    }
    const allowed = ['amount', 'paymentMethod', 'note']
    const updates = {}
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) updates[key] = req.body[key]
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided for update' })
    }
    if (updates.amount !== undefined && (typeof updates.amount !== 'number' || Number.isNaN(updates.amount))) {
      return res.status(400).json({ success: false, message: 'Invalid amount' })
    }
    if (updates.paymentMethod !== undefined && !['bank', 'cash', 'online'].includes(updates.paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid paymentMethod' })
    }
    const payment = await SalaryPayment.findById(id)
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Salary payment not found' })
    }
    // Only the creator of the payment can update
    const user = req.user
    const isCreator = payment.createdBy && user && payment.createdBy._id && user._id && payment.createdBy._id.toString() === user._id.toString()
    if (!isCreator) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }
    Object.assign(payment, updates)
    await payment.save()
    // Invalidate any cached staff salary history for this staff
    const staffIdVal = payment.staffId && payment.staffId._id ? payment.staffId._id.toString() : payment.staffId?.toString?.()
    if (staffIdVal) clearMySalaryCacheForStaff(staffIdVal)
    res.json({ success: true, data: { payment }, message: 'Salary payment updated successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// 8. Delete Salary Payment (hard delete)
async function deleteSalary(req, res) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid salary id' })
    }
    const payment = await SalaryPayment.findById(id)
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Salary payment not found' })
    }
    // Only the creator of the payment can delete
    const user = req.user
    const isCreator = payment.createdBy && user && payment.createdBy._id && user._id && payment.createdBy._id.toString() === user._id.toString()
    if (!isCreator) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }
    await SalaryPayment.findByIdAndDelete(id)
    // Invalidate any cached staff salary history for this staff
    const staffIdVal = payment.staffId && payment.staffId._id ? payment.staffId._id.toString() : payment.staffId?.toString?.()
    if (staffIdVal) clearMySalaryCacheForStaff(staffIdVal)
    res.json({ success: true, message: 'Salary payment deleted successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// 9. Get Salary Summary (owner only)
async function getSalarySummary(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }
    const ownerId = req.user.ownerId
    if (!ownerId) {
      return res.status(403).json({ success: false, message: 'Owner access required' })
    }
    const ownerObjectId = mongoose.Types.ObjectId(ownerId.toString())

    // Total and counts
    const totalAgg = await SalaryPayment.aggregate([
      { $match: { ownerId: ownerObjectId } },
      { $group: { _id: null, totalPaid: { $sum: '$amount' }, totalPayments: { $sum: 1 } } },
      { $project: { _id: 0, totalPaid: 1, totalPayments: 1 } }
    ])
    const totalPaid = totalAgg[0]?.totalPaid ?? 0
    const totalPayments = totalAgg[0]?.totalPayments ?? 0

    const staffDistinct = await SalaryPayment.distinct('staffId', { ownerId: ownerObjectId })
    const staffCount = Array.isArray(staffDistinct) ? staffDistinct.length : 0

    // byYear
    const byYear = await SalaryPayment.aggregate([
      { $match: { ownerId: ownerObjectId } },
      { $group: { _id: '$year', totalPaid: { $sum: '$amount' }, paymentCount: { $sum: 1 } } },
      { $project: { _id: 0, year: '$_id', totalPaid: 1, paymentCount: 1 } },
      { $sort: { year: 1 } }
    ])

    // byMonth
    const byMonth = await SalaryPayment.aggregate([
      { $match: { ownerId: ownerObjectId } },
      { $group: { _id: { year: '$year', month: '$month' }, totalPaid: { $sum: '$amount' }, paymentCount: { $sum: 1 } } },
      { $project: { _id: 0, year: '$_id.year', month: '$_id.month', totalPaid: 1, paymentCount: 1 } },
      { $sort: { year: 1, month: 1 } }
    ])

    res.json({
      success: true,
      data: {
        totalPaid,
        totalPayments,
        staffCount,
        byYear,
        byMonth
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

module.exports = {
  getSalary,
  updateSalary,
  deleteSalary,
  getSalarySummary,
  getMySalary
}
