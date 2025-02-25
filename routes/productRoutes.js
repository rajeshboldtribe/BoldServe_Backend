const express = require('express');
const router = express.Router();
const Product = require('../models/Products');

// Get all products
router.get('/', async (req, res) => {
    try {
        const products = await Product.find()
            .populate('category')
            .populate('subCategory');
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get products by category and subcategory
router.get('/category/:categoryId/subcategory/:subCategoryId', async (req, res) => {
    try {
        const { categoryId, subCategoryId } = req.params;
        const products = await Product.findByCategories(categoryId, subCategoryId);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new product
router.post('/', async (req, res) => {
    const product = new Product({
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        category: req.body.categoryId,
        subCategory: req.body.subCategoryId,
        image: req.body.image,
        stock: req.body.stock,
        specifications: req.body.specifications,
        brand: req.body.brand
    });

    try {
        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update product
router.patch('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        Object.keys(req.body).forEach(key => {
            if (product[key] !== undefined) {
                product[key] = req.body[key];
            }
        });

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete product
router.delete('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        await product.remove();
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 