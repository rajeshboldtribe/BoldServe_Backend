const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Make sure to import your User model

const auth = async (req, res, next) => {
    try {
        // Allow GET requests for orders without authentication
        if (req.method === 'GET' && (
            req.path === '/api/orders' || 
            req.path.startsWith('/api/orders/') ||
            req.path === '/api/cart' ||
            req.path.startsWith('/api/payments')
        )) {
            return next();
        }

        // Debug logging
        console.log('Incoming Request Details:');
        console.log('📍 URL:', req.url);
        console.log('📝 Method:', req.method);
        console.log('📦 Body:', req.body);
        console.log('🎯 Path:', req.path);
        console.log('Auth Headers:', req.headers);

        const authHeader = req.headers.authorization;
        console.log('Auth Header:', authHeader);

        if (!authHeader || authHeader === 'Bearer') {
            return res.status(401).json({ 
                success: false, 
                message: 'No valid authorization token provided' 
            });
        }

        // Extract token
        const parts = authHeader.split(' ');
        
        // Check if we have both parts and first part is "Bearer"
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({ 
                success: false, 
                message: 'Authorization format must be: Bearer <token>' 
            });
        }

        const token = parts[1];
        console.log('Token to verify:', token);

        if (!token || token.length < 10) { // Basic validation
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token format' 
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decoded token:', decoded);

            const user = await User.findById(decoded.userId);
            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'User not found' 
                });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token',
                details: error.message
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error in authentication' 
        });
    }
};

// Create a new middleware for admin-only routes
const adminAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        // Log headers for debugging
        console.log('Auth Headers:', req.headers);
        console.log('Auth Header:', authHeader);

        if (!authHeader) {
            return res.status(401).json({ message: 'No authorization header' });
        }

        // Extract token
        const token = authHeader.replace('Bearer ', '').trim();
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        try {
            // Log token before verification
            console.log('Token to verify:', token);
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decoded token:', decoded);
            
            req.user = decoded;
            
            if (!decoded.isAdmin) {
                return res.status(403).json({ message: 'Admin access required' });
            }
            
            next();
        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({ 
                message: 'Invalid token',
                error: error.message 
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { auth, adminAuth }; 