const express = require('express');
const userRoute = express.Router();
const userController = require("../controllers/usercontroller/userController");
const { ifLogged, logged } = require('../middlewares/userAuth');


userRoute.get('/', userController.index);

userRoute.get('/login', ifLogged, userController.login);
userRoute.post('/login', userController.loginPost);

userRoute.get('/signup', userController.signup);
userRoute.post('/signupPost', userController.signupPost);

userRoute.get('/otp', userController.otp);
userRoute.post('/verifyotp', userController.verifyOtp);
userRoute.post('/resendOtp', userController.resendOtp);

userRoute.get('/logout',userController.logout);

module.exports = userRoute;