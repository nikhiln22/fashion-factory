const express = require('express');
const adminRoute = express.Router();
const adminController = require('../controllers/admincontroller/adminController');
const catagoryController = require('../controllers/admincontroller/catagoryController');
const productController = require('../controllers/admincontroller/productController');
const orderController = require('../controllers/admincontroller/orderController');
const couponController = require('../controllers/admincontroller/couponController');
const offerController = require('../controllers/admincontroller/offerController');
const salesReportController = require('../controllers/admincontroller/salesReportController');
const { adAuth } = require('../middlewares/adminAuth');
const multer = require('multer');

adminRoute.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' })



adminRoute.get('/', adminController.adlogin);
adminRoute.post('/adminlogin', adminController.adloginpost);
adminRoute.get('/dashboard', adAuth, adminController.dashboard);

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
adminRoute.get('/returnrequests', adAuth, orderController.returnRequest);
adminRoute.get('/approvereturn/:orderId', adAuth, orderController.approveReturn);
adminRoute.get('/rejectreturn/:orderId', adAuth, orderController.rejectReturn);


adminRoute.get('/coupons', adAuth, couponController.coupons);
adminRoute.get('/addcoupon', adAuth, couponController.addCoupon);
adminRoute.post('/addcoupon', adAuth, couponController.newCoupon);
adminRoute.get('/unlistcoupon/:id', adAuth, couponController.unlistCoupon);
adminRoute.get('/updatecoupon/:id', adAuth, couponController.updateCouponPage);
adminRoute.post('/updatecoupon', adAuth, couponController.updateCoupon);


adminRoute.get('/offers', adAuth, offerController.offer);
adminRoute.post('/offertype', adAuth, offerController.offerType);
adminRoute.post('/addoffer', adAuth, offerController.addOffer);
adminRoute.get('/editoffer', adAuth, offerController.editOfferPage);
adminRoute.post('/prodidsave', adAuth, offerController.offerProdIdSave);
adminRoute.post('/catidsave', adAuth, offerController.offercatIdSave);
adminRoute.patch('/editoffer', adAuth, offerController.editoffer);
adminRoute.post('/deleteoffer', adAuth, offerController.deleteOffer);

adminRoute.get('/checkdataexist', adAuth, salesReportController.checkDataExist);
adminRoute.get('/dailysales', adAuth, (req, res) => {
    if (req.query.format === 'pdf') {
        console.log('entered in the if case in daily');
        salesReportController.dailySalesReport(req, res);
    } else {
        console.log('entered into the else');
        salesReportController.dailySalesReport(req, res);
    }
});

adminRoute.get('/weeklysales', adAuth, (req, res) => {
    if (req.query.format === 'pdf') {
        salesReportController.weeklySalesReport(req, res);
    } else {
        salesReportController.weeklySalesReport(req, res);
    }
});
adminRoute.get('/monthlysales', adAuth, (req, res) => {
    if (req.query.format === 'pdf') {
        salesReportController.monthlySalesReport(req, res);
    } else {
        salesReportController.monthlySalesReport(req, res);
    }
});
adminRoute.get('/yearlysales', adAuth, (req, res) => {
    if (req.query.format === 'pdf') {
        salesReportController.yearlySalesReport(req, res);
    } else {
        salesReportController.yearlySalesReport(req, res);
    }
});

adminRoute.post('/customdate', adAuth, (req, res) => {
    if (req.query.format === 'pdf') {
        console.log('hiting the route in the if case');
        salesReportController.customDateSort(req, res);
    } else {
        console.log('hitting the route in the else case');
        salesReportController.customDateSort(req, res);
    }
});

adminRoute.get('/yearlychart', adAuth, salesReportController.yearlyChart);
adminRoute.get('/bestsellingproducts', adAuth, salesReportController.bestSellingProduct);
adminRoute.get('/bestsellingcategories', adAuth, salesReportController.bestSellingCategory);

adminRoute.get('/logout', adAuth, adminController.adLogOut);

module.exports = adminRoute;