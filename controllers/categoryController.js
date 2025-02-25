const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');

exports.createCategory = async (req, res) => {
    try {
        const category = new Category(req.body);
        await category.save();
        res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.createSubCategory = async (req, res) => {
    try {
        const subCategory = new SubCategory(req.body);
        await subCategory.save();
        res.status(201).json(subCategory);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getCategories = async (req, res) => {
    try {
        // Initialize categories if they don't exist
        const count = await Category.countDocuments();
        if (count === 0) {
            await Category.initializeCategories();
        }
        
        const categories = await Category.find();
        console.log('Fetched categories:', categories); // Debug log
        res.json(categories);
    } catch (error) {
        console.error('Error in getCategories:', error);
        res.status(500).json({ message: 'Error fetching categories' });
    }
};

exports.getSubCategories = async (req, res) => {
    try {
        const subCategories = await SubCategory.find({ categoryId: req.params.categoryId });
        res.json(subCategories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 