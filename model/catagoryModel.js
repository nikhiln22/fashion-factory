const mongoose = require('mongoose');

// Declare the Schema of the Mongo model
var categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  discount: {
    type: Number,
    required: true
  },
  types: {
    type: Array,
    default: ['All']
  },
  status: {
    type: Boolean,
    required: true,
    default: true
  }
});

// creating a model
const categoryModel = new mongoose.model('categories', categorySchema);

//Export the model
module.exports = categoryModel;

