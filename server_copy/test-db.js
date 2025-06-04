// Simple test script to verify database connectivity
const userBLL = require('./models/userBLL');

async function testDatabase() {
    console.log('\n----- Database Connection Test -----\n');
    
    try {
        // Test getting admin user
        console.log('Testing getUserByName("admin")');
        const admin = await userBLL.getUserByName('admin');
        console.log('Result:', admin ? 'Found admin user' : 'Admin user not found');
        
        if (admin) {
            console.log(`Admin ID: ${admin.id}, Admin status: ${admin.admin === 1 ? 'Yes' : 'No'}`);
        }
        
        // Test getting all users
        console.log('\nTesting getAllUsers()');
        const users = await userBLL.getAllUsers();
        console.log(`Found ${users.length} users in the database`);
        
        users.forEach((user, index) => {
            console.log(`User ${index + 1}: ID=${user.id}, Name=${user.name}, Admin=${user.admin === 1 ? 'Yes' : 'No'}`);
        });
        
        console.log('\nDatabase tests completed successfully.');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testDatabase(); 