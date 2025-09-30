/**
 * Admin Routes
 * Admin-only endpoints for user management
 */

const express = require('express');
const router = express.Router();

// Import middleware
const { verifyToken, requireRole } = require('../middleware/auth');

// Import controllers
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getUserStatistics
} = require('../controllers/adminController');

// Apply authentication middleware to all admin routes
router.use(verifyToken);
router.use(requireRole(['admin'])); // Only admins can access these routes

// =============================================================================
// USER MANAGEMENT ROUTES
// =============================================================================

/**
 * Create new user (Admin only)
 * POST /api/v1/admin/users/create
 * 
 * Body:
 * {
 *   "email": "user@example.com",
 *   "profile_picture_url": "https://example.com/photo.jpg",
 *   "role_id": 3
 * }
 */
router.post('/users/create', createUser);

/**
 * Get all users with pagination and filters
 * GET /api/v1/admin/users
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - role_id: Filter by role (1=admin, 2=manager, 3=user)
 * - is_active: Filter by status (true/false)
 * - search: Search in email or employee_id
 */
router.get('/users', getAllUsers);

/**
 * Get user by ID (Admin view with all details)
 * GET /api/v1/admin/users/:id
 */
router.get('/users/:id', getUserById);

/**
 * Update user status (activate/deactivate)
 * PUT /api/v1/admin/users/:id/status
 * 
 * Body:
 * {
 *   "is_active": true
 * }
 */
router.put('/users/:id/status', updateUserStatus);

/**
 * Soft delete user
 * DELETE /api/v1/admin/users/:id
 */
router.delete('/users/:id', deleteUser);

// =============================================================================
// STATISTICS ROUTES
// =============================================================================

/**
 * Get user statistics
 * GET /api/v1/admin/stats
 */
router.get('/stats', getUserStatistics);

// =============================================================================
// AUDIT LOG ROUTES (Optional - add later if needed)
// =============================================================================

/**
 * Get audit logs for a specific user
 * GET /api/v1/admin/users/:id/audit-logs
 */
// router.get('/users/:id/audit-logs', getUserAuditLogs);

/**
 * Get all audit logs (Admin only)
 * GET /api/v1/admin/audit-logs
 */
// router.get('/audit-logs', getAllAuditLogs);

module.exports = router;