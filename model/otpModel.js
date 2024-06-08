const mongoose = require('mongoose');

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
  expiry: {
    type: Date,
    default:new Date(),
    required:true
  }
});

const otpModel = mongoose.model('otpDetails', otpSchema);

module.exports = otpModel;
