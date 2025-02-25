const jwt = require('jsonwebtoken');
const User = require('../models/User');

const adminAuth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ 
                success: false, 
                message: 'No authorization header found' 
            });
        }

        // Check if token format is correct
        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.split(' ')[1] 
            : authHeader;

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token found' 
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user from database
            const user = await User.findById(decoded.userId);
            
            // Check if user exists and is admin
            if (!user || !user.isAdmin) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Not authorized as admin' 
                });
            }

            // Add user to request object
            req.user = user;
            next();
            
        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token' 
            });
        }

    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error in authentication' 
        });
    }
};

module.exports = adminAuth; 