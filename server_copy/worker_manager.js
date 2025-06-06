const { Worker } = require('worker_threads');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Store active workers
const activeWorkers = new Map();

// Get the main database path
const DB_PATH = path.join(__dirname, 'absorbanceDB.db');

// Function to get task information
function getTaskInfo(taskId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                return reject(new Error(`Failed to connect to database: ${err.message}`));
            }
            
            const query = `SELECT id, name, wavelengths, measurement_interval FROM Tasks WHERE id = ?`;
            
            db.get(query, [taskId], (err, row) => {
                db.close();
                
                if (err) {
                    return reject(new Error(`Failed to query task: ${err.message}`));
                }
                
                if (!row) {
                    return reject(new Error(`Task with ID ${taskId} not found`));
                }
                
                resolve(row);
            });
        });
    });
}

// Function to activate a task (start data collection)
async function activateTask(taskId) {
    console.log(`[Manager] Activating task ${taskId}`);
    
    try {
        // Check if worker is already running
        if (activeWorkers.has(taskId)) {
            console.log(`[Manager] Task ${taskId} is already active`);
            return { success: true, message: `Task ${taskId} is already active` };
        }
        
        try {
            // Get task information
            const taskInfo = await getTaskInfo(taskId);
            
            // Convert measurement_interval from minutes to seconds
            const intervalSeconds = (taskInfo.measurement_interval || 1) * 60;
            
            try {
                // Create a new worker thread
                const worker = new Worker(path.join(__dirname, 'worker.js'), {
                    workerData: {
                        taskId: taskId,
                        intervalSeconds: intervalSeconds
                    }
                });
                
                // Set up event handlers
                worker.on('message', (message) => {
                    console.log(`[Manager] Worker message from task ${taskId}:`, message);
                });
                
                worker.on('error', (error) => {
                    console.error(`[Manager] Worker error from task ${taskId}:`, error);
                    activeWorkers.delete(taskId);
                });
                
                worker.on('exit', (code) => {
                    console.log(`[Manager] Worker for task ${taskId} exited with code ${code}`);
                    activeWorkers.delete(taskId);
                });
                
                // Store the worker
                activeWorkers.set(taskId, worker);
                
                console.log(`[Manager] Task ${taskId} activated successfully`);
                return { 
                    success: true, 
                    message: `Task ${taskId} activated successfully`,
                    interval: taskInfo.measurement_interval 
                };
            } catch (workerError) {
                console.error(`[Manager] Failed to create worker for task ${taskId}:`, workerError);
                return { success: false, message: `Failed to create worker: ${workerError.message}` };
            }
        } catch (taskInfoError) {
            console.error(`[Manager] Failed to get task information for ${taskId}:`, taskInfoError);
            return { success: false, message: `Failed to get task information: ${taskInfoError.message}` };
        }
    } catch (error) {
        console.error(`[Manager] Unhandled error activating task ${taskId}:`, error);
        return { success: false, message: `Failed to activate task: ${error.message || 'Unknown error'}` };
    }
}

// Function to deactivate a task (stop data collection)
function deactivateTask(taskId) {
    console.log(`[Manager] Deactivating task ${taskId}`);
    
    try {
        if (!activeWorkers.has(taskId)) {
            console.log(`[Manager] Task ${taskId} is not active`);
            return { success: true, message: `Task ${taskId} is not active` };
        }
        
        try {
            const worker = activeWorkers.get(taskId);
            
            // Send stop message to worker
            worker.postMessage('stop');
            
            // IMPORTANT: Immediately remove from activeWorkers to avoid race conditions
            // This ensures any status check immediately after deactivation shows inactive
            activeWorkers.delete(taskId);
            
            console.log(`[Manager] Task ${taskId} deactivated and removed from active list`);
            return { success: true, message: `Task ${taskId} deactivated successfully` };
        } catch (workerError) {
            console.error(`[Manager] Error communicating with worker for task ${taskId}:`, workerError);
            // Remove the worker from active list even if there was an error
            activeWorkers.delete(taskId);
            return { success: false, message: `Failed to communicate with worker: ${workerError.message}` };
        }
    } catch (error) {
        console.error(`[Manager] Unhandled error deactivating task ${taskId}:`, error);
        return { success: false, message: `Failed to deactivate task: ${error.message || 'Unknown error'}` };
    }
}

// Function to terminate all workers (for server shutdown)
function terminateAllWorkers() {
    console.log(`[Manager] Terminating all workers`);
    
    for (const [taskId, worker] of activeWorkers.entries()) {
        try {
            worker.postMessage('stop');
            console.log(`[Manager] Terminated worker for task ${taskId}`);
        } catch (error) {
            console.error(`[Manager] Failed to terminate worker for task ${taskId}:`, error);
        }
    }
}

// Function to get task status
function getTaskStatus(taskId) {
    const isActive = activeWorkers.has(taskId);
    return { 
        taskId, 
        active: isActive 
    };
}

// Function to get all active tasks
function getAllActiveTaskIds() {
    return Array.from(activeWorkers.keys());
}

// Export the functions
module.exports = {
    activateTask,
    deactivateTask,
    getTaskStatus,
    getAllActiveTaskIds,
    terminateAllWorkers
}; 