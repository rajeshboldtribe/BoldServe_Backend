const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { createService, getServices, getProductsByCategory } = require('../controllers/serviceController');
const Service = require('../models/Service');

// Ensure uploads directory exists
const fs = require('fs');
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload an image.'), false);
    }
};

// Update multer configuration to remove file size limit
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        files: 6 // Only limit the number of files, not the size
    }
}).array('images', 6);

// Update upload middleware to remove size-related errors
const uploadMiddleware = (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Too many files. Maximum is 6 images',
                    error: err.message
                });
            }
            return res.status(400).json({
                status: 'error',
                message: 'File upload error',
                error: err.message
            });
        } else if (err) {
            console.error('Unknown error:', err);
            return res.status(500).json({
                status: 'error',
                message: 'Unknown error occurred during file upload',
                error: err.message
            });
        }
        next();
    });
};

// Request logging middleware
router.use((req, res, next) => {
    console.log(`\n📝 Service Route Request:`);
    console.log(`Method: ${req.method}`);
    console.log(`Path: ${req.path}`);
    console.log(`Query:`, req.query);
    console.log(`Body:`, req.body);
    next();
});

// Serve static files from uploads directory
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Update the category validation to include all categories
const VALID_CATEGORIES = {
    'Office Stationaries': [
        'Notebooks & Papers',
        'Adhesive & Glue',
        'Pen & Pencil Kits',
        'Whitener & Markers',
        'Stapler & Scissors',
        'Calculator'
    ],
    'Print and Demands': [
        'Business Cards',
        'Banners & Posters',
        'Marketing Materials',
        'Printing Products'
    ],
    'IT Service and Repairs': [
        'Computer & Laptop Repair',
        'Software & OS Support',
        'Server & Networking Solutions',
        'IT Security & Cybersecurity Solutions',
        'Upgradation & Hardware Enhancement',
        'IT Consultation & AMC Services'
    ]
};

// Routes
router.post('/', uploadMiddleware, async (req, res) => {
    try {
        const {
            category,
            subCategory,
            productName,
            price,
            description,
            offers,
            review,
            rating
        } = req.body;

        // Validate category
        if (!VALID_CATEGORIES[category]) {
            return res.status(400).json({
                success: false,
                message: `Invalid category. Must be one of: ${Object.keys(VALID_CATEGORIES).join(', ')}`
            });
        }

        // Validate subcategory
        if (!VALID_CATEGORIES[category].includes(subCategory)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subcategory',
                validSubcategories: VALID_CATEGORIES[category]
            });
        }

        // Log the number of files received
        console.log(`Received ${req.files?.length || 0} images`);

        const serviceData = {
            category: category.trim(),
            subCategory: subCategory.trim(),
            productName: productName.trim(),
            price: Number(price),
            description: description.trim(),
            offers: offers ? offers.trim() : '',
            review: review ? review.trim() : '',
            rating: rating ? Number(rating) : 0,
            images: req.files ? req.files.map(file => `/api/services/uploads/${file.filename}`) : []
        };

        console.log('Creating service with data:', serviceData);

        const service = new Service(serviceData);
        await service.save();

        res.status(201).json({
            success: true,
            message: `Product successfully added to ${subCategory} with ${serviceData.images.length} images`,
            data: service
        });
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating service',
            error: error.message
        });
    }
});

// Get products by category and subcategory
router.get('/category', async (req, res) => {
    try {
        const { category, subCategory } = req.query;

        console.log('\n🔍 Category Search Request:');
        console.log('Category:', category);
        console.log('SubCategory:', subCategory);

        let query = {};

        // Handle different categories
        if (category === 'Office Stationaries') {
            query.category = 'Office Stationaries';
            
            if (subCategory) {
                if (!VALID_CATEGORIES['Office Stationaries'].includes(subCategory.trim())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid subcategory for Office Stationaries',
                        validSubcategories: VALID_CATEGORIES['Office Stationaries']
                    });
                }
                query.subCategory = subCategory.trim();
            }
        } 
        else if (category === 'Print and Demands') {
            query.category = 'Print and Demands';
            
            if (subCategory) {
                if (!VALID_CATEGORIES['Print and Demands'].includes(subCategory.trim())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid subcategory for Print and Demands',
                        validSubcategories: VALID_CATEGORIES['Print and Demands']
                    });
                }
                query.subCategory = subCategory.trim();
            }
        }
        else if (category === 'IT Service and Repairs') {
            query.category = 'IT Service and Repairs';
            
            if (subCategory) {
                if (!VALID_CATEGORIES['IT Service and Repairs'].includes(subCategory.trim())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid subcategory for IT Service and Repairs',
                        validSubcategories: VALID_CATEGORIES['IT Service and Repairs']
                    });
                }
                query.subCategory = subCategory.trim();
            }
        }
        else {
            return res.status(400).json({
                success: false,
                message: 'Invalid category',
                validCategories: Object.keys(VALID_CATEGORIES)
            });
        }

        console.log('MongoDB Query:', JSON.stringify(query, null, 2));

        const products = await Service.find(query);

        console.log(`Found ${products.length} products`);

        if (products.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No products found',
                data: [],
                validSubcategories: VALID_CATEGORIES[category]
            });
        }

        res.status(200).json({
            success: true,
            data: products,
            count: products.length
        });

    } catch (error) {
        console.error('Error in category route:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products',
            error: error.message
        });
    }
});

// Add a test endpoint to check string matching
router.get('/test-matching', (req, res) => {
    const { category, subCategory } = req.query;
    
    const testCategory = 'Office Stationaries';
    const testSubCategory = 'Notebooks & Papers';
    
    const result = {
        inputCategory: category,
        inputSubCategory: subCategory,
        normalizedInputCategory: category ? category.trim().replace(/\s+/g, ' ') : '',
        normalizedInputSubCategory: subCategory ? subCategory.trim().replace(/\s+/g, ' ') : '',
        testCategory: testCategory,
        testSubCategory: testSubCategory,
        categoryMatch: category ? category.trim().toLowerCase() === testCategory.toLowerCase() : false,
        subCategoryMatch: subCategory ? subCategory.trim().toLowerCase() === testSubCategory.toLowerCase() : false
    };
    
    res.json(result);
});

// Add a helper endpoint to verify category/subcategory
router.get('/verify-category', (req, res) => {
    const { category, subCategory } = req.query;
    const categorySubcategories = {
        'Office Stationaries': [
            'Notebooks & Papers',
            'Adhesive & Glue',
            'Pen & Pencil Kits',
            'Whitener & Markers',
            'Stapler & Scissors',
            'Calculator'
        ],
        'Print and Demands': [
            'Business Cards',
            'Banners & Posters',
            'Marketing Materials',
            'Printing Products'
        ],
        'IT Service and Repairs': [
            'Computer & Laptop Repair',
            'Software & OS Support',
            'Server & Networking Solutions',
            'IT Security & Cybersecurity Solutions',
            'Upgradation & Hardware Enhancement',
            'IT Consultation & AMC Services'
        ]
    };

    const normalizedCategory = category ? category.trim() : '';
    const normalizedSubCategory = subCategory ? subCategory.trim() : '';

    const matchedCategory = Object.keys(categorySubcategories).find(
        cat => cat.toLowerCase() === normalizedCategory.toLowerCase()
    );

    const isValidCategory = !!matchedCategory;
    const isValidSubCategory = isValidCategory && categorySubcategories[matchedCategory].some(
        sub => sub.toLowerCase() === normalizedSubCategory.toLowerCase()
    );

    res.json({
        isValid: isValidCategory && (!normalizedSubCategory || isValidSubCategory),
        category: matchedCategory,
        validSubCategories: isValidCategory ? categorySubcategories[matchedCategory] : [],
        providedValues: {
            category: normalizedCategory,
            subCategory: normalizedSubCategory
        }
    });
});

// Get available subcategories for a category
router.get('/subcategories/:category', async (req, res) => {
    try {
        const category = req.params.category.trim();
        
        // Define subcategories mapping
        const categorySubcategories = {
            'Office Stationaries': [
                'Notebooks & Papers',
                'Adhesive & Glue',
                'Pen & Pencil Kits',
                'Whitener & Markers',
                'Stapler & Scissors',
                'Calculator'
            ],
            'Print and Demands': [
                'Business Cards',
                'Banners & Posters',
                'Marketing Materials',
                'Printing Products'
            ],
            'IT Service and Repairs': [
                'Computer & Laptop Repair',
                'Software & OS Support',
                'Server & Networking Solutions',
                'IT Security & Cybersecurity Solutions',
                'Upgradation & Hardware Enhancement',
                'IT Consultation & AMC Services'
            ]
        };

        if (categorySubcategories[category]) {
            res.status(200).json(categorySubcategories[category]);
        } else {
            // If category not found, get distinct subcategories from database
            const subcategories = await Service.distinct('subCategory', { 
                category: new RegExp('^' + category + '$', 'i') 
            });
            res.status(200).json(subcategories);
        }
    } catch (error) {
        console.error('Error fetching subcategories:', error);
        res.status(500).json({
            message: 'Error fetching subcategories',
            error: error.message
        });
    }
});

// Add a new endpoint to get all categories and their subcategories
router.get('/categories', async (req, res) => {
    try {
        const categories = {
            'Office Stationaries': [
                'Notebooks & Papers',
                'Adhesive & Glue',
                'Pen & Pencil Kits',
                'Whitener & Markers',
                'Stapler & Scissors',
                'Calculator'
            ],
            'Print and Demands': [
                'Business Cards',
                'Banners & Posters',
                'Marketing Materials',
                'Printing Products'
            ],
            'IT Service and Repairs': [
                'Computer & Laptop Repair',
                'Software & OS Support',
                'Server & Networking Solutions',
                'IT Security & Cybersecurity Solutions',
                'Upgradation & Hardware Enhancement',
                'IT Consultation & AMC Services'
            ]
        };
        
        res.status(200).json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            message: 'Error fetching categories',
            error: error.message
        });
    }
});

// Get all services with optional filtering
router.get('/', async (req, res) => {
    try {
        const { category, subCategory } = req.query;
        let query = {};

        if (category && subCategory) {
            query = {
                category: new RegExp('^' + category.trim() + '$', 'i'),
                subCategory: new RegExp('^' + subCategory.trim() + '$', 'i')
            };
        } else if (category) {
            query = {
                category: new RegExp('^' + category.trim() + '$', 'i')
            };
        }

        console.log('Query for all services:', query);
        const services = await Service.find(query);
        console.log(`Found ${services.length} services`);
        
        res.status(200).json(services);
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({
            message: 'Error fetching services',
            error: error.message
        });
    }
});

// Add a debug route to check database contents
router.get('/debug-categories', async (req, res) => {
    try {
        // Get all unique categories and subcategories from the database
        const allProducts = await Service.find({});
        
        // Group products by category and subcategory
        const categoriesMap = {};
        
        allProducts.forEach(product => {
            if (!categoriesMap[product.category]) {
                categoriesMap[product.category] = new Set();
            }
            categoriesMap[product.category].add(product.subCategory);
        });

        // Convert to a more readable format
        const dbCategories = Object.keys(categoriesMap).map(category => ({
            category: category,
            subcategories: Array.from(categoriesMap[category]),
            productCount: allProducts.filter(p => p.category === category).length
        }));

        // Get the requested category and subcategory
        const { category, subCategory } = req.query;

        const debugInfo = {
            requestedCategory: category,
            requestedSubCategory: subCategory,
            databaseContents: dbCategories,
            expectedCategories: {
                'Office Stationaries': [
                    'Notebooks & Papers',
                    'Adhesive & Glue',
                    'Pen & Pencil Kits',
                    'Whitener & Markers',
                    'Stapler & Scissors',
                    'Calculator'
                ],
                'Print and Demands': [
                    'Business Cards',
                    'Banners & Posters',
                    'Marketing Materials',
                    'Printing Products'
                ],
                'IT Service and Repairs': [
                    'Computer & Laptop Repair',
                    'Software & OS Support',
                    'Server & Networking Solutions',
                    'IT Security & Cybersecurity Solutions',
                    'Upgradation & Hardware Enhancement',
                    'IT Consultation & AMC Services'
                ]
            },
            stringComparison: category ? {
                exactMatch: dbCategories.some(c => c.category === category),
                lowercaseMatch: dbCategories.some(c => c.category.toLowerCase() === category.toLowerCase()),
                similarCategories: dbCategories.map(c => ({
                    category: c.category,
                    similarity: category.toLowerCase().includes(c.category.toLowerCase()) || 
                              c.category.toLowerCase().includes(category.toLowerCase())
                })).filter(c => c.similarity)
            } : null
        };

        res.json(debugInfo);
    } catch (error) {
        console.error('Debug route error:', error);
        res.status(500).json({
            message: 'Error in debug route',
            error: error.message
        });
    }
});

// Add new product-specific endpoints
router.post('/products', uploadMiddleware, async (req, res) => {
    try {
        const productData = {
            ...req.body,
            category: req.body.category.trim(),
            subCategory: req.body.subCategory.trim(),
            productName: req.body.productName.trim(),
            price: Number(req.body.price),
            description: req.body.description.trim(),
            offers: req.body.offers ? req.body.offers.trim() : '',
            review: req.body.review ? req.body.review.trim() : '',
            rating: req.body.rating ? Number(req.body.rating) : 0,
            images: req.files ? req.files.map(file => `/api/services/uploads/${file.filename}`) : []
        };

        console.log('Creating product with data:', productData);

        const service = new Service(productData);
        await service.save();

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: service
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating product',
            error: error.message
        });
    }
});

// GET endpoint to fetch products by category
router.get('/products/:category', async (req, res) => {
    try {
        const category = req.params.category;
        console.log('Fetching products for category:', category);

        const products = await Service.find({ 
            category: new RegExp('^' + category + '$', 'i')
        });
        
        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products',
            error: error.message
        });
    }
});

// GET endpoint to fetch products by category and subcategory
router.get('/products/filter', async (req, res) => {
    try {
        const { category, subCategory } = req.query;
        let query = {};

        if (category) {
            query.category = new RegExp('^' + category.trim() + '$', 'i');
        }
        if (subCategory) {
            query.subCategory = new RegExp('^' + subCategory.trim() + '$', 'i');
        }

        const products = await Service.find(query);
        
        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        console.error('Error fetching filtered products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products',
            error: error.message
        });
    }
});

// Add these new debugging routes

// Debug endpoint to check exact products in Office Stationaries
router.get('/debug/office-stationaries', async (req, res) => {
    try {
        // Try different query variations to find the products
        const exactMatch = await Service.find({ 
            category: "Office Stationaries" 
        });
        
        const caseInsensitive = await Service.find({ 
            category: new RegExp('^Office Stationaries$', 'i') 
        });
        
        const allProducts = await Service.find({});
        const categories = await Service.distinct('category');
        
        res.status(200).json({
            debug: {
                exactMatchCount: exactMatch.length,
                exactMatchProducts: exactMatch,
                caseInsensitiveCount: caseInsensitive.length,
                caseInsensitiveProducts: caseInsensitive,
                allCategories: categories,
                totalProductCount: allProducts.length,
                sampleProducts: allProducts.slice(0, 5).map(p => ({
                    category: p.category,
                    subCategory: p.subCategory,
                    productName: p.productName
                }))
            }
        });
    } catch (error) {
        console.error('Debug route error:', error);
        res.status(500).json({
            message: 'Error in debug route',
            error: error.message
        });
    }
});

// Add a helper route to get valid subcategories
router.get('/subcategories/office-stationaries', (req, res) => {
    res.status(200).json({
        success: true,
        category: 'Office Stationaries',
        subcategories: VALID_CATEGORIES['Office Stationaries']
    });
});

// Add this test endpoint at the top of your routes
router.get('/test-products', async (req, res) => {
    try {
        const testProduct = new Service({
            category: "Office Stationaries",
            subCategory: "Notebooks & Papers",
            productName: "Test Notebook",
            price: 100,
            description: "Test product description",
            offers: "10% OFF",
            review: "Good product",
            rating: 4.5,
            images: []
        });

        await testProduct.save();

        // Fetch all products to verify
        const allProducts = await Service.find({});

        res.status(200).json({
            success: true,
            message: 'Test product created and fetched all products',
            testProduct: testProduct,
            allProducts: allProducts,
            count: allProducts.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error in test endpoint',
            error: error.message
        });
    }
});

// Add this GET route specifically for Print and Demands products
router.get('/print-demands', async (req, res) => {
    try {
        const { subCategory } = req.query;
        
        // Build query for Print and Demands
        const query = { category: 'Print and Demands' };
        
        // Add subcategory filter if provided
        if (subCategory) {
            query.subCategory = subCategory;
        }

        console.log('Fetching Print and Demands products with query:', query);

        const products = await Service.find(query);

        console.log(`Found ${products.length} Print and Demands products`);

        res.status(200).json({
            success: true,
            data: products,
            count: products.length,
            message: subCategory 
                ? `Found ${products.length} products in ${subCategory}`
                : `Found ${products.length} Print and Demands products`
        });

    } catch (error) {
        console.error('Error fetching Print and Demands products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching Print and Demands products',
            error: error.message
        });
    }
});

// Add a route to get Print and Demands subcategories
router.get('/print-demands/subcategories', async (req, res) => {
    try {
        const subcategories = await Service.distinct('subCategory', { 
            category: 'Print and Demands' 
        });

        res.status(200).json({
            success: true,
            data: subcategories,
            count: subcategories.length
        });
    } catch (error) {
        console.error('Error fetching subcategories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching subcategories',
            error: error.message
        });
    }
});

// Add this GET route specifically for IT Services products
router.get('/it-services/products', async (req, res) => {
    try {
        const { subCategory } = req.query;
        
        // Build query for IT Service and Repairs
        const query = { category: 'IT Service and Repairs' };
        
        // Add subcategory filter if provided
        if (subCategory) {
            query.subCategory = subCategory;
        }

        console.log('Fetching IT Services products with query:', query);

        const products = await Service.find(query);

        console.log(`Found ${products.length} IT Services products`);

        res.status(200).json({
            success: true,
            data: products,
            count: products.length,
            message: subCategory 
                ? `Found ${products.length} products in ${subCategory}`
                : `Found ${products.length} IT Services products`
        });

    } catch (error) {
        console.error('Error fetching IT Services products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching IT Services products',
            error: error.message
        });
    }
});

// Simplified route to get just rating and review count
router.get('/product/ratings/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await Service.findById(productId);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Calculate average rating and get review count
        const reviews = product.reviews || [];
        const averageRating = reviews.length > 0
            ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
            : 0;

        res.status(200).json({
            success: true,
            data: {
                averageRating,
                totalReviews: reviews.length
            }
        });
    } catch (error) {
        console.error('Error fetching ratings:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ratings',
            error: error.message
        });
    }
});

// Update search endpoint to handle "not found" case
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'Please enter a search term'
            });
        }

        // Search in product names and subcategories
        const searchResults = await Service.find({
            $or: [
                { productName: { $regex: query, $options: 'i' } },
                { subCategory: { $regex: query, $options: 'i' } }
            ]
        });

        if (searchResults.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: searchResults
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Error performing search',
            error: error.message
        });
    }
});

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('Service Route Error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Error in service route',
        error: err.message
    });
});

// Debug middleware
router.use(function(req, res, next) {
    console.log('Service Route accessed:', {
        method: req.method,
        path: req.path,
        headers: req.headers
    });
    next();
});

// Get services by category
router.get('/category/:categoryName', function(req, res) {
    const category = req.params.categoryName;
    Service.find({ category: category })
        .then(function(services) {
            res.json({
                success: true,
                data: services
            });
        })
        .catch(function(error) {
            console.error('Error fetching services:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching services',
                error: error.message
            });
        });
});

// Get all services
router.get('/', function(req, res) {
    Service.find()
        .sort({ createdAt: -1 })
        .then(function(services) {
            res.json({
                success: true,
                data: services
            });
        })
        .catch(function(error) {
            console.error('Error fetching services:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching services',
                error: error.message
            });
        });
});

// Get all products for admin panel
router.get('/admin/products', async (req, res) => {
    try {
        const products = await Service.find()
            .sort({ createdAt: -1 })
            .select('productName category subCategory price images createdAt'); // Select specific fields

        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products',
            error: error.message
        });
    }
});

// Delete a product
router.delete('/admin/products/:productId', async (req, res) => {
    try {
        const { productId } = req.params;

        // Find the product first to get image paths
        const product = await Service.findById(productId);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Delete images from the uploads folder
        if (product.images && product.images.length > 0) {
            product.images.forEach(imagePath => {
                // Extract filename from path
                const filename = imagePath.split('/').pop();
                const fullPath = path.join(__dirname, '../uploads', filename);
                
                // Delete file if exists
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            });
        }

        // Delete the product from database
        await Service.findByIdAndDelete(productId);

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting product',
            error: error.message
        });
    }
});

module.exports = router; 