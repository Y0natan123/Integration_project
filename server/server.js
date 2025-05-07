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
const PORT = 8000;

// Ensure data directory exists for per-task DBs
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Middleware
app.use(cors());
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

// Initialize main database and ensure Tasks table exists
const mainDbPath = path.join(__dirname, 'absorbanceDB.db');
const mainDb = new sqlite3.Database(mainDbPath, (err) => {
    if (err) {
        console.error('Failed to open main database for initialization:', err.message);
    } else {
        mainDb.run(`
            CREATE TABLE IF NOT EXISTS Tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                measurement_interval INTEGER NOT NULL,
                wavelengths TEXT NOT NULL
            )
        `, (err) => {
            if (err) console.error('Failed to create Tasks table:', err.message);
            mainDb.close();
        });
    }
});

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
        
        // Delete from main database
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
app.put('/api/tasks/:id/status', express.json(), (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    let result;
    if (is_active) {
        result = workerManager.activateTask(id);
    } else {
        result = workerManager.deactivateTask(id);
    }

    if (result.success) {
        return res.json({ id: id, is_active: is_active, message: result.message });
    } else {
        return res.status(500).json({ error: result.message });
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

// Fallback route for any other request
app.use('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../master/master.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
}); 