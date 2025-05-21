const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log("Starting database migration...");

// Check if the old database exists
const dbPath = path.join(__dirname, 'users.db');
if (fs.existsSync(dbPath)) {
    console.log("Existing database found. Creating backup...");
    fs.copyFileSync(dbPath, path.join(__dirname, 'users.db.backup'));
    console.log("Backup created as users.db.backup");
}

// Connect to database (will create if it doesn't exist)
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('Connected to database');
    
    // Check if the old schema exists (email column)
    db.get("PRAGMA table_info(users)", (err, rows) => {
        if (err) {
            console.error('Error checking schema:', err);
            db.close();
            process.exit(1);
        }
        
        // Migrate data if table exists
        db.run("DROP TABLE IF EXISTS users_old", (err) => {
            if (err) {
                console.error('Error dropping old backup table:', err);
                return;
            }
            
            // Create new schema
            db.serialize(() => {
                // 1. Rename current table to backup (if it exists)
                db.run("CREATE TABLE IF NOT EXISTS users_old AS SELECT * FROM users");
                
                // 2. Drop current table
                db.run("DROP TABLE IF EXISTS users");
                
                // 3. Create new table with correct schema
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
                        console.error('Error creating new schema:', err);
                        db.close();
                        process.exit(1);
                    }
                    
                    // 4. Check if old data exists and migrate it
                    db.all("SELECT * FROM users_old", (err, rows) => {
                        if (err) {
                            // Table likely doesn't exist, so skip migration
                            console.log("No existing data to migrate");
                            createDefaultUser();
                            return;
                        }
                        
                        if (rows && rows.length > 0) {
                            console.log(`Found ${rows.length} users to migrate`);
                            
                            // Get column info to verify schema
                            db.all("PRAGMA table_info(users_old)", (err, columns) => {
                                if (err) {
                                    console.error('Error checking old table columns:', err);
                                    createDefaultUser();
                                    return;
                                }
                                
                                const hasEmailColumn = columns.some(col => col.name === 'email');
                                
                                if (hasEmailColumn) {
                                    console.log("Migrating from email to name column");
                                    
                                    // Migrate each user
                                    let migratedCount = 0;
                                    rows.forEach(user => {
                                        db.run(
                                            'INSERT INTO users (name, password, admin, birthday) VALUES (?, ?, ?, ?)',
                                            [user.email, user.password, user.admin, user.birthday],
                                            function(err) {
                                                if (err) {
                                                    console.error(`Error migrating user ${user.email}:`, err);
                                                } else {
                                                    migratedCount++;
                                                    console.log(`Migrated user ${user.email} to ${user.email}`);
                                                    
                                                    if (migratedCount === rows.length) {
                                                        console.log(`Successfully migrated ${migratedCount}/${rows.length} users`);
                                                        db.run("DROP TABLE users_old");
                                                        db.close();
                                                    }
                                                }
                                            }
                                        );
                                    });
                                } else {
                                    console.log("Old schema already has name column, no need to migrate");
                                    createDefaultUser();
                                }
                            });
                        } else {
                            console.log("No users found to migrate");
                            createDefaultUser();
                        }
                    });
                });
            });
        });
    });
});

function createDefaultUser() {
    console.log("Creating default admin user...");
    db.run(
        'INSERT INTO users (name, password, admin) VALUES (?, ?, ?)',
        ['admin', '123456', 1],
        function(err) {
            if (err) {
                console.error('Error creating default user:', err);
            } else {
                console.log('Created default user: admin / 123456');
            }
            db.close();
        }
    );
} 