const productModel = require('../../model/productModel');
const catagoryModel = require('../../model/catagoryModel');
const flash = require('express-flash');


// rendering the user side shoplisting page...
const shoplist = async (req, res) => {
    try {
        console.log('rendering the user side product listing page');
        const products = await productModel.find({ status: true });
        res.render('user/shoplist', { products: products });
    } catch (error) {
        console.log('error occured while rendering the user side shoplisting page ', error);
        res.render('user/error');
    }
}

// rendering the user side single shopping product page...

const shopSingle = async (req, res) => {
    try {
        console.log('entering the single product shopping page');
        const productId = req.params.id;
        const categories = await catagoryModel.find();
        let singleProduct = await productModel.findById(productId);
        console.log(singleProduct);
        if (singleProduct.totalstock === 0) {
            let pass = 'Out of Stock';
        }
        const products = await productModel.find({ category: singleProduct.category });
        const productCount = req.session.cartCount;
        console.log(categories, singleProduct, products, productCount);
        res.render('user/shopsingle', { singleProduct, products });
    } catch (error) {
        console.log('Error occure while rendering the single product shopping page', error);
        res.render('user/error');
    }
}


module.exports = { shoplist, shopSingle };