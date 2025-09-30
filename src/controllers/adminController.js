/**
 * Admin Controller
 * Admin user management functionality
 */

const { query } = require('../config/database');
const { adminQueries, auditQueries } = require('../database/queries');
const { logAdminAction } = require('../services/auditService');

/**
 * Create new user (Admin only)
 * POST /api/v1/admin/users/create
 */

const createUser = async (req, res) => {
  try {
    const { email, profile_picture_url, role_id = 3 } = req.body;
    console.log("Request Body:", req.body); // Debugging line   
    const adminId = req.user.id;

    // Validate required fields
    if (!email || !profile_picture_url) {
      return res.status(400).json({
        success: false,
        message: 'Email and profile picture URL are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate role_id
    if (![1, 2, 3].includes(role_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role ID. Must be 1 (admin), 2 (manager), or 3 (user)'
      });
    }

    const emailLower = email.toLowerCase();

    // Check if user already exists
    const existingUser = await query(
      adminQueries.checkEmailExists,
      [emailLower],
      'Check if user exists'
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      if (!user.is_deleted) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists',
          code: 'USER_EXISTS'
        });
      } else {
        return res.status(409).json({
          success: false,
          message: 'User with this email was previously deleted. Please restore instead.',
          code: 'USER_DELETED_EXISTS'
        });
      }
    }

    // Create new user
    const newUserResult = await query(
      adminQueries.createUserByAdmin,
      [emailLower, profile_picture_url, role_id, adminId],
      'Create user by admin'
    );

    const newUser = newUserResult.rows[0];

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'USER_CREATED',
      resourceType: 'user',
      resourceId: newUser.id,
      newValues: {
        email: newUser.email,
        employee_id: newUser.employee_id,
        role_id: newUser.role_id,
        profile_picture_url: newUser.profile_picture_url
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    console.log(`👤 Admin ${req.user.email} created user: ${newUser.email} (${newUser.employee_id})`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          employee_id: newUser.employee_id,
          profile_picture_url: newUser.profile_picture_url,
          role_id: newUser.role_id,
          email_verified: newUser.email_verified,
          is_active: newUser.is_active,
          created_by: newUser.created_by,
          created_at: newUser.created_at
        },
        created_by: req.user.email
      }
    });

  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all users with pagination and filters
 * GET /api/v1/admin/users
 */
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role_id,
      is_active,
      search
    } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters'
      });
    }

    const offset = (pageNum - 1) * limitNum;

    // Parse filters
    const roleFilter = role_id ? parseInt(role_id) : null;
    const activeFilter = is_active !== undefined ? is_active === 'true' : null;
    const searchFilter = search ? search.trim() : null;

    // Get total count
    const countResult = await query(
      adminQueries.countUsers,
      [roleFilter, activeFilter, searchFilter],
      'Count users'
    );

    const totalUsers = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalUsers / limitNum);

    // Get users
    const usersResult = await query(
      adminQueries.getAllUsers,
      [roleFilter, activeFilter, searchFilter, limitNum, offset],
      'Get all users'
    );

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: usersResult.rows,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalUsers,
          limit: limitNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        },
        filters: {
          role_id: roleFilter,
          is_active: activeFilter,
          search: searchFilter
        }
      }
    });

  } catch (error) {
    console.error('❌ Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user by ID (Admin view)
 * GET /api/v1/admin/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const userResult = await query(
      adminQueries.getUserByIdAdmin,
      [id],
      'Get user by ID (admin)'
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          employee_id: user.employee_id,
          profile_picture_url: user.profile_picture_url,
          role_id: user.role_id,
          role_name: user.role_name,
          role_description: user.role_description,
          email_verified: user.email_verified,
          is_active: user.is_active,
          last_login: user.last_login,
          created_at: user.created_at,
          updated_at: user.updated_at,
          created_by: user.created_by,
          created_by_email: user.created_by_email,
          deleted_at: user.deleted_at,
          deleted_by_email: user.deleted_by_email
        }
      }
    });

  } catch (error) {
    console.error('❌ Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user status (activate/deactivate)
 * PUT /api/v1/admin/users/:id/status
 */
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
const adminId = req.user.userId || req.user.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Validate is_active
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_active must be a boolean value'
      });
    }

    // Get current user data for audit log
    const currentUserResult = await query(
      adminQueries.getUserByIdAdmin,
      [id],
      'Get user before status update'
    );

    if (currentUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const currentUser = currentUserResult.rows[0];

    // Check if user is deleted
    if (currentUser.deleted_at) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update status of deleted user',
        code: 'USER_DELETED'
      });
    }

    // Prevent admin from deactivating themselves
    if (id === adminId && !is_active) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account',
        code: 'SELF_DEACTIVATION_BLOCKED'
      });
    }

    // Update user status
    const updateResult = await query(
      adminQueries.updateUserStatus,
      [id, is_active],
      'Update user status'
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or update failed',
        code: 'UPDATE_FAILED'
      });
    }

    const updatedUser = updateResult.rows[0];

    // Log admin action
    await logAdminAction({
      adminId,
      action: is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      resourceType: 'user',
      resourceId: id,
      oldValues: { is_active: currentUser.is_active },
      newValues: { is_active: is_active },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    console.log(`👤 Admin ${req.user.email} ${is_active ? 'activated' : 'deactivated'} user: ${currentUser.email} (${currentUser.employee_id})`);

    res.status(200).json({
      success: true,
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          employee_id: updatedUser.employee_id,
          is_active: updatedUser.is_active,
          updated_at: updatedUser.updated_at
        },
        action: is_active ? 'activated' : 'deactivated',
        performed_by: req.user.email
      }
    });

  } catch (error) {
    console.error('❌ Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Soft delete user
 * DELETE /api/v1/admin/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Prevent admin from deleting themselves
    if (id === adminId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
        code: 'SELF_DELETION_BLOCKED'
      });
    }

    // Get current user data for audit log
    const currentUserResult = await query(
      adminQueries.getUserByIdAdmin,
      [id],
      'Get user before deletion'
    );

    if (currentUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const currentUser = currentUserResult.rows[0];

    // Check if user is already deleted
    if (currentUser.deleted_at) {
      return res.status(400).json({
        success: false,
        message: 'User is already deleted',
        code: 'USER_ALREADY_DELETED'
      });
    }

    // Soft delete user
    const deleteResult = await query(
      adminQueries.softDeleteUser,
      [id, adminId],
      'Soft delete user'
    );

    if (deleteResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete user',
        code: 'DELETE_FAILED'
      });
    }

    const deletedUser = deleteResult.rows[0];

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'USER_DELETED',
      resourceType: 'user',
      resourceId: id,
      oldValues: {
        is_active: currentUser.is_active,
        deleted_at: null
      },
      newValues: {
        is_active: false,
        deleted_at: deletedUser.deleted_at
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    console.log(`👤 Admin ${req.user.email} deleted user: ${currentUser.email} (${currentUser.employee_id})`);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: {
        user: {
          id: deletedUser.id,
          email: deletedUser.email,
          employee_id: deletedUser.employee_id,
          deleted_at: deletedUser.deleted_at
        },
        performed_by: req.user.email
      }
    });

  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user statistics
 * GET /api/v1/admin/stats
 */
const getUserStatistics = async (req, res) => {
  try {
    const statsResult = await query(
      adminQueries.getUserStatistics,
      [],
      'Get user statistics'
    );

    const stats = statsResult.rows[0];

    res.status(200).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: {
        statistics: {
          total_users: parseInt(stats.total_users),
          active_users: parseInt(stats.active_users),
          inactive_users: parseInt(stats.inactive_users),
          deleted_users: parseInt(stats.deleted_users),
          admin_created_users: parseInt(stats.admin_created_users),
          self_registered_users: parseInt(stats.self_registered_users),
          users_by_role: {
            admin: parseInt(stats.admin_users),
            manager: parseInt(stats.manager_users),
            user: parseInt(stats.regular_users)
          }
        },
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Get user statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getUserStatistics
};