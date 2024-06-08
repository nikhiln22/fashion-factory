const mongoose = require('mongoose');

// Declare the Schema of the Mongo model
var catagorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  types: {
    type: Array,
    default: ['All']
  },
  status: {
    type: Boolean,
    required:true,
    default: true
  }
});

// creating a model
const catagoryModel = new mongoose.model('catagory', catagorySchema);

//Export the model
module.exports = catagoryModel;

