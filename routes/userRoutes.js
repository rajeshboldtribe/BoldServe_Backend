const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const userController = require('../controllers/userController');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');

// Add debugging log
router.use((req, res, next) => {
    console.log('User Route accessed:', req.method, req.url);
    next();
});

// Admin routes
router.get('/admin/dashboard/stats', adminAuth, async (req, res) => {
    try {
        // Get total users count
        const totalUsers = await userController.getTotalUsers();
        
        res.json({
            success: true,
            totalUsers: totalUsers
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching user statistics',
            error: error.message 
        });
    }
});

// Add a route to get all users count
router.get('/users/count', adminAuth, async (req, res) => {
    try {
        const totalUsers = await userController.getTotalUsers();
        res.json({ success: true, count: totalUsers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Public routes (no auth required)
router.post('/login', userController.loginUser);
router.get('/login', userController.loginUser);
router.post('/register', userController.createUser);
router.get('/verify', userController.verifyUser);

// Protected routes that require admin access
router.get('/', adminAuth, userController.getUsers);
router.get('/check-user/:id', adminAuth, userController.checkUserExists);
router.get('/check-user', adminAuth, userController.checkUserExists);

// Regular user routes
router.get('/profile', auth, async (req, res) => {
    try {
        console.log('Profile request for user ID:', req.user.id); // Debug log

        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const user = await User.findById(req.user.id)
            .select('-password')
            .lean(); // Use lean() for better performance

        console.log('Found user:', user); // Debug log

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                _id: user._id,
                fullName: user.fullName || '',
                email: user.email || '',
                mobile: user.mobile || '',
                address: user.address || '',
                bio: user.bio || '',
                // Add any other fields you need
            }
        });
    } catch (error) {
        console.error('Error in profile route:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: error.message
        });
    }
});

// Add this route to debug token issues
router.get('/debug-token', async (req, res) => {
    const authHeader = req.headers.authorization;
    console.log('Debug Token Header:', authHeader);
    
    try {
        if (!authHeader) {
            return res.status(401).json({ message: 'No authorization header' });
        }

        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ 
            valid: true, 
            decoded,
            originalHeader: authHeader
        });
    } catch (error) {
        res.status(401).json({ 
            valid: false, 
            error: error.message,
            originalHeader: authHeader
        });
    }
});

// Add this route if it doesn't exist
router.get('/count', async (req, res) => {
    try {
        const count = await User.countDocuments({ isAdmin: false }); // Count only non-admin users
        res.json({ 
            success: true, 
            count: count 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Get all users
router.get('/', async (req, res) => {
    try {
        const users = await User.find({});
        res.json({ 
            success: true, 
            data: users 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Update profile
router.post('/update-profile', auth, async (req, res) => {
    try {
        const { email, address, bio } = req.body;
        const userId = req.user.id;

        console.log('Received update request:', {
            userId,
            requestBody: req.body
        });

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create update object with only provided fields
        const updateFields = {};

        // Only check and update email if it's provided and different
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ 
                email, 
                _id: { $ne: userId } 
            });
            
            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
            updateFields.email = email;
        }

        // Update address and bio if provided
        if (address !== undefined) updateFields.address = address;
        if (bio !== undefined) updateFields.bio = bio;

        console.log('Updating fields:', updateFields);

        // Only update if there are changes
        if (Object.keys(updateFields).length > 0) {
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updateFields },
                { 
                    new: true,
                    runValidators: true 
                }
            ).select('-password');

            console.log('User updated successfully:', updatedUser);

            return res.json({
                success: true,
                message: 'Profile updated successfully',
                user: {
                    _id: updatedUser._id,
                    fullName: updatedUser.fullName,
                    email: updatedUser.email,
                    mobile: updatedUser.mobile,
                    address: updatedUser.address,
                    bio: updatedUser.bio
                }
            });
        } else {
            // No fields to update
            return res.json({
                success: true,
                message: 'No changes to update',
                user: {
                    _id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    mobile: user.mobile,
                    address: user.address,
                    bio: user.bio
                }
            });
        }

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
});

// Add this middleware to log all requests
router.use((req, res, next) => {
    console.log('Request received:', {
        method: req.method,
        path: req.path,
        body: req.body,
        headers: req.headers
    });
    next();
});

// Update the User model schema if needed
const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    mobile: {
        type: String
    },
    address: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    }
    // ... other fields ...
});

module.exports = router;