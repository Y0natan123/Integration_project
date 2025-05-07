const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize database
const db = new sqlite3.Database(path.join(__dirname, '../users.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to users database');
        // Create users table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                admin INTEGER DEFAULT 0,
                birthday TEXT
            )
        `, (err) => {
            if (err) {
                console.error('Error creating users table:', err);
            } else {
                // Check if we have any users
                db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
                    if (err) {
                        console.error('Error checking users count:', err);
                    } else if (row.count === 0) {
                        // Create a test user if no users exist
                        createUser({
                            email: 'test@test.com',
                            password: '123456',
                            admin: 1
                        }).then(() => {
                            console.log('Created test user: test@test.com / 123456');
                        }).catch(err => {
                            console.error('Error creating test user:', err);
                        });
                    }
                });
            }
        });
    }
});

// Get user by email
async function getUsersEmail(email) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
            if (err) {
                reject(err);
            } else {
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
        const { email, password, admin, birthday } = userData;
        db.run(
            'INSERT INTO users (email, password, admin, birthday) VALUES (?, ?, ?, ?)',
            [email, password, admin || 0, birthday],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, email, admin, birthday });
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
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

module.exports = {
    getUsersEmail,
    getUsersPassword,
    createUser,
    getAllUsers
}; 