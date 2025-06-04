const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Get database path
const dbPath = path.join(__dirname, '../users.db');
console.log(`Database path: ${dbPath}`);

// Check if database exists
if (fs.existsSync(dbPath)) {
    console.log(`Database file exists at ${dbPath}`);
} else {
    console.log(`Database file does not exist at ${dbPath}, will be created`);
}

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to users database');
        
        // First, check the schema to see what's there
        db.all("PRAGMA table_info(users)", (err, columns) => {
            if (err) {
                console.error("Error checking schema:", err);
                return;
            }
            
            // Check if table exists and has the right columns
            if (!columns || columns.length === 0) {
                console.log("Users table doesn't exist. Creating new table...");
                createUsersTable();
            } else {
                // Log the columns we found
                console.log("Existing users table columns:", columns.map(c => c.name).join(', '));
                
                // Check if we need to recreate the table
                const hasNameColumn = columns.some(col => col.name === 'name');
                const hasEmailColumn = columns.some(col => col.name === 'email');
                
                if (hasNameColumn) {
                    console.log("Table schema is good (has name column)");
                    checkForDefaultUser();
                } else if (hasEmailColumn) {
                    console.log("Found old schema with email column. Migrating schema...");
                    migrateSchema();
                } else {
                    console.log("Unexpected schema. Recreating table...");
                    recreateTable();
                }
            }
        });
    }
});

// Create users table with correct schema
function createUsersTable() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            admin INTEGER DEFAULT 0,
            birthday TEXT
        )
    `, (err) => {
        if (err) {
            console.error('Error creating users table:', err);
        } else {
            console.log('Created users table successfully');
            checkForDefaultUser();
        }
    });
}

// Check if default user exists and create if needed
function checkForDefaultUser() {
    db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
        if (err) {
            console.error('Error checking users count:', err);
        } else if (row.count === 0) {
            // Create a test user if no users exist
            createUser({
                name: 'admin',
                password: '123456',
                admin: 1
            }).then(() => {
                console.log('Created test user: admin / 123456');
            }).catch(err => {
                console.error('Error creating test user:', err);
            });
        } else {
            console.log(`Database has ${row.count} existing users`);
        }
    });
}

// Migrate from old schema to new schema
function migrateSchema() {
    // Create a backup first
    db.serialize(() => {
        db.run("DROP TABLE IF EXISTS users_backup", err => {
            if (err) {
                console.error("Error dropping backup table:", err);
                return;
            }
            
            // Create backup
            db.run("CREATE TABLE users_backup AS SELECT * FROM users", err => {
                if (err) {
                    console.error("Error creating backup table:", err);
                    return;
                }
                
                console.log("Created backup of users data");
                
                // Drop the original table
                db.run("DROP TABLE users", err => {
                    if (err) {
                        console.error("Error dropping users table:", err);
                        return;
                    }
                    
                    // Create new table with correct schema
                    createUsersTable();
                    
                    // Copy data, converting email to name
                    db.all("SELECT * FROM users_backup", [], (err, rows) => {
                        if (err) {
                            console.error("Error reading backup data:", err);
                            return;
                        }
                        
                        if (rows && rows.length > 0) {
                            console.log(`Found ${rows.length} users to migrate`);
                            
                            // Process each user
                            rows.forEach(user => {
                                const userData = {
                                    name: user.email, // Use email as name
                                    password: user.password,
                                    admin: user.admin,
                                    birthday: user.birthday
                                };
                                
                                createUser(userData)
                                    .then(() => console.log(`Migrated user ${userData.name}`))
                                    .catch(err => console.error(`Error migrating user ${userData.name}:`, err));
                            });
                        } else {
                            console.log("No users to migrate, creating default user");
                            checkForDefaultUser();
                        }
                    });
                });
            });
        });
    });
}

// Recreate table from scratch
function recreateTable() {
    db.run("DROP TABLE IF EXISTS users", err => {
        if (err) {
            console.error("Error dropping users table:", err);
            return;
        }
        
        console.log("Dropped users table, creating new one");
        createUsersTable();
    });
}

// Get user by name
async function getUserByName(name) {
    return new Promise((resolve, reject) => {
        if (!name) {
            console.log("getUserByName called with empty name");
            return resolve(null);
        }
        
        console.log(`Looking up user with name: "${name}"`);
        db.get('SELECT * FROM users WHERE name = ?', [name], (err, row) => {
            if (err) {
                console.error(`Error in getUserByName("${name}"):`, err);
                reject(err);
            } else {
                console.log(`User lookup result for "${name}":`, row ? "found" : "not found");
                resolve(row);
            }
        });
    });
}

// Get user by password
async function getUsersPassword(password) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE password = ?', [password], (err, row) => {
            if (err) {
                console.error('Error in getUsersPassword:', err);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Create new user
async function createUser(userData) {
    return new Promise((resolve, reject) => {
        const { name, password, admin, birthday } = userData;
        console.log(`Creating new user with name: "${name}"`);
        
        db.run(
            'INSERT INTO users (name, password, admin, birthday) VALUES (?, ?, ?, ?)',
            [name, password, admin || 0, birthday],
            function(err) {
                if (err) {
                    console.error('Error in createUser:', err);
                    reject(err);
                } else {
                    console.log(`Created user successfully with ID ${this.lastID}`);
                    resolve({ id: this.lastID, name, admin, birthday });
                }
            }
        );
    });
}

// Get all users
async function getAllUsers() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM users', [], (err, rows) => {
            if (err) {
                console.error('Error in getAllUsers:', err);
                reject(err);
            } else {
                console.log(`Found ${rows.length} users`);
                resolve(rows);
            }
        });
    });
}

// Update user information
async function updateUser(userId, userData) {
    return new Promise((resolve, reject) => {
        const { name, password } = userData;
        console.log(`Updating user ${userId} with: ${name ? `name=${name}` : ''}${password ? ' (and password)' : ''}`);
        
        let query = 'UPDATE users SET ';
        let params = [];
        
        if (name) {
            query += 'name = ?';
            params.push(name);
        }
        
        if (password) {
            if (params.length > 0) query += ', ';
            query += 'password = ?';
            params.push(password);
        }
        
        query += ' WHERE id = ?';
        params.push(userId);
        
        db.run(query, params, function(err) {
            if (err) {
                console.error('Error in updateUser:', err);
                reject(err);
            } else {
                console.log(`Updated user ${userId}, ${this.changes} row(s) affected`);
                resolve({ 
                    success: true,
                    message: 'User updated successfully',
                    changes: this.changes
                });
            }
        });
    });
}

// Delete user
async function deleteUser(userId) {
    return new Promise((resolve, reject) => {
        console.log(`Deleting user with ID: ${userId}`);
        
        db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
            if (err) {
                console.error('Error in deleteUser:', err);
                reject(err);
            } else {
                console.log(`Deleted user ${userId}, ${this.changes} row(s) affected`);
                resolve({ 
                    success: true,
                    message: 'User deleted successfully',
                    changes: this.changes
                });
            }
        });
    });
}

module.exports = {
    getUserByName,
    getUsersPassword,
    createUser,
    getAllUsers,
    updateUser,
    deleteUser
}; 