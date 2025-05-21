const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log("Starting database fix script...");

// Define paths
const dbPath = path.join(__dirname, 'users.db');

// Check if the database exists
if (fs.existsSync(dbPath)) {
    console.log(`Database exists at ${dbPath}`);
    console.log("Creating backup of existing database...");
    fs.copyFileSync(dbPath, path.join(__dirname, 'users.db.backup'));
    console.log("Backup created successfully.");
} else {
    console.log("No existing database found. Will create a new one.");
}

// Connect to the database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('Connected to database');
    
    // Start migration
    migrateDatabase();
});

function migrateDatabase() {
    console.log("Beginning database migration...");
    
    // Check existing schema
    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
            console.error("Error checking schema:", err);
            cleanupAndExit(1);
            return;
        }
        
        // If no columns, table doesn't exist
        if (!columns || columns.length === 0) {
            console.log("Users table doesn't exist. Creating new table...");
            createNewTable();
            return;
        }
        
        // Check if the table has a name column
        const hasNameColumn = columns.some(col => col.name === 'name');
        const hasEmailColumn = columns.some(col => col.name === 'email');
        
        console.log(`Schema check: Name column exists: ${hasNameColumn}, Email column exists: ${hasEmailColumn}`);
        
        if (hasNameColumn) {
            console.log("Database schema is already up to date (has name column)");
            createDefaultUserIfNeeded();
        } else if (hasEmailColumn) {
            console.log("Found old schema with email column. Converting to name column...");
            migrateFromEmailToName();
        } else {
            console.log("Unexpected schema, recreating users table...");
            recreateTable();
        }
    });
}

function createNewTable() {
    const schema = `
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        admin INTEGER DEFAULT 0,
        birthday TEXT
    )`;
    
    db.run(schema, (err) => {
        if (err) {
            console.error("Error creating users table:", err);
            cleanupAndExit(1);
            return;
        }
        console.log("Created new users table with name column");
        createDefaultUserIfNeeded();
    });
}

function migrateFromEmailToName() {
    console.log("Backing up existing data...");
    
    // Create temporary table
    db.serialize(() => {
        // Step 1: Create a backup table and copy data
        db.run("DROP TABLE IF EXISTS users_backup", (err) => {
            if (err) {
                console.error("Error dropping backup table:", err);
                return;
            }
            
            db.run("CREATE TABLE users_backup AS SELECT * FROM users", (err) => {
                if (err) {
                    console.error("Error creating backup table:", err);
                    cleanupAndExit(1);
                    return;
                }
                
                console.log("Created backup of users data");
                
                // Step 2: Drop the original table
                db.run("DROP TABLE users", (err) => {
                    if (err) {
                        console.error("Error dropping original table:", err);
                        cleanupAndExit(1);
                        return;
                    }
                    
                    // Step 3: Create new table with correct schema
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
                            console.error("Error creating new table:", err);
                            cleanupAndExit(1);
                            return;
                        }
                        
                        // Step 4: Copy data from backup, converting email to name
                        db.all("SELECT * FROM users_backup", [], (err, rows) => {
                            if (err) {
                                console.error("Error reading backup data:", err);
                                cleanupAndExit(1);
                                return;
                            }
                            
                            if (rows && rows.length > 0) {
                                console.log(`Found ${rows.length} users to migrate`);
                                let migratedCount = 0;
                                
                                // Process each record
                                rows.forEach((user, index) => {
                                    const name = user.email; // Use email as the name
                                    db.run(
                                        "INSERT INTO users (id, name, password, admin, birthday) VALUES (?, ?, ?, ?, ?)",
                                        [user.id, name, user.password, user.admin, user.birthday],
                                        function(err) {
                                            if (err) {
                                                console.error(`Error migrating user ${name}:`, err);
                                            } else {
                                                migratedCount++;
                                                console.log(`Migrated user ${name} (${migratedCount}/${rows.length})`);
                                                
                                                // Check if all migrations are complete
                                                if (migratedCount === rows.length) {
                                                    console.log("All users migrated successfully");
                                                    cleanupAndExit(0);
                                                }
                                            }
                                        }
                                    );
                                });
                            } else {
                                console.log("No user data to migrate");
                                createDefaultUserIfNeeded();
                            }
                        });
                    });
                });
            });
        });
    });
}

function recreateTable() {
    db.run("DROP TABLE IF EXISTS users", (err) => {
        if (err) {
            console.error("Error dropping users table:", err);
            cleanupAndExit(1);
            return;
        }
        
        createNewTable();
    });
}

function createDefaultUserIfNeeded() {
    db.get("SELECT COUNT(*) as count FROM users", [], (err, result) => {
        if (err) {
            console.error("Error checking user count:", err);
            cleanupAndExit(1);
            return;
        }
        
        const count = result ? result.count : 0;
        
        if (count === 0) {
            console.log("No users found. Creating default admin user...");
            db.run(
                "INSERT INTO users (name, password, admin) VALUES (?, ?, ?)",
                ["admin", "123456", 1],
                function(err) {
                    if (err) {
                        console.error("Error creating default user:", err);
                        cleanupAndExit(1);
                        return;
                    }
                    console.log("Created default admin user (name: admin, password: 123456)");
                    cleanupAndExit(0);
                }
            );
        } else {
            console.log(`Database already has ${count} users`);
            cleanupAndExit(0);
        }
    });
}

function cleanupAndExit(exitCode) {
    console.log("Closing database connection...");
    db.close(() => {
        console.log(`Database fix ${exitCode === 0 ? 'completed successfully' : 'failed'}`);
        process.exit(exitCode);
    });
} 