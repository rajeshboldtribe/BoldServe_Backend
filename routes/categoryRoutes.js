const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

router.post('/', categoryController.createCategory);
router.post('/sub-category', categoryController.createSubCategory);
router.get('/', categoryController.getCategories);
router.get('/:categoryId/sub-categories', categoryController.getSubCategories);

module.exports = router; 