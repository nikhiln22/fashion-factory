const express = require('express');
const userRoute = express.Router();
const userController = require("../controllers/usercontroller/userController");
const productController = require('../controllers/usercontroller/productController');
const profileController = require('../controllers/usercontroller/profileController');
const cartController = require('../controllers/usercontroller/cartController');
const checkOutController = require('../controllers/usercontroller/checkOutController');
const paymentController = require('../controllers/usercontroller/paymentController');
const { ifLogged, logged, signed, forgot } = require('../middlewares/userAuth');
require('../../src/config/googleAuth');
const passport = require('passport');


userRoute.get('/googlesignin', userController.googleSignIn);
userRoute.get('/google/callback', userController.googleCallback);
userRoute.get('/auth/failure', userController.authFailure);


userRoute.get('/', userController.index);
userRoute.get('/productcat', userController.findByCategory);
userRoute.get('/login', ifLogged, userController.login);
userRoute.post('/login', userController.loginPost);
userRoute.get('/signup', ifLogged, userController.signup);
userRoute.post('/signup', userController.signUpPost);
userRoute.get('/about', userController.about);
userRoute.get('/contact', userController.contact);


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
userRoute.get('/singleorder', logged, profileController.singleOrder);
userRoute.post('/returnorder', logged, profileController.returnOrder);
userRoute.post('/cancelproduct', logged, profileController.cancelProduct);
userRoute.get('/invoice', logged, profileController.invoicePage);
userRoute.get('/invoicedownload', logged, profileController.invoiceDownload);
userRoute.get('/wallet', logged, profileController.wallet);
userRoute.post('/addwallet', logged, profileController.addWallet);

userRoute.post('/addfund', logged, paymentController.addFund);
userRoute.post('/verifyfund', logged, paymentController.fundVerification);


userRoute.get('/shop', productController.shop);
userRoute.get('/shopsingle', productController.shopSingle);
userRoute.get('/highlow', productController.highLow);
userRoute.get('/lowhigh', productController.lowHigh);
userRoute.get('/atoz', productController.aToZ);
userRoute.get('/ztoa', productController.zToa);
userRoute.get('/catsort', productController.catfilter);

userRoute.get('/search', productController.search);

userRoute.get('/wishlist', logged, productController.wishlist);
userRoute.post('/wishlist', logged, productController.addWishlist);
userRoute.post('/removewishlist', logged, productController.removeFromWishlist);


userRoute.get('/cart', logged, cartController.showCart);
userRoute.post('/addcart/:id', logged, cartController.addCart);
userRoute.post('/updatecartquantity/:productId/:size', logged, cartController.updateCart);
userRoute.get('/delete/:id/:size', logged, cartController.deleteCart);


userRoute.get('/checkout', logged, checkOutController.checkout);
userRoute.post('/applycoupon', logged, checkOutController.applyCoupon);
userRoute.post('/removecoupon', logged, checkOutController.removeCoupon);


userRoute.post('/placeorder', logged, checkOutController.placeOrder);
userRoute.post('/placeorderwallet', logged, checkOutController.placeOrderWallet);
userRoute.post('/createorder', logged, paymentController.createOrder);
userRoute.post('/verification', logged, paymentController.verifyPayment);
userRoute.post('/retrypayment', logged, checkOutController.retryPayment);
userRoute.get('/orderconfirmation', logged, checkOutController.orderConfirmation);


userRoute.get('/logout', userController.logout);

module.exports = userRoute;
