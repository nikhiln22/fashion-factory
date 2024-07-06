const mongoose = require('mongoose');

// Declare the Schema of the Mongo model
var cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'userdetails'
    },
    sessionId:String,
    item:[
        {
            productId:{
                type:mongoose.Schema.Types.ObjectId,
                ref:'productDetails',
                required:true
            },
            quantity:{
                type:Number,
                required:true,
            },
            size:{
                type:String,
                required:true
            },
            price:{
                type:Number,
                required:true,
            },
            stock:{
                type:String,
                required:true
            },
            total:{
                type:Number,
                required:true
            }
        }
    ],
    total:Number,
},{strictPopulate:false});

// creating a model
const cartModel = new mongoose.model('cart', cartSchema);

//Export the model
module.exports = cartModel;

