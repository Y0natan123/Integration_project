const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Connect to main database
const mainDbPath = path.join(__dirname, 'absorbanceDB.db');
const mainDb = new sqlite3.Database(mainDbPath);

// Tasks that exist in collectDB
const collectDbTasks = [
    {
        id: 1,
        name: 'Blue Light Absorption',
        measurement_interval: 1,
        wavelength_start: 400,
        wavelength_end: 500,
        wavelength_step: 10
    },
    {
        id: 2,
        name: 'Red Light Spectrum',
        measurement_interval: 1,
        wavelength_start: 600,
        wavelength_end: 700,
        wavelength_step: 10
    },
    {
        id: 3,
        name: 'Full Visible Range',
        measurement_interval: 1,
        wavelength_start: 400,
        wavelength_end: 700,
        wavelength_step: 20
    },
    {
        id: 33,
        name: 'fggf',
        measurement_interval: 1,
        wavelength_start: 400,
        wavelength_end: 700,
        wavelength_step: 10
    }
];

console.log('Adding collectDB tasks to database...');

mainDb.serialize(() => {
    // Enable foreign keys
    mainDb.run('PRAGMA foreign_keys = ON');
    
    // Insert each task
    const insertStmt = mainDb.prepare(`
        INSERT OR REPLACE INTO Tasks (id, name, measurement_interval, wavelengths) 
        VALUES (?, ?, ?, ?)
    `);
    
    collectDbTasks.forEach(task => {
        const wavelengths = JSON.stringify({
            start: task.wavelength_start,
            end: task.wavelength_end,
            step: task.wavelength_step
        });
        
        insertStmt.run(task.id, task.name, task.measurement_interval, wavelengths, function(err) {
            if (err) {
                console.error(`Error inserting task ${task.id}:`, err.message);
            } else {
                console.log(`✓ Added task ${task.id}: ${task.name}`);
            }
        });
    });
    
    insertStmt.finalize();
    
    // Verify the tasks were added
    mainDb.all('SELECT id, name FROM Tasks ORDER BY id', (err, rows) => {
        if (err) {
            console.error('Error retrieving tasks:', err.message);
        } else {
            console.log('\nTasks in database:');
            rows.forEach(row => {
                console.log(`  Task ${row.id}: ${row.name}`);
            });
        }
        
        mainDb.close();
        console.log('\nDone!');
    });
}); 