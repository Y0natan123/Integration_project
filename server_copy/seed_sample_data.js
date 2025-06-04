const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Paths
const mainDbPath = path.join(__dirname, '../absorbanceDB.db');
const dataDir = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Open main database
const mainDb = new sqlite3.Database(mainDbPath);

// Sample tasks to seed
const tasks = [
  { task_name: 'Sample Task A', measurement_interval: 20, wavelength_start: 300, wavelength_end: 320, wavelength_step: 10 },
  { task_name: 'Sample Task B', measurement_interval: 15, wavelength_start: 350, wavelength_end: 370, wavelength_step: 5 }
];

// Helper to sanitize filenames
function sanitizeName(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function seed() {
  mainDb.serialize(() => {
    tasks.forEach(t => {
      mainDb.run(
        `INSERT INTO Tasks (task_name, measurement_interval, wavelength_start, wavelength_end, wavelength_step) VALUES (?, ?, ?, ?, ?)`,
        [t.task_name, t.measurement_interval, t.wavelength_start, t.wavelength_end, t.wavelength_step],
        function(err) {
          if (err) {
            console.error('Error inserting task:', err.message);
            return;
          }
          const taskId = this.lastID;
          const sanitized = sanitizeName(t.task_name);
          const dbFile = `task_${taskId}_${sanitized}.db`;
          const taskDbPath = path.join(dataDir, dbFile);

          // Create per-task database
          const taskDb = new sqlite3.Database(taskDbPath);
          taskDb.serialize(() => {
            taskDb.run(
              `CREATE TABLE IF NOT EXISTS Absorbance (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  wavelength INTEGER NOT NULL,
                  time_point INTEGER NOT NULL,
                  absorbance REAL NOT NULL,
                  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )`
            );

            // Insert sample absorbance data
            let time = 0;
            for (let w = t.wavelength_start; w <= t.wavelength_end; w += t.wavelength_step) {
              time += t.measurement_interval;
              const absorbance = parseFloat((Math.random() * 1.5 + 0.5).toFixed(3));
              taskDb.run(
                `INSERT INTO Absorbance (wavelength, time_point, absorbance) VALUES (?, ?, ?)`,
                [w, time, absorbance]
              );
            }
          });
          taskDb.close();
          console.log(`Seeded task ${taskId} and data in ${dbFile}`);
        }
      );
    });
  });

  mainDb.close();
  console.log('Seeding complete.');
}

seed(); 