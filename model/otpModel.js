const mongoose = require('mongoose');

// Defining the Schema of the Mongo model
var otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  otp: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60
  }
});

// creating a model
const otpModel = new mongoose.model('otpDetails', otpSchema);

//Export the model
module.exports = otpModel;