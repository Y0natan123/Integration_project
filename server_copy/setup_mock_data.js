const sqlite3 = require('sqlite3');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up mock data integration...');

const mainDb = new sqlite3.Database('absorbanceDB.db');

// First, let's add our mock tasks to the main database
const mockTasks = [
    {
        id: 1,
        name: 'Mock Task 1',
        measurement_interval: 5,
        wavelengths: JSON.stringify({start: 400, end: 700, step: 10})
    },
    {
        id: 2,
        name: 'Mock Task 2',
        measurement_interval: 3,
        wavelengths: JSON.stringify({start: 400, end: 700, step: 10})
    },
    {
        id: 3,
        name: 'Mock Task 3',
        measurement_interval: 2,
        wavelengths: JSON.stringify({start: 400, end: 700, step: 10})
    }
];

function sanitizeName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, '');
}

function setupMockTasks() {
    console.log('📝 Setting up mock tasks in main database...');
    
    // First, clear existing tasks to avoid conflicts
    mainDb.run("DELETE FROM Tasks WHERE name LIKE 'Mock Task%'", (err) => {
        if (err) {
            console.error('❌ Error clearing old mock tasks:', err);
            return;
        }
        
        // Insert new mock tasks
        const stmt = mainDb.prepare("INSERT OR REPLACE INTO Tasks (id, name, measurement_interval, wavelengths) VALUES (?, ?, ?, ?)");
        
        mockTasks.forEach(task => {
            stmt.run(task.id, task.name, task.measurement_interval, task.wavelengths, function(err) {
                if (err) {
                    console.error(`❌ Error inserting task ${task.id}:`, err);
                } else {
                    console.log(`✅ Added task ${task.id}: ${task.name}`);
                }
            });
        });
        
        stmt.finalize((err) => {
            if (err) {
                console.error('❌ Error finalizing statement:', err);
            } else {
                console.log('🎉 Mock tasks added to main database!');
                copyMockDataFiles();
            }
        });
    });
}

function copyMockDataFiles() {
    console.log('📁 Setting up mock data files...');
    
    const sourceDir = '../collectDB/data';
    const targetDir = './collectDB/data';
    
    // Ensure target directory exists
    if (!fs.existsSync('./collectDB')) {
        fs.mkdirSync('./collectDB');
    }
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir);
    }
    
    // Copy mock data files if they exist
    if (fs.existsSync(sourceDir)) {
        const files = fs.readdirSync(sourceDir);
        console.log(`📋 Found ${files.length} data files to copy:`);
        
        files.forEach(file => {
            if (file.endsWith('.db')) {
                const sourcePath = path.join(sourceDir, file);
                const targetPath = path.join(targetDir, file);
                
                try {
                    fs.copyFileSync(sourcePath, targetPath);
                    console.log(`✅ Copied ${file}`);
                } catch (err) {
                    console.error(`❌ Error copying ${file}:`, err);
                }
            }
        });
        
        console.log('🎉 Mock data files copied successfully!');
    } else {
        console.log('⚠️ Source data directory not found, creating empty data directory');
    }
    
    mainDb.close();
    console.log('✅ Mock data setup complete!');
    console.log('🚀 You can now start the server and access the graphs!');
}

// Start the setup process
setupMockTasks(); 