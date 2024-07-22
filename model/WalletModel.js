const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userDetails',
        required: true
    },
    balance: {
        type: Number,
        required: true
    },
    transaction: [{
        amount: {
            type: Number,
            required: true
        },
        transactionsMethod: {
            type: String,
            required: true,
            enum: ["Credit", "Razorpay", "referral", "Refund", "Payment"]
        },
        date: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);