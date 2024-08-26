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
const passport = require('passport');
require('dotenv').config();
const walletModel = require('../../model/WalletModel');
const offerModel = require('../../model/offerModel');
const cartModel = require('../../model/cartModel');


const mail = process.env.EMAIL;
const pass = process.env.PASS;


// generating otp function
const generateOtp = () => {
  try {
    const otp = otpGenerator.generate(4, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false
    });
    return otp;
  } catch (error) {
    console.log(err);
    res.render('user/error');
  }
}

// sending mail for the users throught the nodemailer
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
  } catch (error) {
    console.log(error);
  }
};

// rendering the home page for the user
const index = async (req, res) => {
  try {
    console.log('rendering the user home page');
    let userId = req.session.userId;
    let userData = await userModel.findOne({ _id: userId, status: true });
    let categoryData = await categoryModel.find({});
    console.log('categoryData:', categoryData);
    let offerData = await offerModel.find({
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });
    const limit = 5;
    let productData = await productModel.find({ status: true }).sort({ _id: -1 }).limit(limit).populate('category');
    productData = productData.map((product) => {
      let productDiscountedPrice = product.price;
      let categoryDiscountedPrice = product.price;
      let appliedOffer = null;
      offerData.forEach((offer) => {
        if (offer.offerType === 'product' && offer.productId.includes(product._id.toString())) {
          productDiscountedPrice = product.price - (product.price * offer.discount) / 100;
        }
      });
      offerData.forEach((offer) => {
        if (offer.offerType === 'category' && offer.categoryId.includes(product.category._id.toString())) {
          categoryDiscountedPrice = product.price - (product.price * offer.discount) / 100;
        }
      });
      if (productDiscountedPrice <= categoryDiscountedPrice) {
        appliedOffer = offerData.find(
          (offer) =>
            offer.offerType === "product" &&
            offer.productId.includes(product._id.toString())
        );
        discountedPrice = Math.round(productDiscountedPrice);
      } else {
        appliedOffer = offerData.find(
          (offer) =>
            offer.offerType === "category" &&
            offer.categoryId.includes(product.category._id.toString())
        );
        discountedPrice = Math.round(categoryDiscountedPrice);
      }

      return {
        ...product.toObject(),
        originalPrice: product.price,
        discountedPrice,
        appliedOffer: appliedOffer
          ? {
            offerName: appliedOffer.offerName,
            discount: appliedOffer.discount,
          }
          : null,
        offerText: appliedOffer ? `${appliedOffer.discount}% Off` : "",
      };
    });


    const cartCount = userData ? await cartModel.countDocuments({ userId: userId }) : 0;
    const wishlistCount = userData ? userData.wishlist.length : 0;

    if (userData) {
      res.render('user/home', {
        productData: productData,
        userData: userData,
        categoryData,
        offerData,
        cartCount,
        wishlistCount,
      })
    } else {
      res.render('user/home', {
        productData: productData,
        userData: null,
        categoryData,
        offerData,
        cartCount,
        wishlistCount,
      })
    }
  } catch (error) {
    console.log('error occured while rendering the home page',error);
    res.render('user/error');
  }
}

// finding the products basis on the category
const findByCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const { categoryId } = req.query;
    const userData = await userModel.findOne({ _id: req.session.userId });
    const offerData = await offerModel.find({
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });
    let productData = await productModel.find({ category: categoryId, status: true })
      .sort({ _id: -1 })
      .limit(limit)
      .skip(skip)
      .populate('category');

    const totalProducts = await productModel.countDocuments({
      category: categoryId,
      status: true
    });
    const totalPages = Math.ceil(totalProducts / limit);

    productData = productData.map((product) => {
      let productDiscountedPrice = product.price;
      let categoryDiscountedPrice = product.price;
      let appliedOffer = null;

      offerData.forEach((offer) => {
        if (offer.offerType === 'product' && offer.productId.includes(product._id.toString())) {
          productDiscountedPrice = product.price - (product.price * offer.discount) / 100;
        }
      });

      offerData.forEach((offer) => {
        if (offer.offerType === 'category' && offer.categoryId.includes(product.category._id.toString())) {
          categoryDiscountedPrice = product.price - (product.price * offer.discount) / 100;
        }
      });

      if (productDiscountedPrice <= categoryDiscountedPrice) {
        appliedOffer = offerData.find((offer) => offer.offerType === 'product' && offer.productId.includes(product._id.toString()))
        discountedPrice = Math.round(productDiscountedPrice);
      } else {
        appliedOffer = offerData.find((offer) => offer.offerType === 'category' && offer.categoryId.includes(product.category._id.toString()));
        discountedPrice = Math.round(categoryDiscountedPrice);
      }
      return {
        ...product.toObject(),
        originalPrice: product.price,
        discountedPrice,
        appliedOffer: appliedOffer
          ? {
            offerName: appliedOffer.offerName,
            discount: appliedOffer.discount,
          }
          : null,
        offerText: appliedOffer ? `${appliedOffer.discount}% off` : ''
      }
    });

    const categoryData = await categoryModel.findById(categoryId);
    console.log('categoryData:', categoryData);

    res.render('user/products', {
      productData,
      userData,
      categoryData,
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: totalPages,
    });
  } catch (error) {
    console.error('Error while rendering the filtered products pages:', error);
    res.status(500).render('user/error', { error: 'An error occurred while fetching the products.' });
  }
};


// Rendering the signup page
const signup = async (req, res) => {
  try {
    res.render('user/signUp', {
      emailError: req.flash('emailError'),
      passwordError: req.flash('passwordError'),
      referralError: req.flash('referralError'),
      success: req.flash('success'),
      currentPage: 'signUp'
    });
  } catch (error) {
    console.log('Error while loading the signup page', error);
    res.render('user/error');
  }
};

// function to generate unique refferal code
const generateuniqueRefferalCode = async () => {
  let code;
  let isUnique = false;
  while (!isUnique) {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existingUser = await userModel.findOne({ referralCode: code });
    if (!existingUser) {
      isUnique = true;
    }
  }
  return code;
};


// user providing the details for signup
const signUpPost = async (req, res) => {
  try {
    console.log('entered to the signUp post function');
    const { username, email, phone: phone, password, confirmPassword: Cpassword, referralCode } = req.body;
    const user = await userModel.findOne({ email: email });
    if (!user) {
      if (password !== Cpassword) {
        req.flash('passwordError', 'password does not match, Please try again');
        return res.redirect('/signUp');
      }

      let referredBy;
      if (referralCode) {
        const referrer = await userModel.findOne({ referralCode: referralCode });
        if (referrer) {
          referredBy = referrer._id;
        } else {
          req.flash('referralError', 'Invalid referral code');
          return res.redirect('/signUp');
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newReferalCode = await generateuniqueRefferalCode();

      const newuser = {
        username,
        email,
        phone,
        password: hashedPassword,
        referralCode: newReferalCode,
        referredBy
      };

      req.session.user = newuser;
      req.session.signup = true;

      const otp = generateOtp();
      console.log('otp:', otp);

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
    console.log('entered the otp function');
    const otp = await otpModel.findOne({ email: req.session.user.email });
    console.log(otp);
    res.render('user/otp', {
      expressFlash: {
        otperror: req.flash('otperror')
      },
      otp: otp
    })

    req.flash('otperror', null);
  } catch (error) {
    console.log('error while rendering the otp page........');
    res.render('user/error');
  }
}


// veryfing the otp
const verifyOtp = async (req, res) => {
  try {
    console.log('entered the otp veryfing function');

    const enteredOtp = req.body.otp;
    const converetedOtp = parseInt(enteredOtp.join(''));

    const email = req.session.user.email;
    const userdb = await otpModel.findOne({ email: email });

    const otp = userdb.otp;
    const expiry = userdb.expiry;

    if (converetedOtp == otp && expiry.getTime() >= Date.now()) {
      email.isVerified = true;
      if (req.session.forgot) {
        res.redirect('/newpassword');
      }

      if (req.session.signup) {
        const newUser = await userModel.create(req.session.user);

        if (newUser.referredBy) {
          const referrer = await userModel.findById(newUser.referredBy);

          // referral reward for the refferrer
          await walletModel.findOneAndUpdate(
            { userId: referrer._id },
            {
              $inc: { balance: 100 },
              $push: {
                transaction: { amount: 100, transactionsMethod: "referral" }
              }
            },
            { upsert: true }
          );
          // referral award for new user
          await walletModel.findOneAndUpdate(
            { userId: newUser._id },
            {
              $inc: { balance: 50 },
              $push: {
                transaction: { amount: 50, transactionsMethod: "referral" }
              }
            },
            { upsert: true }
          );
        }
        req.session.userId = newUser._id;
        req.session.isAuth = true;
        req.session.signup = false;
        req.flash('success', 'Logged in successfully');
        res.redirect('/');
      }
    } else {
      req.flash('otperror', 'Invalid OTP. Please enter the correct OTP.');
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
    console.log('veryfying the resended otp to the user');
    const email = req.session.user.email;
    const otp = generateOtp();
    console.log('otp:', otp);
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
    console.log('rendering the login page');
    res.render('user/login', {
      expressFlash: {
        invalidaction: req.flash('invalidaction'),
        invaliduser: req.flash('invaliduser'),
        invalidpassword: req.flash('invalidpassword'),
        userblocked: req.flash('userblocked'),
        error: req.flash('error'),
        userSuccess: req.flash('userSuccess')
      },
      currentPage: 'login'
    });

    // Clear all flash messages
    ['invalidaction', 'invaliduser', 'invalidpassword', 'userblocked', 'error', 'userSuccess'].forEach(key => {
      req.flash(key, null);
    });
  } catch (error) {
    console.log('Error while loading the login page:', error);
    res.render('user/error');
  }
};

// validaing the user credentials
const loginPost = async (req, res) => {
  try {
    console.log('validating the user credentials');
    const email = req.body.email;
    const password = req.body.password;
    const user = await userModel.findOne({ email: email });

    if (!user) {
      req.flash('invaliduser', 'User not found');
      return res.redirect('/login');
    }

    if (!user.status) {
      req.flash('userblocked', 'Your account has been suspended. Please contact customer support for assistance.');
      return res.redirect('/login');
    }

    if (!(await bcrypt.compare(password, user.password))) {
      req.flash('invalidpassword', 'Invalid password');
      return res.redirect('/login');
    }

    req.session.userId = user._id;
    req.session.username = user.name;
    req.session.user = user;
    req.session.isAuth = true;
    req.flash('success', 'Logged in successfully');
    return res.redirect('/');

  } catch (error) {
    console.error('Error in loginPost:', error);
    req.flash('error', 'An unexpected error occurred');
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

// validating the forgotten password
const forgotPasswordPost = async (req, res) => {
  try {
    console.log('validating the password');
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
    console.log('error while rendering the new password page', error);
    res.render('user/error');
  }
}

// validating the newly created password by the user
const newPasswordPost = async (req, res) => {
  try {
    console.log('entered the new password post method');
    const password = req.body.password;
    const cpassword = req.body.confirmPassword;
    if (password == cpassword) {
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

// rendering the about page
const about = async (req, res) => {
  try {
    console.log("rendering the about page for the user side");
    res.render('user/about');
  } catch (error) {
    console.log('error while rendering the about page', error);
    res.render('user/error');
  }
}

// rendering the contact page
const contact = async (req, res) => {
  try {
    console.log("rendering the contact page for the user");
    res.render('user/contact');
  } catch (error) {
    console.log('error while rendering the contact page', error);
    res.render('user/error');
  }
}

// logging out by the user
const logout = async (req, res) => {
  try {
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
    console.log('Error while logging out', err.message);
    res.render('user/error')
  }
}

module.exports = {
  index,
  findByCategory,
  signup,
  signUpPost,
  login,
  otp,
  verifyOtp,
  resendOtp,
  loginPost,
  googleSignIn,
  googleCallback,
  authFailure,
  forgotPassword,
  forgotPasswordPost,
  newpassword,
  newPasswordPost,
  about,
  contact,
  logout
};