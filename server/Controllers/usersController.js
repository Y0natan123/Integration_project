const express = require('express');
const router = express.Router();
const userBLL = require('../models/userBLL');

// Register route
router.post('/register', async (req, res) => {
    try {
        const { email, password, birthday } = req.body;
        
        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user already exists
        const existingUser = await userBLL.getUsersEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create new user
        const newUser = await userBLL.createUser({
            email,
            password,
            admin: 0, // Default to non-admin
            birthday: birthday || null
        });

        res.status(201).json({
            success: true,
            user: {
                email: newUser.email,
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
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Get user by email
        const user = await userBLL.getUsersEmail(email);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Login successful
        res.json({
            success: true,
            user: {
                email: user.email,
                admin: user.admin === 1
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 