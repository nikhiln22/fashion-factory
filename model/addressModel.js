const mongoose = require('mongoose');

// Declare the Schema of the Mongo model
var addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    address: [{
        name: {
            type: String,
            required: true
        },
        email:{
            type:String,
            required:true
        },
        mobile:{
            type:Number,
            required : true
        },
        houseName: {
            type: String,
            required: true
          },
          street: {
            type: String,
            required: true
          },
          city: {
            type: String,
            required: true
          },
          state: {
            type: String,
            required: true
          },
          country: {
            type: String,
            required: true
          },
          pincode: {
            type: String,
            required: true
          },
          saveAs: {
            type: String,
            required: true,
          },
    }]
});

// creating a model
const addressModel = new mongoose.model('address', addressSchema);

//Export the model
module.exports = addressModel;

