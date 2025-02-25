const mongoose = require('mongoose');

// Check if the model already exists before defining it
const Payment = mongoose.models.Payment || mongoose.model('Payment', new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: {
        type: String,
        enum: ['created', 'pending', 'completed', 'failed'],
        default: 'created'
    },
    trackingId: String,
    bankRefNo: String,
    paymentMode: String,
    customerName: String,
    customerEmail: String,
    customerPhone: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
}));

module.exports = Payment; 