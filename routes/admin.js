const express = require('express');
const adminRoute = express.Router();
const adminController = require('../controllers/admincontroller/adminController');
const catagoryController = require('../controllers/admincontroller/catagoryController');
const productController = require('../controllers/admincontroller/productController');
const { adAuth } = require('../middlewares/adminAuth');
const multer = require('multer');

adminRoute.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' })


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
adminRoute.post('/updatecatagory/:id', adAuth, catagoryController.updateCatagoryPost);


adminRoute.get('/products', adAuth, productController.product);
adminRoute.get('/addproduct', adAuth, productController.addProduct);
adminRoute.post('/addproduct', adAuth, upload.array('images'), productController.addProductPost);
adminRoute.get('/unlist/:id', adAuth, productController.unlist);
adminRoute.get('/updateProduct/:id', adAuth, productController.updateProduct);
adminRoute.post('/updateProduct/:id', adAuth, productController.updateProductPost);
adminRoute.get('/updateimage/:id', adAuth, productController.updateImage);
adminRoute.get('/deleteimage', adAuth, productController.deleteImage);
adminRoute.post('/updateimage/:id', adAuth, upload.array('images'), productController.updateImagePost);


adminRoute.get('/logout', adAuth, adminController.adLogOut);

module.exports = adminRoute;