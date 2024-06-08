const mongoose = require('mongoose');

// Defining the Schema of the Mongo model
var userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  mobile: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    required: true,
    default: false
  },
  status: {
    type: Boolean,
    required: true,
    default: true
  }
}, {
  timestamps: true
});

// Creating a model
const userModel = mongoose.model('userDetails', userSchema);

// Export the model
module.exports = userModel;
