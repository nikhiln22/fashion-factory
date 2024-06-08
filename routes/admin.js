const express = require('express');
const adminRoute = express.Router();
const adminController = require('../controllers/admincontroller/adminController');
const catagoryController = require('../controllers/admincontroller/catagoryController');
const { adAuth } = require('../middlewares/adminAuth');


adminRoute.get('/', adminController.adlogin);
adminRoute.post('/adminloginPost', adminController.adloginpost);
adminRoute.get('/adminpanel', adAuth, adminController.admin_panel);

adminRoute.get('/users', adAuth, adminController.users);
adminRoute.get('/userblock/:id', adAuth, adminController.checkUserStatus);

adminRoute.get('/catagories', adAuth, catagoryController.catagory);
adminRoute.get('/Addcategories', adAuth, catagoryController.Add_category);
adminRoute.post('/Addcategories', adAuth, catagoryController.addCatagoryPost);


adminRoute.get('/unlistcat/:id', adAuth, catagoryController.unlist);
adminRoute.get('/updatecatagory/:id', adAuth, catagoryController.updateCatagory);
adminRoute.post('/updatecatagory/:id',adAuth,catagoryController. updateCatagoryPost);

module.exports = adminRoute;