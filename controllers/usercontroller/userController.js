const userModel = require('../../model/userModel');
const otpModel = require('../../model/otpModel');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const flash = require('express-flash');
const path = require('path');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const { get } = require('http');
const dotenv = require('dotenv').config();


const mail = process.env.EMAIL;
const pass = process.env.PASS;


const generateOtp = () => {
  try {
    const otp = otpGenerator.generate(4, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false
    });
    // console.log('OTP: ', otp);
    return otp;
  } catch (error) {
    console.log(err);
    res.render('user/error');
  }
}

const sendMail = async (email, otp, username) => {
  try {
    // create reusable transporter object using the default smtp transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: mail,
        pass: pass
      },
    });

    // send mail with defined transport object
    let message = {
      from: {
        name: 'Fashion Factory',
        address: 'no-reply@fashionfactory.com'
      },
      to: email, // list of receivers
      subject: "Email Verification", // Subject line
      html: `<p>Hey ${username}, Fashion Enthusiast!</p>
    <p>Welcome to Fashion Factory! We're excited to have you on board. To complete your registration, please use the following One-Time Password (OTP):</p>
    <p style="font-size: 20px; font-weight: bold;">${otp}</p>
    <p>This OTP is valid for the next 1 minute.</p>
    <p>If you did not request this verification, please ignore this email.</p>
    <p>Stay stylish,<br/>The Fashion Factory Team</p>`
    };


    await transporter.sendMail(message);
    // console.log('email sent successfully');
  } catch (error) {
    console.log(error);
  }
};


// Rendering the home page
const index = async (req, res) => {
  try {
    if (req.session.user) {
      req.session.isAuth = true;
    }
    res.render('user/index', {
      user: req.session.user,
      isAuth: req.session.isAuth
    });
  } catch (error) {
    console.log('Error while loading the index page: ', error);
    res.render('user/error');
  }
};



// Rendering the signup page
const signup = async (req, res) => {
  try {
    res.render('user/signUp', {
      emailError: req.flash('emailError'),
      passwordError: req.flash('passwordError'),
      mobileError: req.flash('mobileError'),
      success: req.flash('success')
    });
  } catch (error) {
    console.log('Error while loading the signup page:------------------> ', error);
    res.render('user/error');
  }
};


const signupPost = async (req, res) => {
  try {
    // console.log("Reached signup post");
    const { username, password, confirmPassword, email, phone } = req.body;
    // console.log("req.body:", req.body);
    const userExists = await userModel.findOne({ email: email });
    if (userExists) {
      console.log("User already exists");
      req.flash('emailError', "Email already exists");
      return res.redirect('/signUp');
    }
    const mobileExists = await userModel.findOne({ mobile: phone });
    if (mobileExists) {
      console.log("Mobile number already registered");
      req.flash('mobileError', "Mobile number already registered");
      return res.redirect('/signUp');
    }
    if (password !== confirmPassword) {
      req.flash('passwordError', "Passwords do not match, please try again");
      return res.redirect('/signUp');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new userModel({
      name: username,
      email: email,
      mobile: phone,
      password: hashedPassword
    });

    req.session.user = newUser;
    req.session.signup = true;

    const otp = generateOtp();

    const currTime = Date.now();
    const expiry = currTime + 60 * 1000;
    console.log(currTime);
    console.log(expiry);

    await otpModel.updateOne(
      { email: email },
      { $set: { email: email, otp: otp, expiry: new Date(expiry) } },
      { upsert: true }
    );
    await sendMail(email, otp, username);

    res.redirect('/otp');
  } catch (error) {
    console.error('Error while signup: ', error);
    req.flash('emailError', "An error occurred during signup");
    res.redirect('/signUp');
  }
};


// rendering otp page
const otp = async (req, res) => {
  try {
    console.log(req.session.user.email, '-------------------->>>>');
    const otp = await otpModel.findOne({ email: req.session.user.email })
    console.log(otp, '-------------');
    res.render('user/otp', {
      expressFlash: {
        otperror: req.flash('otperror')
      },
      otp: otp
    })

  } catch (error) {
    console.log('otp rending--------->', error);
    res.render('user/error');
  }
}


// veryfying the otp
const verifyOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    const user = req.session.user;
    // console.log(user);
    const email = req.session.user.email;
    const data = await otpModel.findOne({ email: email });
    // console.log(data);
    const otp = data.otp;
    const expiry = data.expiry;
    if (enteredOtp === otp && expiry.getTime() >= Date.now()) {
      user.isVerified = true;
    }
    if (req.session.signup) {
      await userModel.create(user);
      const userdata = await userModel.findOne({ email: email });
      req.session.userId = userdata._id;
      req.session.isAuth = true;
      req.session.signup = false;
      req.flash('success', 'logged in successfully');
      res.redirect('/');
    }
    else {
      req.flash('otperror', 'wrong otp or time expired')
      return res.redirect('/otp')
    }
  } catch (error) {
    console.log(error);
    res.render('user/error');
  }
}

// resending the otp
const resendOtp = async (req, res) => {
  console.log('initial entry to otp page');
  try {
    console.log('entering to the resent otp page.....')
    const email = req.session.user.email;
    const otp = generateOtp();
    const currTime = Date.now();
    const expiry = currTime + 60 * 1000;
    await otpModel.updateOne({ email: email }, { otp: otp, expiry: new Date(expiry) });
    await sendMail(email, otp);
    res.redirect('/otp');
  } catch (error) {
    console.log(error);
    res.render('user/error');
  }
}


// Rendering the login page
const login = async (req, res) => {
  try {
    // console.log('eneterd login page----------->');
    res.render('user/login',
      {
        expressFlash: {
          invaliduser: req.flash('invaliduser'),
          invalidpassword: req.flash('invalidpassword'),
          userSuccess: req.flash('userSuccess')
        }
      })
  } catch (error) {
    console.log('Error while loading the login page: ', error);
    res.render('user/error');
  }
};

// user login post

const loginPost = async (req, res) => {
  try {
    console.log('+++++++++++++++++++entered login post');
    const email = req.body.email;
    const password = req.body.password;

    console.log(`Email:-----> ${email} , password---------> ${password}`);

    const user = await userModel.findOne({ email: email });
    console.log('user --------->  ' , user);

    if (user && user.status && await bcrypt.compare(password, user.password)) {
      req.session.userId = user._id;
      req.session.username = user.username;
      req.session.user = user;
      req.session.isAuth = true;
      req.flash('success', 'logged in successfully');
      console.log('Redirecting to /');
      return res.redirect('/');
    } else {
      console.log('Invalid login attempt');
      req.flash('invalidpassword', 'Invalid password or username');
      console.log('Redirecting to /login');
      return res.redirect('/login');
    }
  } catch (error) {
    console.error('Error in loginPost:', error);
    req.flash('invaliduser', 'Invalid username or password');
    console.log('Redirecting to /login');
    return res.redirect('/login');
  }
}


// user logout

const logout = async(req,res)=>{
  try{
    req.session.isAuth = false;
    req.logout(function(err){
      if(err){
        console.error('Error while logging out:',err);
        return res.render('user/error');
      }
      req.flash('success','Logged out successfully');
      res.redirect('/');
    })
  }catch(err){
    console.log(err);
    res.render('user/err');
  }
}



module.exports = { index, signup, signupPost, login, otp, verifyOtp, resendOtp, loginPost, logout};
