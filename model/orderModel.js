const mongoose = require('mongoose');
const shortid = require('shortid');
const Schema = mongoose.Schema;

const orderSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'userDetails',
    },
    orderId: {
        type: String,
        default: shortid.generate,
        unique: true
    },
    items: [{
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
        price: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            default: "pending",
            required: true
        },
        returnReason:{
            type:String,    
        }
    }],
    address: {
        type: Array,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    deliveryDate:{
        type:Date
    },
    shippingDate:{
        type:Date
    },
    paymentMethod: {
        type: String,
        required: true
    },
    paymentStatus:{
        type:String,
        required:true
    },
    couponDiscount:{
        type:Number
    }
}, { timestamps: true });

const orderModel = mongoose.model("orders", orderSchema);

module.exports = orderModel;
