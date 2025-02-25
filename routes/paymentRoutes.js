const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const mongoose = require('mongoose');
const { adminAuth } = require('../middleware/auth');

// Debug middleware
router.use(function(req, res, next) {
    console.log('Payment Route accessed:', {
        method: req.method,
        path: req.path,
        headers: req.headers
    });
    next();
});

// Get all payments - no auth required
router.get('/', function(req, res) {
    Payment.find()
        .sort({ createdAt: -1 })
        .then(function(payments) {
            res.json({
                success: true,
                data: payments
            });
        })
        .catch(function(error) {
            console.error('Error fetching payments:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching payments',
                error: error.message
            });
        });
});

// Get payment by ID - no auth required
router.get('/:paymentId', function(req, res) {
    // Validate paymentId format
    if (!mongoose.Types.ObjectId.isValid(req.params.paymentId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid payment ID format'
        });
    }

    Payment.findById(req.params.paymentId)
        .then(function(payment) {
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment not found'
                });
            }
            res.json({
                success: true,
                data: payment
            });
        })
        .catch(function(error) {
            console.error('Get payment error:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching payment',
                error: error.message
            });
        });
});

// Create payment
router.post('/', function(req, res) {
    const newPayment = new Payment(req.body);
    newPayment.save()
        .then(function(savedPayment) {
            res.status(201).json({
                success: true,
                data: savedPayment
            });
        })
        .catch(function(error) {
            console.error('Error creating payment:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating payment',
                error: error.message
            });
        });
});

// Update payment status
router.put('/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const payment = await Payment.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        res.json({ success: true, data: payment });
    } catch (error) {
        console.error('Update payment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete payment
router.delete('/:id', async (req, res) => {
    try {
        const payment = await Payment.findByIdAndDelete(req.params.id);
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        res.json({ success: true, message: 'Payment deleted successfully' });
    } catch (error) {
        console.error('Delete payment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get total revenue
router.get('/total-revenue', adminAuth, async (req, res) => {
    try {
        const result = await Payment.aggregate([
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

        const totalRevenue = result.length > 0 ? result[0].totalRevenue : 0;
        res.json({ success: true, totalRevenue });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router; 