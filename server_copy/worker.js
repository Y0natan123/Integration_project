const { parentPort, workerData } = require('worker_threads');
const { spawn } = require('child_process');
const path = require('path');

// Get task data from worker creation
const { taskId, intervalSeconds } = workerData;

// Flag to track if we should continue running
let isRunning = true;

// Log startup information
console.log(`[Worker] Started data collection worker for task ${taskId}`);
console.log(`[Worker] Collection interval: ${intervalSeconds} seconds`);

// Function to run the data collection script
async function runDataCollection() {
    return new Promise((resolve, reject) => {
        // Get the correct path to the refactored Python script
        const scriptPath = path.join(__dirname, 'collectDB', 'scripts', 'collect_data_refactored.py');


        // Arguments depend on which script we're using
        let args;
        if (scriptPath.includes('collect_data_refactored.py')) {
            // Refactored script for real spectrophotometer (remove --mock)
            args = [scriptPath, taskId];
        } else {
            // Original script only takes task_id
            args = [scriptPath, taskId];
        }
        
        console.log(`[Worker] Running: python ${args.join(' ')}`);
        
        const pythonProcess = spawn('python', args);
        // ... rest of your existing code
   
        
        let stdout = '';
        let stderr = '';
        
        // Collect output
        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        // Handle process completion
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`[Worker] Data collection successful for task ${taskId}`);
                parentPort.postMessage({ type: 'log', message: `Data collection successful for task ${taskId}` });
                resolve(stdout);
            } else {
                console.error(`[Worker] Data collection failed for task ${taskId} with code ${code}`);
                console.error(`[Worker] Error: ${stderr}`);
                parentPort.postMessage({ 
                    type: 'error', 
                    message: `Data collection failed for task ${taskId}: ${stderr}` 
                });
                reject(new Error(`Process exited with code ${code}: ${stderr}`));
            }
        });
    });
}

// Function to run collection at the specified interval
async function startCollection() {
    // Run immediately once
    try {
        await runDataCollection();
    } catch (error) {
        console.error(`[Worker] Initial collection error:`, error);
    }
    
    // Set up the interval for subsequent collections
    const intervalId = setInterval(async () => {
        if (!isRunning) {
            clearInterval(intervalId);
            parentPort.postMessage({ type: 'terminated', taskId });
            return;
        }
        
        try {
            await runDataCollection();
        } catch (error) {
            console.error(`[Worker] Collection error:`, error);
        }
    }, intervalSeconds * 1000);
}

// Listen for messages from the parent
parentPort.on('message', (message) => {
    if (message === 'stop') {
        console.log(`[Worker] Stopping data collection for task ${taskId}`);
        isRunning = false;
    }
});

// Start the collection process
startCollection().catch(error => {
    console.error(`[Worker] Failed to start collection:`, error);
    parentPort.postMessage({ type: 'error', message: `Failed to start collection: ${error.message}` });
}); 