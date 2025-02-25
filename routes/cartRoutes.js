const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Cart = require('../models/Cart');
const Service = require('../models/Service');

// Debug middleware
router.use((req, res, next) => {
    console.log('Cart Route accessed:', {
        method: req.method,
        path: req.path,
        headers: req.headers
    });
    next();
});

// Test route to verify the router is working
router.get('/test', function(req, res) {
    res.json({ message: 'Cart route working' });
});

// Get cart items - simplified route
router.get('/', auth, async function(req, res) {
    try {
        console.log('Fetching cart for user:', req.user.id);

        const cart = await Cart.findOne({ userId: req.user.id })
            .populate({
                path: 'items.productId',
                model: 'Service',
                select: 'name price image category'
            });

        if (!cart) {
            return res.json({
                success: true,
                data: {
                    items: [],
                    summary: {
                        subtotal: 0,
                        platformFee: 5,
                        additionalCharge: 0,
                        gst: 0,
                        total: 0
                    }
                }
            });
        }

        // Transform cart items
        const cartItems = cart.items.map(item => {
            const product = item.productId;
            if (!product) return null;

            const itemTotal = product.price * item.quantity;
            return {
                _id: item._id,
                productId: product._id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                image: product.image,
                category: product.category,
                itemTotal: itemTotal
            };
        }).filter(item => item !== null);

        // Calculate totals
        const subtotal = cartItems.reduce((sum, item) => sum + item.itemTotal, 0);
        const platformFee = 5;
        const additionalCharge = subtotal * 0.02;
        const gst = (subtotal + platformFee + additionalCharge) * 0.18;
        const total = subtotal + platformFee + additionalCharge + gst;

        res.json({
            success: true,
            data: {
                items: cartItems,
                summary: {
                    subtotal: parseFloat(subtotal.toFixed(2)),
                    platformFee: platformFee,
                    additionalCharge: parseFloat(additionalCharge.toFixed(2)),
                    gst: parseFloat(gst.toFixed(2)),
                    total: parseFloat(total.toFixed(2))
                }
            }
        });
    } catch (error) {
        console.error('Cart fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching cart items',
            error: error.message
        });
    }
});

// Get cart summary
router.get('/summary', auth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
            return res.json({ 
                totalItems: 0,
                totalAmount: 0
            });
        }
        res.json({
            totalItems: cart.items.length,
            items: cart.items
        });
    } catch (error) {
        console.error('Error fetching cart summary:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add to cart - simplified route
router.post('/add', auth, async function(req, res) {
    try {
        const { productId, quantity = 1 } = req.body;
        console.log('Adding to cart:', { productId, quantity });

        const service = await Service.findById(productId);
        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        let cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
            cart = new Cart({
                userId: req.user.id,
                items: []
            });
        }

        const existingItemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId
        );

        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            cart.items.push({
                productId,
                quantity,
                category: service.category
            });
        }

        await cart.save();

        // Return updated cart
        const updatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'items.productId',
                model: 'Service',
                select: 'name price image category'
            });

        res.json({
            success: true,
            message: 'Item added to cart successfully',
            data: updatedCart
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding item to cart',
            error: error.message
        });
    }
});

// Update quantity
router.put('/item/:itemId', auth, async function(req, res) {
    try {
        const { quantity } = req.body;
        const cart = await Cart.findOne({ userId: req.user.id });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const itemIndex = cart.items.findIndex(
            item => item._id.toString() === req.params.itemId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        cart.items[itemIndex].quantity = quantity;
        await cart.save();

        res.json({
            success: true,
            message: 'Quantity updated successfully'
        });
    } catch (error) {
        console.error('Update quantity error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating quantity',
            error: error.message
        });
    }
});

// Remove item
router.delete('/item/:itemId', auth, async function(req, res) {
    try {
        const cart = await Cart.findOne({ userId: req.user.id });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        cart.items = cart.items.filter(
            item => item._id.toString() !== req.params.itemId
        );

        await cart.save();

        res.json({
            success: true,
            message: 'Item removed from cart successfully'
        });
    } catch (error) {
        console.error('Remove item error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing item',
            error: error.message
        });
    }
});

// Get cart items with all calculations
router.get('/category/cart/summary', auth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        
        if (!cart) {
            return res.json({
                success: true,
                data: {
                    totalItems: 0,
                    totalAmount: 0
                }
            });
        }

        const cartItems = await Promise.all(cart.items.map(async (item) => {
            const service = await Service.findById(item.productId);
            return service ? service.price * item.quantity : 0;
        }));

        const totalAmount = cartItems.reduce((sum, price) => sum + price, 0);

        res.json({
            success: true,
            data: {
                totalItems: cart.items.length,
                totalAmount: totalAmount
            }
        });
    } catch (error) {
        console.error('Error fetching cart summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching cart summary'
        });
    }
});

// Update cart item quantity
router.put('/category/cart/:itemId', auth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const { quantity } = req.body;
        const itemIndex = cart.items.findIndex(
            item => item._id.toString() === req.params.itemId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        cart.items[itemIndex].quantity = quantity;
        await cart.save();

        // Return updated cart with calculations
        const updatedCartItems = await Promise.all(cart.items.map(async (item) => {
            const product = await Service.findById(item.productId);
            return {
                _id: item._id,
                productId: item.productId,
                productName: product.name,
                price: product.price,
                quantity: item.quantity,
                image: product.image,
                category: product.category,
                itemSubtotal: product.price * item.quantity
            };
        }));

        const subtotal = updatedCartItems.reduce((sum, item) => sum + item.itemSubtotal, 0);
        const platformFee = 5;
        const additionalCharge = subtotal * 0.02;
        const gst = (subtotal + platformFee + additionalCharge) * 0.18;
        const total = subtotal + platformFee + additionalCharge + gst;

        res.json({
            success: true,
            data: {
                items: updatedCartItems,
                summary: {
                    subtotal: parseFloat(subtotal.toFixed(2)),
                    platformFee: parseFloat(platformFee.toFixed(2)),
                    additionalCharge: parseFloat(additionalCharge.toFixed(2)),
                    gst: parseFloat(gst.toFixed(2)),
                    total: parseFloat(total.toFixed(2))
                }
            }
        });
    } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating cart item'
        });
    }
});

// Remove item from cart
router.delete('/category/cart/:itemId', auth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        cart.items = cart.items.filter(
            item => item._id.toString() !== req.params.itemId
        );

        await cart.save();

        res.json({
            success: true,
            message: 'Item removed from cart'
        });
    } catch (error) {
        console.error('Error removing item:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing item from cart'
        });
    }
});

module.exports = router;