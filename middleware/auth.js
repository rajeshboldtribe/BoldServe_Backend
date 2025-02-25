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
        // Get the authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Authorization header missing'
            });
        }

        // Extract token
        let token = '';
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else {
            token = authHeader;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token not provided'
            });
        }

        try {
            // Verify token with your secret key
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            
            // Add user info to request
            req.user = {
                userId: decoded.userId,
                isAdmin: decoded.isAdmin
            };
            
            next();
        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during authentication'
        });
    }
};

module.exports = { auth, adminAuth }; 