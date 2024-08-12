const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userDetails',
        required: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'orders',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'failed']
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['COD', 'online', 'Razorpay', 'Wallet']
    },
    transactionId: {
        type: String
    }

}, { timestamps: true });


module.exports = mongoose.model('payment', paymentSchema);