const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    subCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubCategory',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'cancelled'],
        default: 'pending'
    },
    customerDetails: {
        name: String,
        email: String,
        phone: String,
        address: String
    },
    orderDetails: {
        description: String,
        quantity: Number,
        price: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', orderSchema); 