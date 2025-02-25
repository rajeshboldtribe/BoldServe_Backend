const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required']
    },
    duration: {
        type: Number,
        required: [true, 'Duration is required'],
        default: 0
    },
    productName: {
        type: String,
        required: [true, 'Product name is required']
    },
    category: {
        type: String,
        required: [true, 'Category is required']
    },
    subCategory: {
        type: String,
        required: [true, 'Sub-category is required']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: 0
    },
    description: {
        type: String,
        default: ''
    },
    offers: {
        type: String,
        default: ''
    },
    review: {
        type: String,
        default: ''
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    images: [{
        type: String
    }],
    imageUrl: {
        type: String
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Service', serviceSchema); 