const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function testDataCollectionPath() {
    console.log('Testing data collection path for Task 1...');
    
    // Before running: check what files exist
    const collectDbPath = path.join(__dirname, 'collectDB', 'data');
    const legacyDataPath = path.join(__dirname, 'data');
    
    console.log('\nBefore test:');
    console.log('collectDB/data files:', fs.readdirSync(collectDbPath).filter(f => f.includes('task_1')));
    console.log('legacy data files:', fs.existsSync(legacyDataPath) ? fs.readdirSync(legacyDataPath).filter(f => f.includes('task_1')) : []);
    
    // Run mock data collection for Task 1
    const scriptPath = path.join(__dirname, 'mock_collect_data.py');
    console.log(`\nRunning: python ${scriptPath} 1`);
    
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [scriptPath, '1']);
        
        let stdout = '';
        let stderr = '';
        
        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
            console.log(`\nCollection completed with code: ${code}`);
            
            if (stdout) console.log('Output:', stdout);
            if (stderr) console.log('Errors:', stderr);
            
            // After running: check what files exist
            console.log('\nAfter test:');
            console.log('collectDB/data files:', fs.readdirSync(collectDbPath).filter(f => f.includes('task_1')));
            console.log('legacy data files:', fs.existsSync(legacyDataPath) ? fs.readdirSync(legacyDataPath).filter(f => f.includes('task_1')) : []);
            
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(`Process exited with code ${code}: ${stderr}`));
            }
        });
    });
}

testDataCollectionPath().catch(error => {
    console.error('Test failed:', error);
}); 