const mongoose = require('mongoose');

// Defining the Schema of the Mongo model
var productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "category",
    required: true
  },
  image: [
    {
      type: String,
      required: true
    }
  ],
  quantity: {
    type: Number,
    required: true,
  },
  size: {
    type: String,
    required: true
  },
  is_listed: {
    type: Boolean,
    required: true
  }
});

// creating a model
const productModel = new mongoose.model('productDetails', productSchema);

//Export the model
module.exports = productModel;