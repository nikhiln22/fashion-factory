const mongoose = require('mongoose');

const dbConnect = ()=>{
  try{
    const connect = mongoose.connect(process.env.mongodB_URL);
    console.log('database connected successfully');
  }
  catch(err){
    console.log('database error');
  }
}

module.exports = dbConnect;