const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'userDetails',
    },
    cartId: {
        type: Schema.Types.ObjectId,
        ref:'cart'
    },
    orderedItem: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'productDetails',
        },
        quantity: {
            type: Number,
            required: true,
        },
        size: {
            type: String,
            required: true,
        },
        productPrice: {
            type: Number,
            required: true,
        },
        productStatus: {
            type: String,
            default: "pending",
            required: true
        },
        totalProductPrice: {
            type: Number,
            required: true
        },
        returnReason: {
            type: String,
        },
        offer_id: {
            type: mongoose.Schema.Types.ObjectId,
        }
    }],
    deliveryAddress: {
        type: Array,
        required: true
    },
    orderAmount: {
        type: Number,
        required: true
    },
    deliveryDate: {
        type: Date
    },
    shippingDate: {
        type: Date
    },
    paymentMethod: {
        type: String,
        required: true
    },
    paymentStatus: {
        type: String,
        required: true
    },
    couponDiscount: {
        type: Number
    }
}, { timestamps: true });

const orderModel = mongoose.model("orders", orderSchema);

module.exports = orderModel;
