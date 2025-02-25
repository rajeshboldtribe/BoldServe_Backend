const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const Order = require('../models/Order');
const { adminAuth } = require('../middleware/auth');
const auth = require('../middleware/auth');

// Debug middleware
router.use(function(req, res, next) {
    console.log('Order Route accessed:', {
        method: req.method,
        path: req.path,
        headers: req.headers
    });
    next();
});

// Create new order - requires auth
router.post('/', function(req, res) {
    const newOrder = new Order(req.body);
    newOrder.save()
        .then(function(savedOrder) {
            res.status(201).json({
                success: true,
                data: savedOrder
            });
        })
        .catch(function(error) {
            console.error('Error creating order:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating order',
                error: error.message
            });
        });
});

// Get total orders count
router.get('/count', adminAuth, async (req, res) => {
    try {
        const count = await Order.countDocuments();
        res.json({ success: true, count: count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all orders - no auth required
router.get('/', function(req, res) {
    Order.find()
        .sort({ createdAt: -1 })
        .then(function(orders) {
            console.log(`Found ${orders.length} orders`);
            res.json({
                success: true,
                data: orders
            });
        })
        .catch(function(error) {
            console.error('Error fetching orders:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching orders',
                error: error.message
            });
        });
});

// Get order by ID - no auth required
router.get('/:orderId', function(req, res) {
    Order.findById(req.params.orderId)
        .then(function(order) {
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
            res.json({
                success: true,
                data: order
            });
        })
        .catch(function(error) {
            console.error('Error fetching order:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching order',
                error: error.message
            });
        });
});

// Update order - requires auth
router.put('/:orderId', function(req, res) {
    Order.findByIdAndUpdate(
        req.params.orderId,
        req.body,
        { new: true }
    )
        .then(function(updatedOrder) {
            if (!updatedOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
            res.json({
                success: true,
                data: updatedOrder
            });
        })
        .catch(function(error) {
            console.error('Error updating order:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating order',
                error: error.message
            });
        });
});

// Delete order - requires auth
router.delete('/:orderId', function(req, res) {
    Order.findByIdAndDelete(req.params.orderId)
        .then(function(deletedOrder) {
            if (!deletedOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
            res.json({
                success: true,
                message: 'Order deleted successfully'
            });
        })
        .catch(function(error) {
            console.error('Error deleting order:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting order',
                error: error.message
            });
        });
});

// Get orders by status (accepted/cancelled)
router.get('/status/:status', orderController.getOrdersByStatus);

module.exports = router; 