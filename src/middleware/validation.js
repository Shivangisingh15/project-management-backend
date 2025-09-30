/**
 * Validation Middleware
 * Input validation for admin endpoints
 */

const Joi = require('joi');

/**
 * Generic validation middleware
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorDetails
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

/**
 * Query parameter validation middleware
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: errorDetails
      });
    }

    // Replace req.query with validated data
    req.query = value;
    next();
  };
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for creating a new user (admin)
 */
const createUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .max(255)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email cannot exceed 255 characters',
      'any.required': 'Email is required'
    }),
  
  profile_picture_url: Joi.string()
    .uri()
    .max(500)
    .required()
    .messages({
      'string.uri': 'Please provide a valid profile picture URL',
      'string.max': 'Profile picture URL cannot exceed 500 characters',
      'any.required': 'Profile picture URL is required'
    }),
  
  role_id: Joi.number()
    .integer()
    .min(1)
    .max(3)
    .default(3)
    .messages({
      'number.base': 'Role ID must be a number',
      'number.integer': 'Role ID must be an integer',
      'number.min': 'Role ID must be 1 (admin), 2 (manager), or 3 (user)',
      'number.max': 'Role ID must be 1 (admin), 2 (manager), or 3 (user)'
    })
});

/**
 * Schema for updating user status
 */
const updateUserStatusSchema = Joi.object({
  is_active: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'is_active must be a boolean value (true or false)',
      'any.required': 'is_active field is required'
    })
});

/**
 * Schema for updating user profile (admin)
 */
const updateUserProfileSchema = Joi.object({
  email: Joi.string()
    .email()
    .max(255)
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email cannot exceed 255 characters'
    }),
  
  profile_picture_url: Joi.string()
    .uri()
    .max(500)
    .messages({
      'string.uri': 'Please provide a valid profile picture URL',
      'string.max': 'Profile picture URL cannot exceed 500 characters'
    }),
  
  role_id: Joi.number()
    .integer()
    .min(1)
    .max(3)
    .messages({
      'number.base': 'Role ID must be a number',
      'number.integer': 'Role ID must be an integer',
      'number.min': 'Role ID must be 1 (admin), 2 (manager), or 3 (user)',
      'number.max': 'Role ID must be 1 (admin), 2 (manager), or 3 (user)'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Schema for pagination and filtering users
 */
const getUsersQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  
  role_id: Joi.number()
    .integer()
    .min(1)
    .max(3)
    .messages({
      'number.base': 'Role ID must be a number',
      'number.integer': 'Role ID must be an integer',
      'number.min': 'Role ID must be 1 (admin), 2 (manager), or 3 (user)',
      'number.max': 'Role ID must be 1 (admin), 2 (manager), or 3 (user)'
    }),
  
  is_active: Joi.boolean()
    .messages({
      'boolean.base': 'is_active must be a boolean value (true or false)'
    }),
  
  search: Joi.string()
    .max(100)
    .trim()
    .messages({
      'string.max': 'Search term cannot exceed 100 characters'
    })
});

/**
 * UUID parameter validation
 */
const validateUUID = (paramName = 'id') => {
  return (req, res, next) => {
    const uuid = req.params[paramName];
    const uuidSchema = Joi.string().uuid().required();
    
    const { error } = uuidSchema.validate(uuid);
    if (error) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format. Must be a valid UUID.`,
        code: 'INVALID_UUID'
      });
    }
    
    next();
  };
};

/**
 * Custom validation for profile picture URLs
 * Ensures URL points to an image and is from allowed domains
 */
const validateProfilePictureUrl = (req, res, next) => {
  const { profile_picture_url } = req.body;
  
  if (!profile_picture_url) {
    return next();
  }

  // Check if URL has image extension or is from known image hosting services
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
  const allowedDomains = [
    'firebasestorage.googleapis.com',
    'storage.googleapis.com',
    'cloudinary.com',
    'amazonaws.com',
    'imgur.com',
    'gravatar.com'
  ];

  const url = new URL(profile_picture_url);
  const hasImageExtension = imageExtensions.test(url.pathname);
  const isAllowedDomain = allowedDomains.some(domain => 
    url.hostname.includes(domain)
  );

  if (!hasImageExtension && !isAllowedDomain) {
    return res.status(400).json({
      success: false,
      message: 'Profile picture URL must be a valid image URL from an allowed domain',
      code: 'INVALID_IMAGE_URL'
    });
  }

  next();
};

// =============================================================================
// EXPORTED VALIDATION MIDDLEWARE
// =============================================================================

module.exports = {
  // Generic validators
  validate,
  validateQuery,
  validateUUID,
  validateProfilePictureUrl,
  
  // Specific validation middleware
  validateCreateUser: [
    validate(createUserSchema),
    validateProfilePictureUrl
  ],
  
  validateUpdateUserStatus: validate(updateUserStatusSchema),
  
  validateUpdateUserProfile: [
    validate(updateUserProfileSchema),
    validateProfilePictureUrl
  ],
  
  validateGetUsersQuery: validateQuery(getUsersQuerySchema),
  
  // Schemas (for reuse)
  schemas: {
    createUserSchema,
    updateUserStatusSchema,
    updateUserProfileSchema,
    getUsersQuerySchema
  }
};