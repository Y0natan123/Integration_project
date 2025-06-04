// Start server with external accessibility settings
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

// Get network interfaces
const interfaces = os.networkInterfaces();
const addresses = [];

// Find all non-internal IPv4 addresses
Object.keys(interfaces).forEach(name => {
  interfaces[name].forEach(iface => {
    if (iface.family === 'IPv4' && !iface.internal) {
      addresses.push(iface.address);
    }
  });
});

// Show server access information
console.log('Starting server with external access enabled...');
console.log('Server will be accessible at:');
console.log('- http://localhost:8000 (from this computer)');
addresses.forEach(addr => {
  console.log(`- http://${addr}:8000 (from other devices on the network)`);
});

// Set environment variables for the server
const env = {
  ...process.env,
  NODE_ENV: 'production'
};

// Launch the server process
const serverProcess = spawn('node', ['server.js'], { 
  env,
  cwd: __dirname,
  stdio: 'inherit'
});

// Handle server process events
serverProcess.on('error', (err) => {
  console.error('Failed to start server:', err);
});

serverProcess.on('close', (code) => {
  if (code !== 0) {
    console.log(`Server process exited with code ${code}`);
  }
});

// Log instructions for stopping the server
console.log('\nPress Ctrl+C to stop the server...'); 