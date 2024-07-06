const express = require('express');
const userRoute = express.Router();
const userController = require("../controllers/usercontroller/userController");
const productController = require('../controllers/usercontroller/productController');
const profileController = require('../controllers/usercontroller/profileController');
const cartController = require('../controllers/usercontroller/cartController');
const checkOutController = require('../controllers/usercontroller/checkOutController');
const { ifLogged, logged, signed, forgot } = require('../middlewares/userAuth');
require('../googleAuth');
const passport = require('passport');




userRoute.get('/', userController.index);
userRoute.get('/login', ifLogged, userController.login);
userRoute.post('/login', userController.loginPost);
userRoute.get('/signup', ifLogged, userController.signup);
userRoute.post('/signup', userController.signUpPost);


userRoute.get('/googlesignin', userController.googleSignIn);
userRoute.get('/auth/google/callback', userController.googleCallback);
userRoute.get('/auth/failure', userController.authFailure);

userRoute.get('/otp', signed, userController.otp);
userRoute.post('/verifyotp', userController.verifyOtp);
userRoute.post('/resendotp', userController.resendOtp);
userRoute.get('/forgot', userController.forgotPassword);
userRoute.post('/forgot', userController.forgotPasswordPost);
userRoute.get('/newpassword', forgot, userController.newpassword);
userRoute.post('/newpassword', forgot, userController.newPasswordPost);


userRoute.get('/profile', logged, profileController.userProfile);
userRoute.get('/updateprofile', logged, profileController.updateProfile);
userRoute.post('/updateprofile', logged, profileController.updateProfilePost);
userRoute.get('/resetpassword', logged, profileController.resetpassword);
userRoute.post('/resetpassword', logged, profileController.resetPasswordPost);
userRoute.get('/address', logged, profileController.showAddress);
userRoute.get('/editaddress/:id', logged, profileController.editAddress);
userRoute.post('/editaddress/:id', logged, profileController.editAddressPost);
userRoute.get('/deladdress/:id', logged, profileController.delAddress);
userRoute.get('/addaddress', logged, profileController.addAddress);
userRoute.post('/addaddress', logged, profileController.addAddressPost);
userRoute.get('/orders', logged, profileController.order);
userRoute.get('/singleorder', logged, profileController.singleorder);
userRoute.post('/cancelproduct', logged, profileController.cancelProduct);


userRoute.get('/shop', productController.shoplist);
userRoute.get('/shopsingle/:id', productController.shopSingle);

userRoute.get('/cart', logged, cartController.showCart);
userRoute.post('/addcart/:id', logged, cartController.addCart);
userRoute.post('/updatecartquantity/:productId/:size', logged, cartController.updateCart);
userRoute.get('/delete/:id/:size', logged, cartController.deleteCart);

userRoute.get('/checkout', logged, checkOutController.checkout);
userRoute.post('/placeorder', logged, checkOutController.placeOrder);
userRoute.get('/orderconfirmation', logged, checkOutController.orderConfirmation);


userRoute.get('/logout', userController.logout);

module.exports = userRoute;
