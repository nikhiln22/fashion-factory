const express = require('express');
const adminRoute = express.Router();
const adminController = require('../controllers/admincontroller/adminController');
const catagoryController = require('../controllers/admincontroller/catagoryController');
const productController = require('../controllers/admincontroller/productController');
const orderController = require('../controllers/admincontroller/orderController');
const { adAuth } = require('../middlewares/adminAuth');
const multer = require('multer');

adminRoute.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' })


adminRoute.get('/', adminController.adlogin);
adminRoute.post('/adminloginPost', adminController.adloginpost);
adminRoute.get('/adminpanel', adAuth, adminController.adminpanel);

adminRoute.get('/users', adAuth, adminController.users);
adminRoute.get('/userblock/:id', adAuth, adminController.checkUserStatus);

adminRoute.get('/catagories', adAuth, catagoryController.catagory);
adminRoute.get('/addcategories', adAuth, catagoryController.addCategory);
adminRoute.post('/addcategories', adAuth, catagoryController.addCatagoryPost);
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

adminRoute.get('/orders', adAuth, orderController.orders);
adminRoute.get('/singleorder', adAuth, orderController.singleOrder);
adminRoute.post('/updatestatus', adAuth, orderController.updateStatus);

adminRoute.get('/logout', adAuth, adminController.adLogOut);

module.exports = adminRoute;