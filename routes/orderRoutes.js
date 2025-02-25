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
        query: req.query
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

// Get all orders with optional status filter
router.get('/', function(req, res) {
    const { status } = req.query; // Get status from query parameter

    // Create filter object based on status if provided
    const filter = status ? { status } : {};

    Order.find(filter)
        .sort({ createdAt: -1 })
        .then(function(orders) {
            console.log(`Found ${orders.length} orders${status ? ` with status: ${status}` : ''}`);
            
            // If no orders found, return empty array with success true
            if (orders.length === 0) {
                return res.json({
                    success: true,
                    message: `No orders found${status ? ` with status: ${status}` : ''}`,
                    data: []
                });
            }

            res.json({
                success: true,
                count: orders.length,
                data: orders.map(order => ({
                    _id: order._id,
                    customerName: order.customerName,
                    serviceName: order.serviceName,
                    amount: order.amount,
                    status: order.status,
                    createdAt: order.createdAt,
                    paymentStatus: order.paymentStatus || 'pending'
                }))
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

// Get orders by status (accepted/cancelled) - no auth required
router.get('/status/:status', function(req, res) {
    const status = req.params.status;
    Order.find({ status: status })
        .sort({ createdAt: -1 })
        .then(function(orders) {
            console.log(`Found ${orders.length} ${status} orders`);
            res.json({
                success: true,
                data: orders
            });
        })
        .catch(function(error) {
            console.error(`Error fetching ${status} orders:`, error);
            res.status(500).json({
                success: false,
                message: `Error fetching ${status} orders`,
                error: error.message
            });
        });
});

// Get specific order by ID
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
                data: {
                    _id: order._id,
                    customerName: order.customerName,
                    serviceName: order.serviceName,
                    amount: order.amount,
                    status: order.status,
                    createdAt: order.createdAt,
                    paymentStatus: order.paymentStatus || 'pending'
                }
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

module.exports = router; 