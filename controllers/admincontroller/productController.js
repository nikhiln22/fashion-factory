// const productModel = require('../../model/productModel');
// const catagoryModel = require('../../model/catagoryModel');
// const path = require('path');
// const fs = require('fs');

// const product = async (req, res) => {
//     try {
//         const productSuccess = req.flash('productSucess');
//         const updateSuccess = req.flash('updateSuccess');
//         const productModel = await productModel.find().populate({
//             path: 'catagory',
//             select: 'name'
//         });
//         res.render('admin/products', { product: products, productSuccess, updateSuccess });
//     } catch (error) {
//         console.log('error while loading the product page from the admin side');
//         res.render('admin/servererror');
//     }
// }
