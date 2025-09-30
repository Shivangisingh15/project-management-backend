// for auth service//
-- =============================================================================
-- AUTHENTICATION DATABASE SCHEMA FOR PGADMIN4
-- =============================================================================
-- This script creates a complete authentication system with:
-- 1. User management with roles
-- 2. OTP verification system  
-- 3. Session management for JWT tokens
-- 4. Proper indexing for performance
-- 5. Triggers for automatic timestamp updates
-- =============================================================================

-- Step 1: Clean slate - Drop existing tables (if any) in correct order
-- Note: We drop in reverse order of creation due to foreign key constraints
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS otp_verifications CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Step 2: Create roles table
-- This defines user permissions (user, admin, moderator)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,                           -- Auto-incrementing ID
    name VARCHAR(50) UNIQUE NOT NULL,               -- Role name (unique)
    description TEXT,                               -- Human readable description
    permissions JSONB DEFAULT '{}',                 -- Flexible permissions storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create users table
-- Main user storage with email-based authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- UUID for better security
    email VARCHAR(255) UNIQUE NOT NULL,             -- Primary identifier
    email_verified BOOLEAN DEFAULT FALSE,           -- Email verification status
    profile_picture_url TEXT,                       -- Firebase storage URL
    role_id INTEGER REFERENCES roles(id) DEFAULT 1, -- Foreign key to roles
    is_active BOOLEAN DEFAULT TRUE,                 -- Soft delete capability
    last_login TIMESTAMP WITH TIME ZONE,            -- Track user activity
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Create OTP verifications table
-- Handles email-based OTP for registration/login/password reset
CREATE TABLE otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,                    -- Email to send OTP
    otp_code VARCHAR(6) NOT NULL,                   -- 6-digit OTP code
    otp_type VARCHAR(20) NOT NULL CHECK (           -- Type of OTP
        otp_type IN ('registration', 'login', 'password_reset')
    ),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,   -- OTP expiration
    is_verified BOOLEAN DEFAULT FALSE,              -- Verification status
    attempts INTEGER DEFAULT 0,                     -- Failed attempts counter
    max_attempts INTEGER DEFAULT 3,                 -- Max allowed attempts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 5: Create user sessions table
-- Manages JWT refresh tokens and device tracking
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Link to user
    refresh_token TEXT NOT NULL,                    -- JWT refresh token
    device_info JSONB,                             -- Device/browser info
    ip_address INET,                               -- User's IP address
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- Session expiration
    is_active BOOLEAN DEFAULT TRUE,                -- Session status
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 6: Insert default roles
-- Pre-populate with standard role types
INSERT INTO roles (name, description, permissions) VALUES
('user', 'Regular user with basic access', 
 '{"read": true, "write": false, "admin": false}'::JSONB),
('admin', 'Administrator with full access', 
 '{"read": true, "write": true, "admin": true}'::JSONB),
('moderator', 'Moderator with limited admin access', 
 '{"read": true, "write": true, "admin": false}'::JSONB);

-- Step 7: Create database indexes for performance optimization
-- These indexes will speed up common queries

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);              -- Fast email lookup
CREATE INDEX idx_users_role_id ON users(role_id);          -- Role-based queries
CREATE INDEX idx_users_is_active ON users(is_active);      -- Active users filter

-- OTP verifications indexes
CREATE INDEX idx_otp_email ON otp_verifications(email);    -- Email-based OTP lookup
CREATE INDEX idx_otp_expires_at ON otp_verifications(expires_at); -- Expired OTP cleanup
CREATE INDEX idx_otp_type ON otp_verifications(otp_type);  -- OTP type filtering

-- User sessions indexes
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);        -- User's sessions
CREATE INDEX idx_sessions_refresh_token ON user_sessions(refresh_token); -- Token lookup
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);  -- Session cleanup
CREATE INDEX idx_sessions_is_active ON user_sessions(is_active);    -- Active sessions

-- Step 8: Create function for automatic timestamp updates
-- This function will be called by triggers to update 'updated_at' fields
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Step 9: Create triggers for automatic timestamp updates
-- These triggers automatically update 'updated_at' when records are modified
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON roles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Create a view for user information with role details
-- This makes it easier to query user data with role information
CREATE VIEW user_details AS
SELECT 
    u.id,
    u.email,
    u.email_verified,
    u.profile_picture_url,
    u.is_active,
    u.last_login,
    u.created_at,
    u.updated_at,
    r.name as role_name,
    r.description as role_description,
    r.permissions as role_permissions
FROM users u
LEFT JOIN roles r ON u.role_id = r.id;

-- =============================================================================
-- VERIFICATION QUERIES - Run these to confirm everything is set up correctly
-- =============================================================================

-- Check if all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'roles', 'otp_verifications', 'user_sessions')
ORDER BY table_name;

-- Check if roles were inserted
SELECT * FROM roles ORDER BY id;

-- Check if indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'roles', 'otp_verifications', 'user_sessions')
ORDER BY tablename, indexname;


-- Method 2: Manually specify employee_id
INSERT INTO users (id, email, employee_id, email_verified, role_id, is_active) 
VALUES (
    gen_random_uuid(), 
    'jane.smith@lancehawks.com',
    'LHWK-2025-A100',  -- Manual employee ID
    true,
    1, 
    true
);



-- Method 1: Let system auto-generate employee_id
INSERT INTO users (id, email, email_verified, role_id, is_active) 
VALUES (
    gen_random_uuid(), 
    'john.doe@lancehawks.com', 
    false, 
    1, 
    true
);





-- this ome is generated by claude AI


-- =================================================================
-- LANCEHAWKS PROJECT - COMPLETE SQL SETUP
-- PostgreSQL Database Schema & Employee ID System
-- =================================================================

-- -----------------------------------------------------------------
-- 1. USERS TABLE STRUCTURE
-- -----------------------------------------------------------------
-- Your existing users table (for reference):
/*
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    profile_picture_url TEXT,
    role_id INTEGER,
    employee_id VARCHAR(20) UNIQUE,  -- Added for employee management
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
*/

-- -----------------------------------------------------------------
-- 2. EMPLOYEE ID COLUMN SETUP
-- -----------------------------------------------------------------
-- Add employee_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'employee_id'
    ) THEN
        ALTER TABLE users ADD COLUMN employee_id VARCHAR(20) UNIQUE;
    END IF;
END $$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%employee_id%'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_employee_id_unique UNIQUE (employee_id);
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);

-- -----------------------------------------------------------------
-- 3. EMPLOYEE ID AUTO-GENERATION SYSTEM
-- -----------------------------------------------------------------
-- Create sequence for auto-incrementing employee IDs
CREATE SEQUENCE IF NOT EXISTS employee_id_seq START 1;

-- Function to auto-generate employee IDs (LHWK-2025-A001 format)
CREATE OR REPLACE FUNCTION generate_employee_id()
RETURNS TRIGGER AS '
DECLARE
    next_num INTEGER;
    current_year INTEGER;
    new_employee_id VARCHAR(20);
    max_attempts INTEGER := 10;
    attempt INTEGER := 0;
BEGIN
    -- Only generate if employee_id is not provided
    IF NEW.employee_id IS NULL THEN
        LOOP
            attempt := attempt + 1;
            
            -- Get current year
            current_year := EXTRACT(YEAR FROM NOW());
            
            -- Get next sequence number
            next_num := nextval(''employee_id_seq'');
            
            -- Generate employee ID: LHWK-2025-A001
            new_employee_id := ''LHWK-'' || current_year || ''-A'' || LPAD(next_num::TEXT, 3, ''0'');
            
            -- Check if this ID already exists (safety check)
            IF NOT EXISTS (SELECT 1 FROM users WHERE employee_id = new_employee_id) THEN
                NEW.employee_id := new_employee_id;
                EXIT;
            END IF;
            
            -- Safety exit after max attempts
            IF attempt >= max_attempts THEN
                RAISE EXCEPTION ''Could not generate unique employee ID after % attempts'', max_attempts;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
' LANGUAGE plpgsql;

-- Create trigger to auto-generate employee_id on INSERT
DROP TRIGGER IF EXISTS trigger_generate_employee_id ON users;
CREATE TRIGGER trigger_generate_employee_id
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION generate_employee_id();

-- -----------------------------------------------------------------
-- 4. BACKFILL EXISTING USERS WITH EMPLOYEE IDs
-- -----------------------------------------------------------------
-- Generate employee IDs for existing users (run once)
DO $$
DECLARE
    user_record RECORD;
    next_num INTEGER;
    current_year INTEGER;
    new_employee_id VARCHAR(20);
    user_count INTEGER;
BEGIN
    -- Check if there are users without employee_id
    SELECT COUNT(*) INTO user_count FROM users WHERE employee_id IS NULL;
    
    IF user_count > 0 THEN
        RAISE NOTICE 'Found % users without employee_id. Generating IDs...', user_count;
        
        current_year := EXTRACT(YEAR FROM NOW());
        
        FOR user_record IN SELECT id FROM users WHERE employee_id IS NULL ORDER BY created_at ASC
        LOOP
            SELECT nextval('employee_id_seq') INTO next_num;
            new_employee_id := 'LHWK-' || current_year || '-A' || LPAD(next_num::TEXT, 3, '0');
            
            UPDATE users 
            SET employee_id = new_employee_id
            WHERE id = user_record.id;
            
            RAISE NOTICE 'Generated employee_id: % for user: %', new_employee_id, user_record.id;
        END LOOP;
        
        RAISE NOTICE 'Successfully generated employee IDs for % users', user_count;
    ELSE
        RAISE NOTICE 'All users already have employee IDs';
    END IF;
END $$;

-- -----------------------------------------------------------------
-- 5. MANUAL USER INSERTION EXAMPLES
-- -----------------------------------------------------------------
-- Method 1: Let system auto-generate employee_id
INSERT INTO users (id, email, email_verified, role_id, is_active) 
VALUES (
    gen_random_uuid(), 
    'john.doe@lancehawks.com', 
    false, 
    1, 
    true
);
-- employee_id will be auto-generated as LHWK-2025-A001

-- Method 2: Manually specify employee_id
INSERT INTO users (id, email, employee_id, email_verified, role_id, is_active) 
VALUES (
    gen_random_uuid(), 
    'jane.smith@lancehawks.com',
    'LHWK-2025-A100',  -- Manual employee ID
    true,
    1, 
    true
);

-- Method 3: Bulk insert with auto-generation
INSERT INTO users (email, email_verified, role_id, is_active) 
VALUES 
    ('alice.johnson@lancehawks.com', false, 1, true),
    ('bob.wilson@lancehawks.com', false, 1, true),
    ('carol.brown@lancehawks.com', false, 2, true);
-- All will get auto-generated employee IDs

-- -----------------------------------------------------------------
-- 6. USEFUL QUERIES FOR MANAGEMENT
-- -----------------------------------------------------------------
-- View all users with employee IDs
SELECT 
    employee_id, 
    email, 
    email_verified, 
    is_active, 
    created_at,
    last_login
FROM users 
ORDER BY employee_id;

-- Find user by employee ID
SELECT * FROM users WHERE employee_id = 'LHWK-2025-A001';

-- Search users by employee ID pattern
SELECT * FROM users WHERE employee_id LIKE 'LHWK-2025%';

-- Count active employees
SELECT COUNT(*) as active_employees 
FROM users 
WHERE is_active = true AND employee_id IS NOT NULL;

-- Get next employee ID (for reference)
SELECT 'LHWK-' || EXTRACT(YEAR FROM NOW()) || '-A' || 
       LPAD(nextval('employee_id_seq')::TEXT, 3, '0') as next_employee_id;

-- Reset sequence if needed (CAREFUL!)
-- SELECT setval('employee_id_seq', 1, false);

-- Check sequence current value
SELECT sequence_name, last_value FROM information_schema.sequences 
WHERE sequence_name = 'employee_id_seq';

-- -----------------------------------------------------------------
-- 7. VERIFICATION QUERIES
-- -----------------------------------------------------------------
-- Check if employee_id column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'employee_id';

-- Check if trigger exists
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'users' AND trigger_name = 'trigger_generate_employee_id';

-- Check if function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'generate_employee_id';

-- Check if unique constraint exists
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'users' AND constraint_type = 'UNIQUE';

-- -----------------------------------------------------------------
-- 8. MAINTENANCE QUERIES
-- -----------------------------------------------------------------
-- Update employee_id format if needed (run carefully)
/*
UPDATE users 
SET employee_id = 'LHWK-' || EXTRACT(YEAR FROM NOW()) || '-A' || 
                 LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 3, '0')
WHERE employee_id IS NULL OR employee_id NOT LIKE 'LHWK-%';
*/

-- Deactivate user (soft delete)
UPDATE users 
SET is_active = false, updated_at = NOW()
WHERE employee_id = 'LHWK-2025-A001';

-- Reactivate user
UPDATE users 
SET is_active = true, updated_at = NOW()
WHERE employee_id = 'LHWK-2025-A001';

-- -----------------------------------------------------------------
-- 9. CLEANUP/ROLLBACK (IF NEEDED)
-- -----------------------------------------------------------------
-- Remove trigger (if you want to disable auto-generation)
-- DROP TRIGGER IF EXISTS trigger_generate_employee_id ON users;

-- Remove function
-- DROP FUNCTION IF EXISTS generate_employee_id();

-- Remove sequence
-- DROP SEQUENCE IF EXISTS employee_id_seq;

-- Remove employee_id column (CAREFUL!)
-- ALTER TABLE users DROP COLUMN IF EXISTS employee_id;

-- =================================================================
-- NOTES FOR FUTURE REFERENCE:
-- =================================================================
/*
1. Employee ID Format: LHWK-YYYY-Axxx
   - LHWK: Company prefix (LanceHawks)
   - YYYY: Current year
   - A: Department/Type identifier
   - xxx: 3-digit sequential number (001, 002, etc.)

2. Auto-generation happens ONLY when employee_id is NULL during INSERT

3. Manual insertion can override auto-generation by providing employee_id

4. Sequence continues incrementing globally (never resets)

5. All employee IDs are unique across the system

6. Trigger ensures no duplicate IDs even with concurrent inserts

7. Use the verification queries to check system status

8. For bulk operations, consider temporarily disabling the trigger
*/


-------------------------------------------------------------part where i have started working for register user----------------------

-- ===============================================
-- USER REGISTRATION SYSTEM - COMPLETE DATABASE SCHEMA
-- File: database.sql
-- Created: 2025
-- Tech Stack: PostgreSQL + Neon.tech
-- Purpose: Professional user management with admin registration
-- ===============================================

-- ===============================================
-- 1. USERS TABLE STRUCTURE (Enhanced)
-- ===============================================
-- Assumes base table exists with these core columns:
-- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
-- email VARCHAR(255) UNIQUE NOT NULL
-- password_hash VARCHAR(255) NOT NULL  
-- email_verified BOOLEAN DEFAULT false
-- profile_picture_url VARCHAR(500) NOT NULL
-- employee_id VARCHAR(50) UNIQUE NOT NULL
-- role_id INTEGER REFERENCES roles(id) (1=admin, 2=manager, 3=user)
-- is_active BOOLEAN DEFAULT true
-- last_login TIMESTAMPTZ
-- created_at TIMESTAMPTZ DEFAULT NOW()
-- updated_at TIMESTAMPTZ DEFAULT NOW()

-- Add admin registration tracking columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- Add foreign key constraints for admin tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND constraint_name = 'users_created_by_fkey'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND constraint_name = 'users_deleted_by_fkey'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_deleted_by_fkey 
        FOREIGN KEY (deleted_by) REFERENCES users(id);
    END IF;
END $$;

/*
USERS TABLE DOCUMENTATION:
═══════════════════════════════
- id: Unique identifier (UUID)
- email: User's email address (unique, required)
- password_hash: Encrypted password
- email_verified: Email verification status (auto-set to TRUE for admin-created users)
- profile_picture_url: Required profile picture URL
- employee_id: Auto-generated format LHWK-2024-A0001
- role_id: 1=admin, 2=manager, 3=user
- is_active: Account status (true/false)
- last_login: Last login timestamp
- created_by: Admin who created this user (NULL for self-registered)
- deleted_at: Soft delete timestamp (NULL = not deleted)
- deleted_by: Admin who deleted this user
- created_at: Account creation timestamp
- updated_at: Last modification timestamp
*/

-- ===============================================
-- 2. EMPLOYEE SEQUENCE TABLE
-- ===============================================
-- Purpose: Generate unique employee IDs in LHWK-YYYY-A#### format
CREATE TABLE IF NOT EXISTS employee_sequence (
    year INTEGER PRIMARY KEY,
    last_sequence INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize current year
INSERT INTO employee_sequence (year, last_sequence) 
VALUES (EXTRACT(YEAR FROM NOW()), 0)
ON CONFLICT (year) DO NOTHING;

/*
EMPLOYEE_SEQUENCE TABLE DOCUMENTATION:
═══════════════════════════════════════
- year: Calendar year (Primary Key)
- last_sequence: Last used sequence number for the year
- created_at: Record creation timestamp  
- updated_at: Last modification timestamp

Purpose: Ensures unique employee IDs like LHWK-2024-A0001, LHWK-2024-A0002, etc.
*/

-- ===============================================
-- 3. AUDIT LOGS TABLE (if not exists)
-- ===============================================
-- Purpose: Track all admin actions for security and compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*
AUDIT_LOGS TABLE DOCUMENTATION:
═══════════════════════════════════
- id: Unique log entry identifier
- user_id: Admin who performed the action
- action: Action performed (USER_CREATED, USER_UPDATED, USER_DELETED, etc.)
- resource_type: Type of resource affected (user, role, etc.)
- resource_id: ID of the affected resource
- old_values: Previous values (JSON format)
- new_values: New values (JSON format)
- ip_address: IP address of the admin
- user_agent: Browser/client information
- created_at: When the action occurred

Examples:
- Action: "USER_CREATED", Resource: "user", Resource_ID: "uuid-of-new-user"
- Action: "USER_STATUS_UPDATED", Old: {"is_active": true}, New: {"is_active": false}
*/

-- ===============================================
-- 4. RATE LIMIT STORE TABLE
-- ===============================================
-- Purpose: Prevent API abuse with rate limiting
CREATE TABLE IF NOT EXISTS rate_limit_store (
    id VARCHAR(255) PRIMARY KEY,
    points INTEGER DEFAULT 0,
    expire TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*
RATE_LIMIT_STORE TABLE DOCUMENTATION:
══════════════════════════════════════
- id: Unique identifier (usually IP + route combination)
- points: Number of requests made
- expire: When the rate limit resets
- created_at: When the rate limit started

Usage:
- Registration: 3 attempts per hour
- Login: 10 attempts per 15 minutes
- General API: 100 requests per 15 minutes
*/

-- ===============================================
-- 5. ROLES TABLE (ensure it exists with proper data)
-- ===============================================
-- Insert required roles if they don't exist
INSERT INTO roles (id, name, description) VALUES 
(1, 'admin', 'System Administrator - Full access'),
(2, 'manager', 'Department Manager - Limited admin access'),
(3, 'user', 'Regular User - Basic access')
ON CONFLICT (id) DO NOTHING;

-- ===============================================
-- FUNCTIONS AND TRIGGERS
-- ===============================================

-- Function: Generate Employee ID
CREATE OR REPLACE FUNCTION generate_employee_id()
RETURNS VARCHAR(50) AS
$$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM NOW());
    next_sequence INTEGER;
    employee_id VARCHAR(50);
BEGIN
    INSERT INTO employee_sequence (year, last_sequence) 
    VALUES (current_year, 1)
    ON CONFLICT (year) 
    DO UPDATE SET 
        last_sequence = employee_sequence.last_sequence + 1,
        updated_at = NOW();
    
    SELECT last_sequence INTO next_sequence 
    FROM employee_sequence 
    WHERE year = current_year;
    
    employee_id := 'LHWK-' || current_year || '-A' || LPAD(next_sequence::TEXT, 4, '0');
    
    RETURN employee_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-generate employee_id on user creation
CREATE OR REPLACE FUNCTION set_employee_id()
RETURNS TRIGGER AS
$$
BEGIN
    IF NEW.employee_id IS NULL OR NEW.employee_id = '' THEN
        NEW.employee_id := generate_employee_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_employee_id ON users;
CREATE TRIGGER trigger_set_employee_id
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_employee_id();

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS
$$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Users table indexes (for fast queries)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Audit logs indexes (for audit queries)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);

-- Rate limit indexes (for quick lookups)
CREATE INDEX IF NOT EXISTS idx_rate_limit_expire ON rate_limit_store(expire);

-- ===============================================
-- DATA VALIDATION CONSTRAINTS
-- ===============================================

-- Add constraints safely
DO $$
BEGIN
    -- Email format validation
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND constraint_name = 'chk_users_email_format'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT chk_users_email_format 
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;
    
    -- Role validation (1, 2, or 3 only)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND constraint_name = 'chk_users_role_id_valid'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT chk_users_role_id_valid 
        CHECK (role_id IN (1, 2, 3));
    END IF;
END $$;

-- ===============================================
-- ESSENTIAL VIEWS
-- ===============================================

-- View: Active users with role information
CREATE OR REPLACE VIEW active_users_view AS
SELECT 
    u.id,
    u.email,
    u.employee_id,
    u.role_id,
    r.name as role_name,
    u.profile_picture_url,
    u.is_active,
    u.last_login,
    u.created_at,
    u.updated_at,
    creator.email as created_by_email,
    CASE WHEN u.created_by IS NOT NULL THEN true ELSE false END as is_admin_created
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN users creator ON u.created_by = creator.id
WHERE u.deleted_at IS NULL;

-- View: User statistics dashboard
CREATE OR REPLACE VIEW user_statistics_view AS
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users,
    COUNT(CASE WHEN created_by IS NOT NULL THEN 1 END) as admin_created_users,
    COUNT(CASE WHEN created_by IS NULL THEN 1 END) as self_registered_users,
    COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as non_deleted_users,
    COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted_users
FROM users;

-- ===============================================
-- MAINTENANCE FUNCTIONS
-- ===============================================

-- Function: Clean up expired rate limits
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS
$$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM rate_limit_store WHERE expire <= NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- ADMIN USER REGISTRATION FLOW DOCUMENTATION
-- ===============================================
/*
ADMIN USER REGISTRATION FLOW:
═══════════════════════════════
1. Admin logs in to system
2. Admin fills registration form (email, password, profile_picture_url, role_id)
3. System auto-generates employee_id (LHWK-2024-A0001)
4. System sets email_verified = true (since admin created)
5. System sets created_by = admin's user ID
6. System logs action in audit_logs
7. New user can login immediately (pre-verified)

BACKEND API ENDPOINTS NEEDED:
═══════════════════════════════
- POST /api/admin/users/create - Create new user
- GET /api/admin/users - List all users  
- PUT /api/admin/users/:id/status - Update user status
- DELETE /api/admin/users/:id - Soft delete user
- GET /api/admin/users/:id/audit-logs - Get user audit logs

RATE LIMITING:
══════════════
- Registration: 3 attempts per hour
- Login: 10 attempts per 15 minutes  
- General API: 100 requests per 15 minutes

SECURITY FEATURES:
══════════════════
- Soft deletes preserve data integrity
- Complete audit trail for compliance
- Rate limiting prevents abuse
- Email and role validation
- Foreign key constraints maintain data consistency
*/

-- ===============================================
-- VERIFICATION QUERIES (for testing)
-- ===============================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users' ORDER BY column_name;

-- Test employee ID generation
-- SELECT generate_employee_id() as sample_employee_id;

-- Check user statistics
-- SELECT * FROM user_statistics_view;

-- Check active users
-- SELECT * FROM active_users_view LIMIT 5;

-- Check functions exist
-- SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_name IN ('generate_employee_id', 'set_employee_id', 'update_updated_at_column');

-- Check triggers exist
-- SELECT trigger_name, event_manipulation, action_timing FROM information_schema.triggers WHERE trigger_name IN ('trigger_set_employee_id', 'trigger_users_updated_at');

-- ===============================================
-- END OF DATABASE SCHEMA
-- ===============================================