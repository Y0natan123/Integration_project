const { default: fetch } = require('node-fetch');

async function testNote() {
    try {
        console.log('Testing note creation for Task 1, Run 0...');
        
        const response = await fetch('http://localhost:8001/api/tasks/1/runs/0/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: 'Test note for real collectDB data - Run 0 of Blue Light Absorption task'
            })
        });
        
        if (response.ok) {
            const note = await response.json();
            console.log('✓ Note created successfully:', note);
            
            // Now test retrieving the note
            console.log('\nTesting note retrieval...');
            const getResponse = await fetch('http://localhost:8001/api/tasks/1/runs/0/notes');
            const notes = await getResponse.json();
            console.log('✓ Notes retrieved:', notes);
            
        } else {
            const error = await response.text();
            console.error('✗ Error creating note:', error);
        }
        
    } catch (error) {
        console.error('✗ Error:', error.message);
    }
}

testNote(); 