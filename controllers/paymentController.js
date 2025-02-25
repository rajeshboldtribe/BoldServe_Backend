const Payment = require('../models/Payment');
const crypto = require('crypto');
require('dotenv').config();

const IDFC_MERCHANT_ID = process.env.IDFC_MERCHANT_ID;
const IDFC_ACCESS_KEY = process.env.IDFC_ACCESS_KEY;
const IDFC_SECRET_KEY = process.env.IDFC_SECRET_KEY;

const paymentController = {
    createPayment: async (req, res) => {
        try {
            const { amount, customerName, customerEmail, customerPhone } = req.body;

            // Generate unique order ID
            const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Create checksum
            const data = `${IDFC_MERCHANT_ID}|${orderId}|${amount}|INR|${IDFC_ACCESS_KEY}`;
            const checksum = crypto
                .createHmac('sha256', IDFC_SECRET_KEY)
                .update(data)
                .digest('hex');

            // Save payment details to database
            const payment = new Payment({
                orderId,
                amount,
                customerName,
                customerEmail,
                customerPhone,
                status: 'created'
            });
            await payment.save();

            // Prepare IDFC Bank payment parameters
            const paymentData = {
                merchant_id: IDFC_MERCHANT_ID,
                order_id: orderId,
                amount: amount * 100, // Convert to paise
                currency: 'INR',
                redirect_url: `${process.env.BACKEND_URL}/api/payments/callback`,
                cancel_url: `${process.env.BACKEND_URL}/api/payments/cancel`,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
                checksum: checksum
            };

            res.json({
                success: true,
                data: paymentData,
                message: 'Payment initiated successfully'
            });

        } catch (error) {
            console.error('Payment creation error:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating payment'
            });
        }
    },

    handleCallback: async (req, res) => {
        try {
            const {
                order_id,
                tracking_id,
                bank_ref_no,
                order_status,
                payment_mode,
                amount,
                checksum
            } = req.body;

            // Verify checksum
            const data = `${IDFC_MERCHANT_ID}|${order_id}|${tracking_id}|${bank_ref_no}|${order_status}|${amount}|${IDFC_ACCESS_KEY}`;
            const calculatedChecksum = crypto
                .createHmac('sha256', IDFC_SECRET_KEY)
                .update(data)
                .digest('hex');

            if (checksum !== calculatedChecksum) {
                throw new Error('Invalid checksum');
            }

            // Update payment status in database
            await Payment.findOneAndUpdate(
                { orderId: order_id },
                {
                    status: order_status === 'SUCCESS' ? 'completed' : 'failed',
                    trackingId: tracking_id,
                    bankRefNo: bank_ref_no,
                    paymentMode: payment_mode
                }
            );

            // Redirect to frontend with status
            res.redirect(`${process.env.FRONTEND_URL}/payment-status?status=${order_status}`);

        } catch (error) {
            console.error('Payment callback error:', error);
            res.redirect(`${process.env.FRONTEND_URL}/payment-status?status=ERROR`);
        }
    },

    handleCancel: async (req, res) => {
        try {
            const { order_id } = req.body;
            
            // Update payment status to failed
            await Payment.findOneAndUpdate(
                { orderId: order_id },
                { status: 'failed' }
            );

            res.redirect(`${process.env.FRONTEND_URL}/payment-status?status=CANCELLED`);
        } catch (error) {
            console.error('Payment cancellation error:', error);
            res.redirect(`${process.env.FRONTEND_URL}/payment-status?status=ERROR`);
        }
    },

    getPaymentStatus: async (req, res) => {
        try {
            const payment = await Payment.findOne({ orderId: req.params.orderId });
            if (!payment) {
                return res.status(404).json({ message: 'Payment not found' });
            }
            res.json({ 
                success: true,
                data: {
                    orderId: payment.orderId,
                    status: payment.status,
                    amount: payment.amount
                }
            });
        } catch (error) {
            console.error('Error fetching payment status:', error);
            res.status(500).json({ 
                success: false,
                message: 'Error fetching payment status' 
            });
        }
    }
};

module.exports = paymentController; 