const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

const defaultSubCategories = {
    'Office Stationeries': [
        { 
            name: 'Notebooks & Papers',
            image: 'notebooks.jpg'
        },
        { 
            name: 'Adhesive & Glue',
            image: 'Adhesive & Glue.jpg'
        },
        { 
            name: 'Pen & Pencil Kits',
            image: 'penpencilekit.jpg'
        },
        { 
            name: 'Whitener & Markers',
            image: 'whitenerandmarker.jpg'
        },
        { 
            name: 'Stapler & Scissors',
            image: 'staplerandSissor.jpg'
        },
        { 
            name: 'Calculator',
            image: 'Calculator.jpg'
        }
    ],
    'Print and Demands': [
        { 
            name: 'Business Cards',
            image: 'Business Cards.jpg'
        },
        { 
            name: 'Banners & Posters',
            image: 'Banner.jpg'
        },
        { 
            name: 'Marketing Materials',
            image: 'marker.jpg'
        },
        { 
            name: 'Printing Products',
            image: 'Printing and Demands.jpg'
        }
    ],
    'IT Services and Repair': [
        { 
            name: 'Computer & Laptop Repair',
            image: '/images/subcategories/it/computer-repair.jpg'
        },
        { 
            name: 'Software & OS Support',
            image: '/images/subcategories/it/software-support.jpg'
        },
        { 
            name: 'Server & Networking Solutions',
            image: '/images/subcategories/it/networking.jpg'
        },
        { 
            name: 'IT Security & Cybersecurity Solutions',
            image: '/images/subcategories/it/security.jpg'
        },
        { 
            name: 'Upgradation & Hardware Enhancement',
            image: '/images/subcategories/it/hardware.jpg'
        },
        { 
            name: 'IT Consultation & AMC Services',
            image: '/images/subcategories/it/consultation.jpg'
        }
    ]
};

// Configure multer for image storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/images/subcategories/');
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

const subCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    image: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Add initialization method for all categories and their subcategories
subCategorySchema.statics.initializeDefaultData = async function() {
    try {
        // Create or update all three categories
        const officeStationeries = await mongoose.model('Category').findOneAndUpdate(
            { name: 'Office Stationeries' },
            { name: 'Office Stationeries' },
            { upsert: true, new: true }
        );

        const printAndDemand = await mongoose.model('Category').findOneAndUpdate(
            { name: 'Print and Demands' },
            { name: 'Print and Demands' },
            { upsert: true, new: true }
        );

        const itServices = await mongoose.model('Category').findOneAndUpdate(
            { name: 'IT Services and Repair' },
            { name: 'IT Services and Repair' },
            { upsert: true, new: true }
        );

        // Define subcategories for each category
        const categoriesData = {
            [officeStationeries._id]: [
                { name: 'Notebooks & Papers' },
                { name: 'Adhesive & Glue' },
                { name: 'Pen & Pencil Kits' },
                { name: 'Whitener & Markers' },
                { name: 'Stapler & Scissors' },
                { name: 'Calculator' }
            ],
            [printAndDemand._id]: [
                { name: 'Business Cards' },
                { name: 'Banners & Posters' },
                { name: 'Marketing Materials' },
                { name: 'Printing Products' }
            ],
            [itServices._id]: [
                { name: 'Computer & Laptop Repair' },
                { name: 'Software & OS Support' },
                { name: 'Server & Networking Solutions' },
                { name: 'IT Security & Cybersecurity Solutions' },
                { name: 'Upgradation & Hardware Enhancement' },
                { name: 'IT Consultation & AMC Services' }
            ]
        };

        // Create subcategories for each category
        for (const [categoryId, subcategories] of Object.entries(categoriesData)) {
            for (const subCat of subcategories) {
                await this.findOneAndUpdate(
                    { 
                        name: subCat.name,
                        category: categoryId
                    },
                    { 
                        name: subCat.name,
                        category: categoryId
                    },
                    { upsert: true, new: true }
                );
            }
        }

        console.log('All categories and subcategories initialized successfully');
    } catch (error) {
        console.error('Error initializing categories and subcategories:', error);
        throw error;
    }
};

const SubCategory = mongoose.model('SubCategory', subCategorySchema);

module.exports = { SubCategory, upload }; 