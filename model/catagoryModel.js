const mongoose = require('mongoose');

// Declare the Schema of the Mongo model
var catagorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    requiured: true
  },
  types: {
    type: Array,
    default: ['All']
  },
  is_listed: {
    type: Boolean,
    default: true
  },
  is_deleted: {
    type: Boolean,
    default: false
  }
});

// creating a model
const catagoryModel = new mongoose.model('catagory', catagorySchema);

//Export the model
module.exports = catagoryModel;

