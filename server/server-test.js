// Server test utility
const os = require('os');

// Get all network interfaces
const interfaces = os.networkInterfaces();
const addresses = [];

// Collect all IPv4 addresses
Object.keys(interfaces).forEach(name => {
  interfaces[name].forEach(iface => {
    // Skip internal, non-IPv4 addresses
    if (iface.family === 'IPv4' && !iface.internal) {
      addresses.push(iface.address);
    }
  });
});

console.log('===================================');
console.log('SERVER ACCESSIBILITY TEST');
console.log('===================================');
console.log('\nNetwork interfaces detected:');if (addresses.length === 0) {  console.log('- No external network interfaces found');} else {  addresses.forEach(addr => {    console.log(`- ${addr}`);  });}

console.log('\nServer should be accessible at:');
console.log('- http://localhost:8000 (from this machine)');

addresses.forEach(addr => {
  console.log(`- http://${addr}:8000 (from other devices on the network)`);
});

console.log('\nTo test server accessibility:');
console.log('1. From this machine: open http://localhost:8000 in a browser');
console.log('2. From another device: open any of the URLs listed above');
console.log('3. Or try using command line: curl http://localhost:8000/users');

console.log('\nIf your server is not accessible from other devices, ensure:');
console.log('- Server is configured to listen on 0.0.0.0 (all interfaces)');
console.log('- No firewall is blocking port 8000');
console.log('- CORS is properly configured for cross-origin requests');
console.log('==================================='); 