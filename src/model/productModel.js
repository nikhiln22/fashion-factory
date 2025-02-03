const mongoose = require('mongoose');

// Defining the Schema of the Mongo model
var productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'categories',
    required: true,
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  discountPrice: {
    type: Number,
  },
  stock: [{
    size: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
  }],
  totalstock: {
    type: Number,
    required: true,
  },
  image: {
    type: Array,
    required: true,
  },
  status: {
    type: Boolean,
    default: true,
  }
});

// creating a model
const productModel = new mongoose.model('productDetails', productSchema);

//Export the model
module.exports = productModel;