const express = require('express');
const router = express.Router();
const userBLL = require('../models/userBLL');

// Get user by name route
router.get('/:name', async (req, res) => {
    try {
        const name = req.params.name;
        const user = await userBLL.getUserByName(name);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register route
router.post('/register', async (req, res) => {
    try {
        const { email, password, birthday } = req.body;
        // We use email parameter for backward compatibility but store it as name
        const name = email;
        
        // Validate required fields
        if (!name || !password) {
            return res.status(400).json({ error: 'Name and password are required' });
        }

        // Check if user already exists
        const existingUser = await userBLL.getUserByName(name);
        if (existingUser) {
            return res.status(400).json({ error: 'Name already registered' });
        }

        // Create new user
        const newUser = await userBLL.createUser({
            name,
            password,
            admin: 0, // Default to non-admin
            birthday: birthday || null
        });

        res.status(201).json({
            success: true,
            user: {
                name: newUser.name,
                admin: newUser.admin === 1
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // We use email parameter for backward compatibility but process it as name
        const name = email;
        
        if (!name || !password) {
            return res.status(400).json({ error: 'Name and password are required' });
        }

        // Get user by name
        const user = await userBLL.getUserByName(name);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid name or password' });
        }

        // Check password
        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid name or password' });
        }

        // Login successful
        res.json({
            success: true,
            user: {
                name: user.name,
                admin: user.admin === 1
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user route
router.put('/update/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { email, password, currentEmail, currentPassword } = req.body;
        
        // Convert email parameters to name for internal use
        const name = email;
        const currentName = currentEmail;
        
        // Validate that at least one field to update was provided
        if (!name && !password) {
            return res.status(400).json({ error: 'At least one field (name or password) is required' });
        }
        
        // Verify the user exists and credentials match
        const user = await userBLL.getUserByName(currentName);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify current password
        if (user.password !== currentPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Check if the new name already exists (if changing name)
        if (name && name !== currentName) {
            const existingUser = await userBLL.getUserByName(name);
            if (existingUser) {
                return res.status(400).json({ error: 'Name already in use' });
            }
        }
        
        // Update user
        const result = await userBLL.updateUser(userId, { name, password });
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found or no changes were made' });
        }
        
        res.json({
            success: true,
            message: 'User information updated successfully'
        });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 