const userModel = require('../../model/userModel');
const otpModel = require('../../model/otpModel');
const productModel = require('../../model/productModel');
const categoryModel = require('../../model/catagoryModel');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const flash = require('express-flash');
const path = require('path');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const { get } = require('http');
const passport = require('passport');
const { log } = require('console');
require('dotenv').config();
const axios = require('axios');



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
    const id = req.session.userId;
    const categories = await categoryModel.find({ status: true });
    const products = await productModel.find().limit(5)
    if (req.user) {
      req.session.isAuth = true;
      req.session.userId = user._id;
    }
    res.render('user/home', { categories, products });
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


const signUpPost = async (req, res) => {
  try {
    console.log('entered to the signUp post function--------------->');
    const { username, email, phone: phone, password, confirmPassword: Cpassword } = req.body;

    console.log('---------------->', req.body);

    const user = await userModel.findOne({ email: email });
    console.log(user, '#@#@#@#@#@#@#@#@##@@@#@#@');

    if (!user) {
      if (password !== Cpassword) {
        req.flash('passwordError', 'password does not match, Please try again');
        return res.redirect('/signUp');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newuser = {
        username,
        email,
        phone,
        password: hashedPassword
      };

      req.session.user = newuser;
      // console.log(req.session.user,'===============================$');
      req.session.signup = true;

      const otp = generateOtp();
      console.log(otp, ':::::;;;;;;;::::::;;;;;;;');

      const currTime = Date.now();
      const expTime = currTime + 60 * 1000;

      await otpModel.updateOne({ email }, { $set: { email, otp, expiry: new Date(expTime) } }, { upsert: true });
      await sendMail(email, otp);

      return res.redirect('/otp');
    } else {
      req.flash('emailError', 'user already exists');
      return res.redirect('/signup');
    }
  } catch (error) {
    console.log('error while signing up the user', error);
    return res.render('user/error');
  }
};


// rendering the otp page....
const otp = async (req, res) => {
  try {
    console.log('entered the otp function====================>');
    const otp = await otpModel.findOne({ email: req.session.user.email });
    console.log(otp);
    res.render('user/otp', {
      expressFlash: {
        otperror: req.flash('otperror')
      },
      otp: otp
    })
  } catch (error) {
    console.log('error while rendering the otp page........');
    res.render('user/error');
  }
}


// veryfing the otp
const verifyOtp = async (req, res) => {
  try {
    console.log('entered the otp veryfing function===============>');
    const enteredOtp = req.body.otp;
    const converetedOtp = parseInt(enteredOtp.join(''));

    console.log("enter otp -------->>>> ", enteredOtp);

    console.log(req.session.user);

    // const user = req.session.user.name;
    // console.log(user,')(*&^%#$%#^45636');

    const email = req.session.user.email;
    console.log(email, '@#$%@$@%@%@$%@%@');

    const userdb = await otpModel.findOne({ email: email });
    console.log(userdb, '^^%%^%^%^^^^^^');

    const otp = userdb.otp;
    const expiry = userdb.expiry;

    console.log('entering to the most danger conditional statements, please pray for me.............');
    if (converetedOtp == otp && expiry.getTime() >= Date.now()) {
      email.isVerified = true;
      if (req.session.forgot) {
        res.redirect('/newpassword');
      }
      if (req.session.signup) {
        console.log('entered here.........');
        await userModel.create(req.session.user);
        const userdata = await userModel.findOne({ email: email });
        console.log('entered this side.....');
        req.session.userId = userdata._id;
        req.session.isAuth = true;
        req.session.signup = false;
        req.flash('success', 'Logged in successfully');
        res.redirect('/');
      }
    } else {
      req.flash('otperror', 'invalid otp!..please enter correct otp');
      res.redirect('/otp');
    }
  } catch (error) {
    console.log('error occured while veryfing the otp', error);
    res.render('user/error');
  }
}


// veryfying the resend otp
const resendOtp = async (req, res) => {
  try {
    console.log('***********entered the veryfying resended otp****************');
    const email = req.session.user.email;
    const otp = generateOtp();
    console.log(otp, '@@#@@###@##@#@#@#@$@');
    const currTime = Date.now();
    const expiry = currTime + 60 * 1000;
    await otpModel.updateOne({ email: email }, { otp: otp, expiry: new Date(expiry) });
    await sendMail(email, otp);
    res.redirect('/otp');
  } catch (error) {
    console.log('error while veryfing the resended otp', error);
    res.render('user/error');
  }
}




// Rendering the login page
const login = async (req, res) => {
  try {
    console.log('eneterd login page----------->');
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
    console.log('entered login post');
    const email = req.body.email;
    const password = req.body.password;
    const user = await userModel.findOne({ email: email });

    if (user && user.status && await bcrypt.compare(password, user.password)) {
      req.session.userId = user._id;
      req.session.username = user.name;
      req.session.user = user;
      req.session.isAuth = true;
      req.flash('success', 'logged in successfully');
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

// google authentication
const googleSignIn = passport.authenticate('google', { scope: ['email', 'profile'] });
const googleCallback = passport.authenticate('google', {
  successRedirect: '/',
  failureRedirect: '/auth/failure'
});


const authFailure = (req, res) => {
  res.send('Something went wrong..');
};


// forgot password page rendering
const forgotPassword = async (req, res) => {
  try {
    console.log('rendering the forgot password page');
    const emailExist = req.flash('emailExist');
    console.log(emailExist);
    res.render('user/forgot', { emailExist });
  } catch (error) {
    console.log('error while rendering the forgot password page');
    res.render('user/error');
  }
}

// forgot password post
const forgotPasswordPost = async (req, res) => {
  try {
    const email = req.body.email;
    const emailExist = await userModel.findOne({ email: email });
    console.log('user entered email:', email);
    console.log('email existing within the data base:', emailExist);
    if (!emailExist) {
      req.flash('emailExist', 'No users found');
    } else if (emailExist.email === email) {
      req.session.forgot = true;
      req.session.signup = false;
      req.session.user = { email: email };
      const otp = generateOtp();
      console.log(otp);
      const currTime = Date.now();
      const expTime = currTime + 60 * 1000;
      await otpModel.updateOne({ email: email }, { $set: { email: email, otp: otp, expiry: new Date(expTime) } }, { upsert: true });
      await sendMail(email, otp);
      res.redirect('/otp');
    } else {
      req.flash('emailExist', 'Email Already Exist');
      res.redirect('/forgotpassword');
    }
  } catch (error) {
    console.log('error while veryfing the post request', error);
    res.render('user/error');
  }
}

// rendering new password page
const newpassword = async (req, res) => {
  try {
    console.log('rendering the new password page');
    passwordError = req.flash('passwordError')
    res.render('user/newpassword', { passwordError });
  } catch (error) {
    console.log('error while rendering the new password page');
    res.render('user/error');
  }
}

// new password post

const newPasswordPost = async (req, res) => {
  try {
    console.log('entered the new password post method');
    const password = req.body.password;
    const cpassword = req.body.confirmPassword;
    if (password == cpassword) {
      console.log('entered to the if condition');
      const hashedPassword = await bcrypt.hash(password, 10);
      const email = req.session.user.email;
      await userModel.updateOne({ email: email }, { password: hashedPassword });
      req.session.forgot = false;
      res.redirect('/');
    } else {
      req.flash('passwordError', 'Password does not match');
      res.redirect('/newpassword');
    }
  } catch (error) {
    console.log('error while setting the new password');
    res.render('user/error');
  }
}


const logout = async (req, res) => {
  try {
    // console.log(req.cookies.googleToken,'###################');
    if (req.cookies.googleToken) {
      await axios.post(`https://accounts.google.com/o/oauth2/revoke?token=${req.cookies.googleToken}`);
    }
    console.log("hi")
    req.session.isAuth = false;
    req.logOut(function (err) {
      if (err) {
        console.error("Error logging out:", err);
        return res.render('user/error');
      }
      req.flash('success', 'Logged out Successfully')

      res.redirect('/login');
    });
  } catch (err) {
    console.log(err)
    res.render('user/error')
  }
}

module.exports = { index, signup, signUpPost, login, otp, verifyOtp, resendOtp, loginPost, googleSignIn, googleCallback, authFailure, forgotPassword, forgotPasswordPost, newpassword, newPasswordPost, logout };
