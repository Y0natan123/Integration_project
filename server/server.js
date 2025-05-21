const fs = require('fs');
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { spawn } = require('child_process');
const path = require('path');
// Import the worker manager
const workerManager = require('./worker_manager');
// Import the users controller
const usersController = require('./Controllers/usersController');

const app = express();
// Allow port configuration through environment variable with fallback to 8000
const PORT = process.env.PORT || 8000;

// Ensure data directory exists for per-task DBs
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:8000',
      'https://localhost:8000',
      // Allow ngrok URLs
      'https://b6e6-109-186-136-199.ngrok-free.app',
      // Allow any ngrok subdomain
      /^https:\/\/[a-z0-9\-]+\.ngrok(-free)?\.app$/,
      // Allow local IP addresses
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
      /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:\d+$/,
      // Allow the requesting origin
      origin 
    ];
    
    // Check if the origin matches any of our allowed origins
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      // Handle regex patterns
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      // Handle string exact match
      return allowedOrigin === origin;
    });
    
    if (isAllowed || !origin) {
      callback(null, true);
    } else {
      console.log(`CORS rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Mount the users controller
app.use('/users', usersController);

// Helper to sanitize filenames
function sanitizeName(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

// Helper to generate a filename from task metadata
function generateFilename(taskId, taskName, params) {
    const sanitized = sanitizeName(taskName);
    const filename = `task_${taskId}_${sanitized}.db`;
    return filename;
}

// Initialize main database and ensure Tables exist
const mainDbPath = path.join(__dirname, 'absorbanceDB.db');
const mainDb = new sqlite3.Database(mainDbPath, (err) => {
    if (err) {
        console.error('Failed to open main database for initialization:', err.message);
    } else {
        console.log('Connected to main database for initialization');
        
        // Enable foreign keys for this connection
        mainDb.get('PRAGMA foreign_keys = ON', (err) => {
            if (err) {
                console.error('Failed to enable foreign keys:', err.message);
            } else {
                console.log('Foreign keys enabled for database integrity');
            }
        });
        
        // Create Tasks table
        mainDb.run(`
            CREATE TABLE IF NOT EXISTS Tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                measurement_interval INTEGER NOT NULL,
                wavelengths TEXT NOT NULL
            )
        `, (err) => {
            if (err) {
                console.error('Failed to create Tasks table:', err.message);
                mainDb.close();
                return;
            }
            
            console.log('Tasks table ready');
            
            // Create Notes table with explicit foreign key constraint
            mainDb.run(`
                CREATE TABLE IF NOT EXISTS Notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (task_id) REFERENCES Tasks(id) ON DELETE CASCADE
                )
            `, (err) => {
                if (err) {
                    console.error('Failed to create Notes table:', err.message);
                    mainDb.close();
                    return;
                }
                
                console.log('Notes table ready');
                
                // Check database structure integrity
                checkDatabaseIntegrity(mainDb, () => {
                    mainDb.close();
                });
            });
        });
    }
});

// Function to verify database structure integrity
function checkDatabaseIntegrity(db, callback) {
    console.log('Checking database integrity...');
    
    // Check for PRAGMA integrity_check
    db.get('PRAGMA integrity_check', (err, result) => {
        if (err) {
            console.error('Error running integrity check:', err.message);
        } else if (result && result.integrity_check === 'ok') {
            console.log('Database integrity check: OK');
        } else {
            console.error('Database integrity issues detected:', result);
        }
        
        // Check Tasks table structure
        db.all("PRAGMA table_info(Tasks)", (err, columns) => {
            if (err) {
                console.error('Error checking Tasks table structure:', err.message);
            } else {
                console.log('Tasks table columns:', columns.map(col => col.name).join(', '));
                
                // Check if required columns exist
                const requiredColumns = ['id', 'name', 'measurement_interval', 'wavelengths'];
                const missingColumns = requiredColumns.filter(col => 
                    !columns.some(c => c.name === col)
                );
                
                if (missingColumns.length > 0) {
                    console.error('Missing required columns in Tasks table:', missingColumns.join(', '));
                }
            }
            
            // Check Notes table structure
            db.all("PRAGMA table_info(Notes)", (err, columns) => {
                if (err) {
                    console.error('Error checking Notes table structure:', err.message);
                } else {
                    console.log('Notes table columns:', columns.map(col => col.name).join(', '));
                    
                    // Check if required columns exist
                    const requiredColumns = ['id', 'task_id', 'content', 'created_at'];
                    const missingColumns = requiredColumns.filter(col => 
                        !columns.some(c => c.name === col)
                    );
                    
                    if (missingColumns.length > 0) {
                        console.error('Missing required columns in Notes table:', missingColumns.join(', '));
                    }
                }
                
                // Check foreign key relationship
                db.all("PRAGMA foreign_key_list(Notes)", (err, foreignKeys) => {
                    if (err) {
                        console.error('Error checking foreign keys:', err.message);
                    } else {
                        console.log('Foreign key relationships:', JSON.stringify(foreignKeys));
                        
                        // Verify the task_id foreign key exists
                        const hasTaskIdFK = foreignKeys.some(fk => 
                            fk.from === 'task_id' && fk.table === 'Tasks' && fk.to === 'id'
                        );
                        
                        if (!hasTaskIdFK) {
                            console.error('Missing required foreign key: Notes.task_id -> Tasks.id');
                        } else {
                            console.log('Foreign key constraints are valid');
                        }
                    }
                    
                    // Integrity check complete
                    callback();
                });
            });
        });
    });
}

// Get all tasks from database
app.get('/api/tasks', (req, res) => {
    try {
        const db = new sqlite3.Database(path.join(__dirname, 'absorbanceDB.db'), sqlite3.OPEN_READONLY);
        
        db.all(`SELECT id, name, measurement_interval, wavelengths FROM Tasks`, [], (err, rows) => {
            db.close();
            
            if (err) {
                console.error('Error getting tasks:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // Convert tasks to the expected format and add active status
            const tasks = rows.map(row => {
                // Parse wavelengths JSON
                let wavelengths = { start: 400, end: 700, step: 10 };
                try {
                    if (row.wavelengths) {
                        wavelengths = JSON.parse(row.wavelengths);
                    }
                } catch (e) {
                    console.warn(`Invalid wavelengths JSON for task ${row.id}:`, e);
                }
                
                // Check if task is active
                const status = workerManager.getTaskStatus(row.id);
                
                return {
                    // Provide both `id`/`name` and `task_id`/`task_name` fields
                    id: row.id,
                    task_id: row.id,
                    name: row.name,
                    task_name: row.name,
                    measurement_interval: row.measurement_interval,
                    wavelength_start: wavelengths.start,
                    wavelength_end: wavelengths.end,
                    wavelength_step: wavelengths.step,
                    is_active: status.active
                };
            });
            
            res.json(tasks);
        });
    } catch (error) {
        console.error('Error getting tasks:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get task data
app.get('/api/tasks/:id/data', (req, res) => {
    const { id } = req.params;
    // Open main DB to get the task name
    const mainDb = new sqlite3.Database(path.join(__dirname, 'absorbanceDB.db'), sqlite3.OPEN_READONLY, err => {
        if (err) return res.status(500).json({ error: err.message });
    });
    mainDb.get('SELECT name FROM Tasks WHERE id = ?', [id], (err, row) => {
        mainDb.close();
        if (err) return res.status(500).json({ error: err.message });
        if (!row) {
            return res.status(404).json({ error: 'Task not found' });
        }
        const sanitized = sanitizeName(row.name);
        const taskDbPath = path.join(dataDir, `task_${id}_${sanitized}.db`);
        if (!fs.existsSync(taskDbPath)) {
            return res.status(404).json({ error: 'Task data not found' });
        }
        const db = new sqlite3.Database(taskDbPath, sqlite3.OPEN_READONLY, err => {
            if (err) return res.status(500).json({ error: err.message });
        });
        db.all(
            'SELECT wavelength, time_point, absorbance FROM Absorbance ORDER BY wavelength ASC, time_point ASC',
            [],
            (err, rows) => {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: err.message });
                }
                db.close();
                res.json(rows);
            }
        );
    });
});

// Create a new task
app.post('/api/tasks', (req, res) => {
    const { name, measurement_interval, wavelength_start, wavelength_end, wavelength_step } = req.body;
    
    if (!name || measurement_interval == null || 
        !wavelength_start || !wavelength_end || !wavelength_step) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Open main database
    const mainDb = new sqlite3.Database(path.join(__dirname, 'absorbanceDB.db'), err => {
        if (err) return res.status(500).json({ error: `Failed to open main database: ${err.message}` });
    });
    
    // Store wavelengths as JSON
    const wavelengths = JSON.stringify({
        start: wavelength_start,
        end: wavelength_end,
        step: wavelength_step
    });
    
    // Insert task in main database
    mainDb.run(
        `INSERT INTO Tasks (name, measurement_interval, wavelengths) VALUES (?, ?, ?)`,
        [name, measurement_interval, wavelengths],
        function(err) {
            if (err) {
                mainDb.close();
                return res.status(500).json({ error: `Failed to create task: ${err.message}` });
            }
            
            const taskId = this.lastID;
            
            // Generate filename for task's database
            const filename = generateFilename(taskId, name, {
                start: wavelength_start,
                end: wavelength_end,
                step: wavelength_step
            });
            
            const taskDbPath = path.join(dataDir, filename);
            
            // Create database with simple structure
            const taskDb = new sqlite3.Database(taskDbPath, err => {
                if (err) {
                    mainDb.close();
                    return res.status(500).json({ error: `Failed to create task database: ${err.message}` });
                }
                
                taskDb.serialize(() => {
                    taskDb.run(`
                        CREATE TABLE IF NOT EXISTS Absorbance (
                            wavelength INTEGER NOT NULL,
                            time_point INTEGER NOT NULL,
                            absorbance REAL NOT NULL,
                            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (wavelength, time_point)
                        )
                    `);
                    
                    taskDb.close(err => {
                        mainDb.close();
                        
                        if (err) {
                            return res.status(500).json({ error: `Failed to configure task database: ${err.message}` });
                        }
                        
                        // Return task info
                        res.status(201).json({
                            id: taskId,
                            task_id: taskId,
                            name: name,
                            task_name: name,
                            measurement_interval: measurement_interval,
                            wavelength_start: wavelength_start,
                            wavelength_end: wavelength_end,
                            wavelength_step: wavelength_step,
                            is_active: false
                        });
                    });
                });
            });
        }
    );
});

// Delete a task
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    
    // First deactivate if active
    workerManager.deactivateTask(id);
    
    // Open main database
    const mainDb = new sqlite3.Database(path.join(__dirname, 'absorbanceDB.db'), err => {
        if (err) return res.status(500).json({ error: `Failed to open main database: ${err.message}` });
    });
    
    // Get task info for filename
    mainDb.get(`SELECT name FROM Tasks WHERE id = ?`, [id], (err, row) => {
        if (err) {
            mainDb.close();
            return res.status(500).json({ error: `Database error: ${err.message}` });
        }
        
        if (!row) {
            mainDb.close();
            return res.status(404).json({ error: 'Task not found' });
        }
        
        // First delete related notes
        mainDb.run(`DELETE FROM Notes WHERE task_id = ?`, [id], function(err) {
            if (err) {
                mainDb.close();
                return res.status(500).json({ error: `Failed to delete task notes: ${err.message}` });
            }
            
            // Then delete the task itself
            mainDb.run(`DELETE FROM Tasks WHERE id = ?`, [id], function(err) {
                mainDb.close();
                
                if (err) {
                    return res.status(500).json({ error: `Failed to delete task: ${err.message}` });
                }
                
                // Try to delete task database file if it exists
                const taskDbPath = path.join(dataDir, `task_${id}_${sanitizeName(row.name)}.db`);
                
                if (fs.existsSync(taskDbPath)) {
                    fs.unlink(taskDbPath, err => {
                        if (err) {
                            console.error(`Warning: Failed to delete task database file: ${err.message}`);
                        }
                    });
                }
                
                res.json({ message: 'Task deleted successfully' });
            });
        });
    });
});

// Activate task
app.post('/api/tasks/:id/activate', (req, res) => {
    const { id } = req.params;
    
    // Open main database to get task info
    const db = new sqlite3.Database(path.join(__dirname, 'absorbanceDB.db'), sqlite3.OPEN_READONLY, err => {
        if (err) return res.status(500).json({ error: `Database error: ${err.message}` });
    });
    
    db.get(`SELECT id, name, measurement_interval FROM Tasks WHERE id = ?`, [id], (err, task) => {
        db.close();
        
        if (err) {
            return res.status(500).json({ error: `Database error: ${err.message}` });
        }
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        // Activate the task using the worker manager
        const result = workerManager.activateTask(id);
        
        if (result.success) {
            res.json({
                id: task.id,
                task_id: task.id,
                name: task.name,
                task_name: task.name,
                is_active: true,
                message: result.message,
                interval: task.measurement_interval
            });
        } else {
            res.status(500).json({ error: result.message });
        }
    });
});

// Deactivate task
app.post('/api/tasks/:id/deactivate', (req, res) => {
    const { id } = req.params;
    
    // Use the worker manager to deactivate
    const result = workerManager.deactivateTask(id);
    
    if (result.success) {
        res.json({
            id: id,
            task_id: id,
            name: id,
            task_name: id,
            is_active: false,
            message: result.message
        });
    } else {
        res.status(500).json({ error: result.message });
    }
});

// Get task status
app.get('/api/tasks/:id/status', (req, res) => {
    const { id } = req.params;
    
    // Check if task exists in database
    const db = new sqlite3.Database(path.join(__dirname, 'absorbanceDB.db'), sqlite3.OPEN_READONLY, err => {
        if (err) return res.status(500).json({ error: `Database error: ${err.message}` });
    });
    
    db.get(`SELECT id, name, measurement_interval FROM Tasks WHERE id = ?`, [id], (err, task) => {
        db.close();
        
        if (err) {
            return res.status(500).json({ error: `Database error: ${err.message}` });
        }
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        // Get status from worker manager
        const status = workerManager.getTaskStatus(id);
        
        res.json({
            id: task.id,
            task_id: task.id,
            name: task.name,
            task_name: task.name,
            is_active: status.active,
            measurement_interval: task.measurement_interval
        });
    });
});

// Get all active tasks
app.get('/api/tasks/active/all', (req, res) => {
    const activeTaskIds = workerManager.getAllActiveTaskIds();
    
    // If no active tasks, return empty array
    if (activeTaskIds.length === 0) {
        return res.json([]);
    }
    
    // Get details for active tasks from database
    const db = new sqlite3.Database(path.join(__dirname, 'absorbanceDB.db'), sqlite3.OPEN_READONLY, err => {
        if (err) return res.status(500).json({ error: `Database error: ${err.message}` });
    });
    
    // Create placeholders for SQL query (?, ?, ?)
    const placeholders = activeTaskIds.map(() => '?').join(',');
    
    db.all(
        `SELECT id, name, measurement_interval FROM Tasks WHERE id IN (${placeholders})`,
        activeTaskIds,
        (err, tasks) => {
            db.close();
            
            if (err) {
                return res.status(500).json({ error: `Database error: ${err.message}` });
            }
            
            // Add active status to each task
            const activeTasks = tasks.map(task => ({
                ...task,
                is_active: true
            }));
            
            res.json(activeTasks);
        }
    );
});

// Shutdown handler to terminate all workers
process.on('SIGINT', () => {
    console.log('Shutting down server, terminating all workers...');
    workerManager.terminateAllWorkers();
    process.exit(0);
});

// ***********************************************************
// IMPORTANT: Static file middleware comes AFTER all API routes
// ***********************************************************

// Serve static files from the master directory
app.use(express.static(path.join(__dirname, '../master')));

// Default route to serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../master/master.html'));
});

// Handle status toggle (activate/deactivate) via PUT
app.put('/api/tasks/:id/status', express.json(), async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    console.log(`Toggle task status request: Task ID=${id}, Set active=${is_active}`);

    if (typeof is_active !== 'boolean') {
        console.error(`Invalid is_active value: ${is_active}, type: ${typeof is_active}`);
        return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    try {
        let result;
        if (is_active) {
            console.log(`Activating task ${id}`);
            result = await workerManager.activateTask(id);
        } else {
            console.log(`Deactivating task ${id}`);
            result = await workerManager.deactivateTask(id);
        }

        console.log(`Task ${id} toggle result:`, result);

        if (!result.success) {
            console.error(`Worker operation failed for task ${id}: ${result.message}`);
            return res.status(500).json({ error: result.message });
        }

        // Get task info from database
        const db = new sqlite3.Database(path.join(__dirname, 'absorbanceDB.db'), sqlite3.OPEN_READONLY);
        
        try {
            const task = await new Promise((resolve, reject) => {
                db.get(`SELECT id, name, measurement_interval FROM Tasks WHERE id = ?`, [id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            db.close();
            
            if (!task) {
                console.error(`Task ${id} not found for status toggle`);
                return res.status(404).json({ error: 'Task not found' });
            }
            
            const response = {
                id: task.id,
                task_id: task.id,
                name: task.name,
                task_name: task.name,
                is_active: is_active,
                measurement_interval: task.measurement_interval,
                message: result.message
            };
            
            console.log(`Sending successful status toggle response for task ${id}`);
            return res.json(response);
        } catch (dbError) {
            db.close();
            console.error(`Database error for task ${id}: ${dbError.message}`);
            return res.status(500).json({ error: `Database error: ${dbError.message}` });
        }
    } catch (error) {
        console.error(`Error in status toggle for task ${id}: ${error.message}`);
        return res.status(500).json({ error: `Server error: ${error.message}` });
    }
});

// Get task status and latest data timestamp for status-check
app.get('/api/tasks/:id/status-check', (req, res) => {
    const { id } = req.params;
    // Check active status
    const status = workerManager.getTaskStatus(id);
    // Open main DB to get measurement interval and task name/wavelengths
    const mainDb = new sqlite3.Database(mainDbPath, sqlite3.OPEN_READONLY, err => {
        if (err) return res.status(500).json({ error: err.message });
    });
    mainDb.get('SELECT name, measurement_interval, wavelengths FROM Tasks WHERE id = ?', [id], (err, task) => {
        mainDb.close();
        if (err) return res.status(500).json({ error: err.message });
        if (!task) return res.status(404).json({ error: 'Task not found' });
        const interval = task.measurement_interval;
        // Parse wavelengths and build filename
        let wl = { start: 0, end: 0, step: 0 };
        try { wl = JSON.parse(task.wavelengths); } catch {}
        const filename = generateFilename(id, task.name, wl);
        const taskDbPath = path.join(dataDir, filename);
        if (!fs.existsSync(taskDbPath)) {
            return res.json({ isActive: status.active, measurementInterval: interval, lastDataTime: null, timeSinceUpdate: null });
        }
        const taskDb = new sqlite3.Database(taskDbPath, sqlite3.OPEN_READONLY, err => {
            if (err) return res.status(500).json({ error: err.message });
        });
        // Get most recent timestamp
        taskDb.get('SELECT timestamp FROM Absorbance ORDER BY timestamp DESC LIMIT 1', [], (err2, row) => {
            taskDb.close();
            if (err2) return res.status(500).json({ error: err2.message });
            const lastDataTime = row ? row.timestamp : null;
            let timeSinceUpdate = null;
            if (lastDataTime) {
                timeSinceUpdate = (Date.now() - new Date(lastDataTime).getTime()) / 60000;
            }
            return res.json({ isActive: status.active, measurementInterval: interval, lastDataTime, timeSinceUpdate });
        });
    });
});

// Get notes for a specific task
app.get('/api/tasks/:id/notes', (req, res) => {
    const { id } = req.params;
    console.log(`Fetching notes for task ${id}`);
    
    // Validate the task ID
    if (!id || isNaN(parseInt(id))) {
        console.error(`Invalid task ID: ${id}`);
        return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    // First check if the task exists
    const checkDb = new sqlite3.Database(path.join(__dirname, 'absorbanceDB.db'), sqlite3.OPEN_READONLY);
    
    checkDb.get('SELECT id FROM Tasks WHERE id = ?', [id], (err, task) => {
        checkDb.close();
        
        if (err) {
            console.error(`Database error checking task existence: ${err.message}`);
            return res.status(500).json({ error: `Database error: ${err.message}` });
        }
        
        if (!task) {
            console.error(`Task not found: ${id}`);
            return res.status(404).json({ error: 'Task not found' });
        }
        
        // Now get the notes
        const db = new sqlite3.Database(path.join(__dirname, 'absorbanceDB.db'), sqlite3.OPEN_READONLY);
        
        db.all(`SELECT * FROM Notes WHERE task_id = ? ORDER BY created_at DESC`, [id], (err, notes) => {
            db.close();
            
            if (err) {
                console.error(`Error fetching notes for task ${id}: ${err.message}`);
                return res.status(500).json({ error: `Database error: ${err.message}` });
            }
            
            console.log(`Successfully retrieved ${notes ? notes.length : 0} notes for task ${id}`);
            res.json(notes || []);
        });
    });
});

// Create a new note
app.post('/api/notes', express.json(), (req, res) => {
    const { task_id, content } = req.body;
    console.log(`Creating new note for task ${task_id}`);
    
    // Validate required fields
    if (!task_id || !content) {
        console.error('Missing required fields for note creation');
        return res.status(400).json({ error: 'task_id and content are required' });
    }
    
    // Validate task_id is a number
    if (isNaN(parseInt(task_id))) {
        console.error(`Invalid task_id: ${task_id}`);
        return res.status(400).json({ error: 'task_id must be a number' });
    }
    
    // Validate content length
    if (content.length < 1 || content.length > 10000) {
        console.error(`Invalid content length: ${content.length}`);
        return res.status(400).json({ error: 'Content must be between 1 and 10000 characters' });
    }
    
    const db = new sqlite3.Database(path.join(__dirname, 'absorbanceDB.db'));
    
    // Ensure foreign keys are enabled
    db.run('PRAGMA foreign_keys = ON');
    
    // Check if task exists
    db.get(`SELECT id FROM Tasks WHERE id = ?`, [task_id], (err, task) => {
        if (err) {
            db.close();
            console.error(`Error checking task existence for note creation: ${err.message}`);
            return res.status(500).json({ error: `Database error: ${err.message}` });
        }
        
        if (!task) {
            db.close();
            console.error(`Task not found for note creation: ${task_id}`);
            return res.status(404).json({ error: 'Task not found' });
        }
        
        // Insert the note
        db.run(
            `INSERT INTO Notes (task_id, content) VALUES (?, ?)`,
            [task_id, content],
            function(err) {
                if (err) {
                    db.close();
                    console.error(`Error inserting note: ${err.message}`);
                    return res.status(500).json({ error: `Database error: ${err.message}` });
                }
                
                const noteId = this.lastID;
                
                // Get the created note
                db.get(`SELECT * FROM Notes WHERE id = ?`, [noteId], (err, note) => {
                    db.close();
                    
                    if (err) {
                        console.error(`Error retrieving created note: ${err.message}`);
                        return res.status(500).json({ error: `Database error: ${err.message}` });
                    }
                    
                    if (!note) {
                        console.error(`Could not find newly created note with ID: ${noteId}`);
                        return res.status(500).json({ error: 'Failed to retrieve created note' });
                    }
                    
                    console.log(`Note created successfully: ID ${noteId}`);
                    res.status(201).json(note);
                });
            }
        );
    });
});

// Update a note
app.put('/api/notes/:id', express.json(), (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    console.log(`Updating note ${id}`);
    
    // Validate ID
    if (!id || isNaN(parseInt(id))) {
        console.error(`Invalid note ID: ${id}`);
        return res.status(400).json({ error: 'Invalid note ID' });
    }
    
    // Validate content
    if (!content) {
        console.error('Missing content for note update');
        return res.status(400).json({ error: 'content is required' });
    }
    
    // Validate content length
    if (content.length < 1 || content.length > 10000) {
        console.error(`Invalid content length: ${content.length}`);
        return res.status(400).json({ error: 'Content must be between 1 and 10000 characters' });
    }
    
    const db = new sqlite3.Database(path.join(__dirname, 'absorbanceDB.db'));
    
    // First check if the note exists
    db.get(`SELECT id FROM Notes WHERE id = ?`, [id], (err, note) => {
        if (err) {
            db.close();
            console.error(`Error checking note existence: ${err.message}`);
            return res.status(500).json({ error: `Database error: ${err.message}` });
        }
        
        if (!note) {
            db.close();
            console.error(`Note not found for update: ${id}`);
            return res.status(404).json({ error: 'Note not found' });
        }
        
        // Update the note
        db.run(
            `UPDATE Notes SET content = ? WHERE id = ?`,
            [content, id],
            function(err) {
                if (err) {
                    db.close();
                    console.error(`Error updating note ${id}: ${err.message}`);
                    return res.status(500).json({ error: `Database error: ${err.message}` });
                }
                
                // Get the updated note
                db.get(`SELECT * FROM Notes WHERE id = ?`, [id], (err, updatedNote) => {
                    db.close();
                    
                    if (err) {
                        console.error(`Error retrieving updated note ${id}: ${err.message}`);
                        return res.status(500).json({ error: `Database error: ${err.message}` });
                    }
                    
                    if (!updatedNote) {
                        console.error(`Could not find updated note: ${id}`);
                        return res.status(500).json({ error: 'Failed to retrieve updated note' });
                    }
                    
                    console.log(`Note ${id} updated successfully`);
                    res.json(updatedNote);
                });
            }
        );
    });
});

// Delete a note
app.delete('/api/notes/:id', (req, res) => {
    const { id } = req.params;
    console.log(`Deleting note ${id}`);
    
    // Validate ID
    if (!id || isNaN(parseInt(id))) {
        console.error(`Invalid note ID: ${id}`);
        return res.status(400).json({ error: 'Invalid note ID' });
    }
    
    const db = new sqlite3.Database(path.join(__dirname, 'absorbanceDB.db'));
    
    // First check if the note exists
    db.get(`SELECT id FROM Notes WHERE id = ?`, [id], (err, note) => {
        if (err) {
            db.close();
            console.error(`Error checking note existence for deletion: ${err.message}`);
            return res.status(500).json({ error: `Database error: ${err.message}` });
        }
        
        if (!note) {
            db.close();
            console.error(`Note not found for deletion: ${id}`);
            return res.status(404).json({ error: 'Note not found' });
        }
        
        // Delete the note
        db.run(
            `DELETE FROM Notes WHERE id = ?`,
            [id],
            function(err) {
                db.close();
                
                if (err) {
                    console.error(`Error deleting note ${id}: ${err.message}`);
                    return res.status(500).json({ error: `Database error: ${err.message}` });
                }
                
                console.log(`Note ${id} deleted successfully`);
                res.status(204).send();
            }
        );
    });
});

// Add a new dedicated endpoint for checking if a task is running
app.get('/api/tasks/:id/is-running', (req, res) => {
    const { id } = req.params;
    console.log(`Checking if task ${id} is running via direct worker manager check`);
    
    try {
        // Get the worker status directly from the worker manager
        const status = workerManager.getTaskStatus(id);
        
        // Ensure proper JSON content type
        res.setHeader('Content-Type', 'application/json');
        
        // Return a simple clear response with just the running state
        res.json({
            taskId: id,
            isRunning: status.active,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Error checking if task ${id} is running:`, error);
        
        // Ensure proper JSON content type even for errors
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({
            error: `Failed to check task status: ${error.message}`,
            isRunning: false
        });
    }
});

// Add a robust status check endpoint with detailed information
app.get('/api/tasks/:id/status-check', (req, res) => {
    const { id } = req.params;
    console.log(`Robust status check for task ${id}`);
    
    // Always set proper JSON content type
    res.setHeader('Content-Type', 'application/json');
    
    try {
        // First, check if task exists and get its basic info
        const db = new sqlite3.Database(path.join(__dirname, 'absorbanceDB.db'), sqlite3.OPEN_READONLY, err => {
            if (err) {
                console.error(`Database error during status check: ${err.message}`);
                return res.status(500).json({ 
                    error: `Database error: ${err.message}`,
                    isActive: false
                });
            }
            
            db.get(`SELECT id, name, measurement_interval FROM Tasks WHERE id = ?`, [id], (err, task) => {
                if (err) {
                    db.close();
                    console.error(`Query error during status check: ${err.message}`);
                    return res.status(500).json({ 
                        error: `Database error: ${err.message}`,
                        isActive: false
                    });
                }
                
                if (!task) {
                    db.close();
                    console.error(`Task ${id} not found during status check`);
                    return res.status(404).json({ 
                        error: 'Task not found',
                        isActive: false
                    });
                }
                
                // Get the active status from worker manager
                const status = workerManager.getTaskStatus(id);
                
                // Get the last data point timestamp
                db.get(
                    `SELECT MAX(timestamp) as lastDataTime FROM TaskData WHERE task_id = ?`,
                    [id],
                    (err, dataResult) => {
                        db.close();
                        
                        if (err) {
                            console.error(`Data query error: ${err.message}`);
                            // Continue with what we know
                        }
                        
                        // Combine all information
                        res.json({
                            taskId: id,
                            taskName: task.name,
                            isActive: status.active,
                            measurementInterval: task.measurement_interval,
                            lastDataTime: dataResult ? dataResult.lastDataTime : null,
                            timestamp: new Date().toISOString()
                        });
                    }
                );
            });
        });
    } catch (error) {
        console.error(`Unhandled error in status check: ${error.message}`);
        res.status(500).json({
            error: `Server error: ${error.message}`,
            isActive: false
        });
    }
});

// Fallback route for any other request
app.use('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../master/master.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Server is listening on all network interfaces (0.0.0.0:${PORT})`);
    console.log(`Visit http://localhost:${PORT} to access the application locally`);
    console.log(`From other computers, use http://SERVER_IP_ADDRESS:${PORT}`);
}); 