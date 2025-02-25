require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// Import routes
const categoryRoutes = require('./routes/categoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const productRoutes = require('./routes/productRoutes');
const subcategoriesRoute = require('./routes/subcategoriesRoute');
const adminRoute = require('./routes/adminRoute');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Enhanced CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:5000', 'http://localhost:5173', 'https://boldservebackend-production.up.railway.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enhanced Debug middleware
app.use((req, res, next) => {
    console.log('Request received:', {
        method: req.method,
        path: req.path,
        body: req.body,
        headers: req.headers
    });
    next();
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://boldtribeinnovations:boldserve@cluster0.mgo6p.mongodb.net/')
    .then(() => console.log('📦 MongoDB Connected Successfully'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
    });

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running' });
});

// API Documentation route
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'BoldServe API is running successfully',
        documentation: {
            description: 'Available API Endpoints:',
            base_url: process.env.NODE_ENV === 'production' 
                ? process.env.API_URL 
                : `http://localhost:${process.env.PORT || 8003}`,
            endpoints: {
                admin: '/api/admin',
                services: '/api/services',
                categories: '/api/categories',
                orders: '/api/orders',
                users: '/api/users',
                payments: '/api/payments',
                products: '/api/products',
                subcategories: '/api/subcategories',
                dashboard: '/api/dashboard'
            }
        }
    });
});

// Enhanced Debug middleware specifically for user routes
app.use('/api/users', (req, res, next) => {
    console.log('User route accessed:', {
        method: req.method,
        path: req.path,
        headers: req.headers.authorization ? 'Auth header present' : 'No auth header'
    });
    next();
});

// Mount routes
app.use('/api/admin', adminRoute);
app.use('/api/services', serviceRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/subcategories', subcategoriesRoute);
app.use('/api/dashboard', dashboardRoutes);

// Enhanced Error handling middleware
app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err);
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.stack : err.message,
        details: {
            path: req.path,
            method: req.method
        }
    });
});

// Enhanced 404 handler
app.use('*', (req, res) => {
    console.log('404 - Route not found:', req.method, req.originalUrl);
    res.status(404).json({
        status: 'error',
        message: 'Route not found',
        details: {
            requestedUrl: req.originalUrl,
            method: req.method
        }
    });
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Start server with enhanced logging
const PORT = process.env.PORT || 8003;
app.listen(PORT, () => {
    console.log(`
🚀 Server is running on port ${PORT}
📁 Upload directory initialized
🌐 API URL: http://localhost:${PORT}
🔑 Admin login endpoint: http://localhost:${PORT}/api/admin/login
    `);
});

module.exports = app;