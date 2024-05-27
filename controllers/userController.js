const userModel = require('../model/userModel');
const otpModel = require('../model/otpModel');
const mongoose = require('mongoose');




const signup = async (req, res) => {
  try {
    res.render('user/signup')
  } catch (error) {
    console.log(error)
    res.render('user/serverError')
  }
}


const index = async (req,res) =>{
  try{
    res.render('user/signup')
  }
}