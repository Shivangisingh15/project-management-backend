
///////////////////for auto generation later /////////////////////////////

const { pool } = require('../database/connection');

class EmployeeIdService {
    /**
     * Generate next employee ID in format LHWK-YYYY-Axxx
     * @returns {Promise<string>} Generated employee ID
     */
    static async generateEmployeeId() {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Get current year
            const currentYear = new Date().getFullYear();
            
            // Get next sequence number
            const sequenceResult = await client.query('SELECT nextval($1) as next_id', ['employee_id_seq']);
            const sequenceNumber = sequenceResult.rows[0].next_id;
            
            // Format: LHWK-2024-A001
            const employeeId = `LHWK-${currentYear}-A${String(sequenceNumber).padStart(3, '0')}`;
            
            await client.query('COMMIT');
            return employeeId;
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error generating employee ID:', error);
            throw new Error('Failed to generate employee ID');
        } finally {
            client.release();
        }
    }

    /**
     * Check if employee ID already exists
     * @param {string} employeeId 
     * @returns {Promise<boolean>}
     */
    static async employeeIdExists(employeeId) {
        try {
            const result = await pool.query(
                'SELECT 1 FROM users WHERE employee_id = $1 LIMIT 1',
                [employeeId]
            );
            return result.rows.length > 0;
        } catch (error) {
            console.error('Error checking employee ID existence:', error);
            throw error;
        }
    }

    /**
     * Generate unique employee ID with retry mechanism
     * @param {number} maxRetries 
     * @returns {Promise<string>}
     */
    static async generateUniqueEmployeeId(maxRetries = 5) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const employeeId = await this.generateEmployeeId();
                
                // Double-check uniqueness (rare edge case)
                const exists = await this.employeeIdExists(employeeId);
                if (!exists) {
                    return employeeId;
                }
                
                console.warn(`Employee ID ${employeeId} already exists, retrying... (attempt ${attempt})`);
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                console.warn(`Attempt ${attempt} failed, retrying...`);
            }
        }
        
        throw new Error('Failed to generate unique employee ID after maximum retries');
    }

    /**
     * Get employee by employee ID
     * @param {string} employeeId 
     * @returns {Promise<Object|null>}
     */
    static async getEmployeeByEmployeeId(employeeId) {
        try {
            const result = await pool.query(
                'SELECT * FROM users WHERE employee_id = $1',
                [employeeId]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error fetching employee by employee ID:', error);
            throw error;
        }
    }
}

module.exports = EmployeeIdService;