const Service = require('../models/Service');

// Create new service
const createService = async (req, res) => {
    try {
        const serviceData = {
            ...req.body,
            image: req.file ? `/uploads/${req.file.filename}` : null
        };

        // Validate required fields
        const requiredFields = ['category', 'subCategory', 'productName', 'price', 'description'];
        for (const field of requiredFields) {
            if (!serviceData[field]) {
                return res.status(400).json({
                    message: `${field} is required`
                });
            }
        }

        const service = new Service(serviceData);
        const savedService = await service.save();
        
        res.status(201).json({
            message: 'Service created successfully',
            service: savedService
        });
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({ 
            message: 'Error creating service', 
            error: error.message 
        });
    }
};

// Get all services
const getServices = async (req, res) => {
    try {
        const services = await Service.find();
        res.status(200).json(services);
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ 
            message: 'Error fetching services', 
            error: error.message 
        });
    }
};

// Get products by category and subcategory
const getProductsByCategory = async (req, res) => {
    try {
        const { category, subCategory } = req.query;
        
        // Create query object
        let query = {};
        if (category) query.category = category;
        if (subCategory) query.subCategory = subCategory;

        const products = await Service.find(query);
        
        if (products.length === 0) {
            return res.status(404).json({ 
                message: 'No products found for the specified category and subcategory' 
            });
        }

        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ 
            message: 'Error fetching products', 
            error: error.message 
        });
    }
};

module.exports = {
    createService,
    getServices,
    getProductsByCategory
}; 