const mongoose = require('mongoose');

// Defining the Schema of the Mongo model
var userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true
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
  },
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'productDetails'
  }],
  referralCode: {
    type: String,
    required:true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'userDetails',
  },
  // googleToken:{
  //   type:String
  // }
}, {
  timestamps: true
});

// Creating a model
const userModel = mongoose.model('userDetails', userSchema);

// Export the model
module.exports = userModel;
