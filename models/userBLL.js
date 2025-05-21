const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Track which column name we're using
let usingNameColumn = true;
let userTableCreated = false;

// Initialize database
const db = new sqlite3.Database(path.join(__dirname, '../users.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to users database');
        
        // EMERGENCY DIAGNOSTIC: Check existing tables
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
            if (err) {
                console.error('Error listing tables:', err);
            } else {
                console.log('Tables in database:', tables.map(t => t.name).join(', '));
            }
            
            // EMERGENCY ACTION: Drop the users table completely and recreate
            console.log('EMERGENCY: Force dropping all tables and recreating schema');
            
            // First drop any users table if it exists
            db.run("DROP TABLE IF EXISTS users", (err) => {
                if (err) {
                    console.error('Error dropping users table:', err);
                } else {
                    console.log('Successfully dropped any existing users table');
                    
                    // Create a brand new table with our required schema
                    db.run(`
                        CREATE TABLE users (
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
                            console.log('Successfully created users table with proper schema');
                            
                            // Create a default admin user directly
                            db.run(
                                'INSERT INTO users (name, password, admin) VALUES (?, ?, ?)',
                                ['admin', '123456', 1],
                                function(err) {
                                    if (err) {
                                        console.error('Error creating admin user:', err);
                                    } else {
                                        console.log('Created default admin user (username: admin, password: 123456)');
                                        
                                        // Check if schema was created correctly
                                        db.all("PRAGMA table_info(users)", (err, columns) => {
                                            if (err) {
                                                console.error('Error verifying schema:', err);
                                            } else {
                                                const columnNames = columns.map(c => c.name).join(', ');
                                                console.log('Final schema columns:', columnNames);
                                                
                                                // Check that we have exactly what we need
                                                const hasNameColumn = columns.some(col => col.name === 'name');
                                                console.log('Has name column:', hasNameColumn);
                                            }
                                        });
                                    }
                                }
                            );
                        }
                    });
                }
            });
        });
    }
});

// Get user by name
async function getUserByName(name) {
    return new Promise((resolve, reject) => {
        console.log(`Looking up user by name: "${name}"`);
        
        db.get('SELECT * FROM users WHERE name = ?', [name], (err, row) => {
            if (err) {
                console.error(`Error in getUserByName("${name}"):`, err);
                reject(err);
            } else {
                console.log(`User lookup result:`, row ? `Found user with ID ${row.id}` : 'User not found');
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

module.exports = {
    getUserByName,
    getUsersPassword,
    createUser,
    getAllUsers,
    updateUser
};