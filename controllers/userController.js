const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Order = require('../models/Order');

const userController = {
    // Get all users
    getUsers: async (req, res) => {
        try {
            const users = await User.find({}, { password: 0 }); // Exclude passwords
            console.log('Found users:', users.length); // Debug log
            res.json(users); // Send the array directly
        } catch (error) {
            console.error('Error getting users:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error fetching users',
                error: error.message 
            });
        }
    },

    // Verify if user exists
    verifyUser: async (req, res) => {
        try {
            const { email } = req.query;
            const user = await User.findOne({ email });
            res.json({ exists: !!user });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Create new user (register)
    createUser: async (req, res) => {
        try {
            const { fullName, email, password, mobile } = req.body;
            
            // Check if user exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }

            // Validate mobile number
            if (!mobile || mobile.length < 10) {
                return res.status(400).json({ message: 'Valid mobile number is required' });
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create user with mobile
            const user = new User({
                fullName,
                email,
                mobile,
                password: hashedPassword
            });

            await user.save();

            // Create token
            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET || 'your_jwt_secret',
                { expiresIn: '24h' }
            );

            res.status(201).json({
                token,
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    mobile: user.mobile
                }
            });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    // Login user
    loginUser: async (req, res) => {
        try {
            const { email, password } = req.body;
            
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET || 'your_jwt_secret',
                { expiresIn: '24h' }
            );

            res.json({
                token,
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    mobile: user.mobile,
                    address: user.address,
                    bio: user.bio
                }
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // New methods
    getUserProfile: async (req, res) => {
        try {
            const user = await User.findById(req.user.userId)
                .select('-password');
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json({
                success: true,
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    mobile: user.mobile,
                    address: user.address,
                    bio: user.bio
                }
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    updateUserProfile: async (req, res) => {
        try {
            const { email, address, bio } = req.body;
            const user = await User.findById(req.user.userId);
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Only allow updating email, address, and bio
            if (email) {
                // Check if new email already exists for another user
                const emailExists = await User.findOne({ 
                    email, 
                    _id: { $ne: user._id } 
                });
                
                if (emailExists) {
                    return res.status(400).json({ 
                        message: 'Email already in use by another account' 
                    });
                }
                user.email = email;
            }
            
            if (address) user.address = address;
            if (bio) user.bio = bio;

            await user.save();

            res.json({
                success: true,
                message: 'Profile updated successfully',
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    mobile: user.mobile,
                    address: user.address,
                    bio: user.bio
                }
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                message: 'Error updating profile',
                error: error.message 
            });
        }
    },

    verifyToken: async (req, res) => {
        try {
            const user = await User.findById(req.user.userId).select('-password');
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json({ isValid: true, user });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Add this new method to your userController object
    checkUserExists: async (req, res) => {
        try {
            const userId = req.params.id;
            const userEmail = req.query.email;

            let user;
            if (userId) {
                user = await User.findById(userId);
            } else if (userEmail) {
                user = await User.findOne({ email: userEmail });
            } else {
                return res.status(400).json({ 
                    success: false, 
                    message: "Please provide user ID or email" 
                });
            }

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            res.status(200).json({
                success: true,
                message: "User exists",
                user: {
                    id: user._id,
                    email: user.email,
                    fullName: user.fullName
                }
            });

        } catch (error) {
            console.error('Error checking user:', error);
            res.status(500).json({
                success: false,
                message: "Error checking user",
                error: error.message
            });
        }
    },

    // Add these new methods
    getTotalUsers: async () => {
        try {
            const count = await User.countDocuments();
            return count;
        } catch (error) {
            console.error('Error getting total users:', error);
            return 0;
        }
    },

    getTotalOrders: async () => {
        try {
            // If you have an Order model
            const count = await Order.countDocuments();
            return count;
        } catch (error) {
            console.error('Error getting total orders:', error);
            return 0;
        }
    },

    getTotalRevenue: async () => {
        try {
            // If you have an Order model
            const result = await Order.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" }
                    }
                }
            ]);
            return result[0]?.total || 0;
        } catch (error) {
            console.error('Error getting total revenue:', error);
            return 0;
        }
    },

    getDashboardStats: async (req, res) => {
        try {
            const totalUsers = await User.countDocuments();
            return {
                success: true,
                stats: {
                    totalUsers,
                    totalOrders: 150, // Mock data
                    totalRevenue: 25000 // Mock data
                }
            };
        } catch (error) {
            throw new Error('Error fetching dashboard stats');
        }
    }
};

module.exports = userController; 