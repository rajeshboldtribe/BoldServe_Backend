const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { adminAuth } = require('../middleware/auth');

// Add debugging middleware
router.use((req, res, next) => {
    console.log('Dashboard Route accessed:', req.method, req.url);
    next();
});

// Get all dashboard stats
router.get('/stats', async (req, res) => {
    try {
        // Get total users count
        const totalUsers = await User.countDocuments();
        
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

// Get detailed users data
router.get('/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get detailed orders data
router.get('/orders', adminAuth, async (req, res) => {
    try {
        const orders = await Order.find();
        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get detailed revenue data
router.get('/revenue', adminAuth, async (req, res) => {
    try {
        const payments = await Payment.find();
        res.json({ success: true, data: payments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;