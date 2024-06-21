const express = require('express');
const userRoute = express.Router();
const userController = require("../controllers/usercontroller/userController");
const productController = require('../controllers/usercontroller/productController');
const { ifLogged, logged } = require('../middlewares/userAuth');
require('../googleAuth');
const passport = require('passport');




userRoute.get('/', userController.index);
userRoute.get('/login', userController.login);
userRoute.post('/login', userController.loginPost);
userRoute.get('/signup', ifLogged, userController.signup);
userRoute.post('/signup', userController.signUpPost);


userRoute.get('/googlesignin', userController.googleSignIn);
userRoute.get('/auth/google/callback', userController.googleCallback);
userRoute.get('/auth/failure', userController.authFailure);

userRoute.get('/otp', userController.otp);
userRoute.post('/verifyotp', userController.verifyOtp);
userRoute.post('/resendotp', userController.resendOtp);
userRoute.get('/forgot', userController.forgotPassword);
userRoute.post('/forgot', userController.forgotPasswordPost);
userRoute.get('/newpassword', userController.newpassword);
userRoute.post('/newpassword', userController.newPasswordPost);

userRoute.get('/shop', productController.shoplist);
userRoute.get('/shopsingle/:id', productController.shopSingle);


userRoute.get('/logout', userController.logout);

module.exports = userRoute;
