const mongoose = require('mongoose');

const couponschema = new mongoose.Schema({
    couponCode:{
        type : String,
        required : true,
        uppercase:true
    },
    type : {
        type : String,
        enum :['percentageDiscount','flatDiscount'],
        required : true
    },
    minimumPrice : {
        type : Number,
        required : true
    },
    discount : {
        type : Number,
        min : 0,
        max : 100,
        required : true
    },
    maxRedeem : {
        type : Number,
        required : true
    },
    expiry : {
        type : Date,
        required:true
    },
    status : {
        type : Boolean,
        required : true,
        default : true
    }
})

couponschema.index({expiry : 1},{expireAfterSeconds : 0})

const  couponModel = new mongoose.model('coupon',couponschema)

module.exports = couponModel;