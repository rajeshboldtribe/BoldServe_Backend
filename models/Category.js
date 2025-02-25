const mongoose = require('mongoose');
const slugify = require('slugify'); // You'll need to install this package

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: ['Office Stationeries', 'Print and Demands', 'IT Services and Repair']
    },
    slug: {
        type: String,
        unique: true
    },
    description: {
        type: String
    },
    image: {  // Using local image path
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save middleware to generate slug from name
categorySchema.pre('save', function(next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

// Update the static method with local image paths
categorySchema.statics.initializeCategories = async function() {
    try {
        const defaultCategories = [
            {
                name: 'Office Stationeries',
                description: 'Office supplies and stationery items',
                slug: 'office-stationeries',
                image: 'Office Stationaries.jpg'  // Local image file name
            },
            {
                name: 'Print and Demands',
                description: 'Printing services and related demands',
                slug: 'print-and-demands',
                image: 'Printing and Demands.jpg'  // Local image file name
            },
            {
                name: 'IT Services and Repair',
                description: 'IT related services and repair work',
                slug: 'it-services-and-repair',
                image: 'itservices.jpg'  // Local image file name
            }
        ];

        for (const category of defaultCategories) {
            await this.findOneAndUpdate(
                { name: category.name },
                category,
                { upsert: true, new: true }
            );
        }
        console.log('Categories initialized successfully');
    } catch (error) {
        console.error('Error initializing categories:', error);
        throw error;
    }
};

const Category = mongoose.model('Category', categorySchema);

// Initialize categories when the model is first loaded
Category.initializeCategories();

module.exports = Category; 