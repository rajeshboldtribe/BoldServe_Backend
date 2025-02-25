const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Order = require('../models/Order');
const userController = require('../controllers/userController');
const Payment = require('../models/Payment');

// Initialize default admin account with fixed credentials
const ADMIN_CREDENTIALS = {
    userId: 'Admin',
    password: 'Admin123' // You might want to change this to a more secure password
};

const initializeDefaultAdmin = async () => {
    try {
        // Check if any admin account exists
        const adminCount = await Admin.countDocuments();
        
        if (adminCount === 0) {
            // Create the single admin account
            const hashedPassword = await bcrypt.hash(ADMIN_CREDENTIALS.password, 10);
            await Admin.create({
                userId: ADMIN_CREDENTIALS.userId,
                password: hashedPassword
            });
            console.log('✅ Default admin account created successfully');
        } else if (adminCount > 1) {
            // Remove extra admin accounts if they somehow exist
            await Admin.deleteMany({ userId: { $ne: ADMIN_CREDENTIALS.userId } });
            console.log('🔄 Cleaned up extra admin accounts');
        }
    } catch (error) {
        console.error('❌ Error managing admin account:', error);
    }
};

// Call initialization when routes are loaded
initializeDefaultAdmin();

// Add this before your POST /login route
router.get('/login', (req, res) => {
    res.status(405).json({
        success: false,
        message: 'Method not allowed. Please use POST for login.',
        correctUsage: {
            method: 'POST',
            endpoint: '/api/admin/login',
            body: {
                userId: 'string',
                password: 'string'
            }
        }
    });
});

// Login route - only allows the single admin account
router.post('/login', async (req, res) => {
    try {
        console.log('👉 Login attempt with:', {
            userId: req.body.userId,
            passwordProvided: !!req.body.password
        });
        
        const { userId, password } = req.body;

        // Validate input
        if (!userId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both userId and password'
            });
        }

        // Find admin
        const admin = await Admin.findOne({ userId });
        console.log('🔍 Admin found:', !!admin);

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Verify password
        const isMatch = await admin.comparePassword(password);
        console.log('🔐 Password match:', isMatch);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate token with isAdmin flag
        const token = jwt.sign(
            { 
                userId: admin.userId,
                isAdmin: true,
                role: 'admin'
            },
            process.env.JWT_SECRET || 'your_jwt_secret_key',
            { expiresIn: '24h' }
        );

        console.log('✅ Login successful');

        // Send token with Bearer prefix
        res.json({
            success: true,
            token: `Bearer ${token}`,
            message: 'Login successful',
            admin: {
                userId: admin.userId,
                role: 'admin'
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            details: error.message
        });
    }
});

// Verify token route
router.get('/verify-token', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
        const admin = await Admin.findOne({ userId: decoded.userId });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        res.json({
            success: true,
            user: {
                userId: admin.userId,
                role: 'admin'
            }
        });

    } catch (error) {
        console.error('🔥 Token verification error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Debug middleware
router.use((req, res, next) => {
    console.log('Admin route accessed:', req.method, req.url);
    next();
});

// Protected admin routes
router.get('/dashboard/stats', adminAuth, async (req, res) => {
    try {
        console.log('Fetching dashboard stats...'); // Debug log

        // Get users count
        const totalUsers = await User.countDocuments();
        console.log('Total users:', totalUsers);
        
        // Get all orders
        const orders = await Order.find();
        const totalOrders = orders.length;
        
        // Calculate total revenue from completed orders
        const totalRevenue = orders
            .filter(order => order.status === 'completed')
            .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

        const statsData = {
            totalUsers,
            totalOrders,
            totalRevenue: totalRevenue.toFixed(2)
        };

        console.log('Sending stats data:', statsData); // Debug log

        return res.status(200).json(statsData);

    } catch (error) {
        console.error('Dashboard stats error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch dashboard statistics',
            error: error.message 
        });
    }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
    try {
        console.log('Fetching users list...');
        const users = await User.find({ isAdmin: false }).select('-password');
        console.log(`Found ${users.length} users`);
        
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users list',
            error: error.message
        });
    }
});

// Check user existence
router.get('/check-user/:id', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        res.json({
            success: true,
            exists: !!user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking user existence'
        });
    }
});

// Simple test route without auth
router.get('/test', (req, res) => {
    res.json({ message: 'Admin route is working' });
});

// Add dashboard route
router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        // Get total users count
        const totalUsers = await User.countDocuments({ isAdmin: false });
        
        // Get total orders count
        const totalOrders = await Order.countDocuments();
        
        // Calculate total revenue
        const revenueResult = await Payment.aggregate([
            {
                $match: { status: 'completed' }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amount' }
                }
            }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        res.json({
            success: true,
            data: {
                totalUsers,
                totalOrders,
                totalRevenue
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching dashboard statistics',
            error: error.message 
        });
    }
});

module.exports = router;