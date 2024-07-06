const productModel = require('../../model/productModel');
const catagoryModel = require('../../model/catagoryModel');
const path = require('path');
const fs = require('fs');



// rendering the product listing page from the admin side

const product = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    try {
        const productSuccess = req.flash('productSuccess');
        const updateSuccess = req.flash('updateSuccess');
        const products = await productModel.find({}).populate({
           path: 'category',
            select:'name'
    }).sort({ _id: -1 }).limit(limit).skip(skip);
        console.log(products,'^^^^^^^^^^^^^^^^^^^');
        const count = await productModel.countDocuments({});
        console.log('count:', count);
        const totalpages = Math.ceil(count / limit);
        const pagesToShow = 5;
        let startPage = page + pagesToShow - 1;
        let endPage = Math.min(totalpages, startPage + pagesToShow - 1);
        if (endPage - startPage < pagesToShow - 1) {
            startPage = Math.max(1, endPage - pagesToShow + 1);
        }
        res.render('admin/products', {
            product: products,
            productSuccess,
            updateSuccess,
            currentPage: page,
            startPage: startPage,
            endPage: endPage,
            totalPages: totalpages,
            hasNextPage: page < totalpages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalpages,
            activePage: 'products',
            limit
        })
    } catch (error) {
        console.log('error while loading the product listing page fron the admin side',error);
        res.render('admin/servererror');
    }
}

// rendering addproduct page
const addProduct = async (req, res) => {
    try {
        console.log('rendered the admin side product adding page');
        const categories = await catagoryModel.find({});
        res.render('admin/addProduct', { category: categories });
    } catch (error) {
        console.log('error occurred while rendering the addproduct page...');
        res.render('admin/servererror');
    }
}

// adding the products by the admin

const addProductPost = async (req, res) => {
    try {
        console.log('entered into product adding page in the adminside');
        const category = req.body.category;
        console.log(category, '@@@@@@@@');
        const categories = await catagoryModel.findById(category);
        console.log(categories, '############');
        const categoryDiscount = categories.discount;
        console.log(categoryDiscount, '$$$$$$$$$$$$$$$$');
        const price = req.body.price;
        console.log(price,'&&&&&&&&&&&&&&');
        let discount = req.body.discount;
        console.log(discount,'**********************');

        if (categoryDiscount > discount) {
            discount = categoryDiscount;
        }

        const discountPrice = price - (price * (discount / 100));

        const product = new productModel({
            name: req.body.name,
            category: category,
            description: req.body.description,
            price: price,
            discount: discount,
            discountPrice: discountPrice,
            stock: [{
                size: 'XS',
                quantity: req.body.s1,
            },
            {
                size: 'S',
                quantity: req.body.s2,
            },
            {
                size: 'M',
                quantity: req.body.s3,
            },
            {
                size: 'L',
                quantity: req.body.s4,
            },
            {
                size: 'XL',
                quantity: req.body.s5,
            }],
            totalstock: parseInt(req.body.s1) + parseInt(req.body.s2) + parseInt(req.body.s3) + parseInt(req.body.s4) + parseInt(req.body.s5),
            image: req.files.map(file => file.path)
        })

        await product.save();
        req.flash('productSuccess', 'Product added successfully');
        res.redirect('/admin/products');
    } catch (error) {
        console.log('error while adding the products from the admin side', error);
        res.render('admin/servererror');
    }
}

// listing and unlisting a product

const unlist = async (req, res) => {
    try {
        console.log('inside the product listing page');
        const id = req.params.id;
        const product = await productModel.findById(id);
        product.status = !product.status;
        await product.save();
        res.redirect('/admin/products');
    } catch (error) {
        console.log('error while listing & unlisting the product', error)
        res.render('admin/servererror');
    }
}

// rendering the product update page from user side
const updateProduct = async (req, res) => {
    try {
        console.log('entered the product updating page from the admin side');
        const id = req.params.id;
        const product = await productModel.findById(id);
        res.render('admin/updateproduct', { product });
    } catch (error) {
        console.log('error occured while rendering the product updating page', error);
        res.render('admin/servererror');
    }
}

// updating the existing product from the admin side
const updateProductPost = async (req, res) => {
    try {
        console.log('updating the selected product from admin side');
        const id = req.params.id;
        const product = await productModel.findOne({ _id: id });
        const category = product.category;
        const categories = await catagoryModel.findById(category);
        const categoryDiscount = categories.discount;
        const price = req.body.price;
        let discount = req.body.discount;
        if (categoryDiscount > discount) {
            discount = categoryDiscount;
        }
        const discountPrice = price - (price * (discount / 100));
        product.name = req.body.name;
        product.description = req.body.description;
        product.price = price;
        product.discount = discount;
        product.discountPrice = discountPrice;
        product.stock = [
            { size: 'XS', quantity: req.body.s1 },
            { size: 'S', quantity: req.body.s2 },
            { size: 'M', quantity: req.body.s3 },
            { size: 'L', quantity: req.body.s4 },
            { size: 'XL', quantity: req.body.s5 },
        ]
        product.totalstock = parseInt(req.body.s1) + parseInt(req.body.s2) + parseInt(req.body.s3) + parseInt(req.body.s4) + parseInt(req.body.s5);
        await product.save();
        req.flash('updateSuccess', 'product updated successfully');
        res.redirect('/admin/products');
    } catch (error) {
        console.log('error while updating the selected product', error);
        res.render('admin/servererror');
    }
}



// const updateProductPost = async (req, res) => {
//     try {
//         console.log('Updating the selected product from admin side');
//         console.log(req.body);
//         const id = req.params.id;
//         const product = await productModel.findOne({ _id: id });

//         // Ensure required fields are present and valid
//         const { name, description, price, s1, s2, s3, s4, s5 } = req.body;

//         if (!name || !description || !price || [s1, s2, s3, s4, s5].some(size => size === undefined)) {
//             throw new Error("All fields are required.");
//         }

//         product.name = name;
//         product.description = description;
//         product.price = parseFloat(price);
//         product.stock = [
//             { size: 'XS', quantity: parseInt(s1) },
//             { size: 'S', quantity: parseInt(s2) },
//             { size: 'M', quantity: parseInt(s3) },
//             { size: 'L', quantity: parseInt(s4) },
//             { size: 'XL', quantity: parseInt(s5) },
//         ];


//         const totalStock = parseInt(s1) + parseInt(s2) + parseInt(s3) + parseInt(s4) + parseInt(s5);
//         if (isNaN(totalStock)) {
//             throw new Error("Total stock calculation failed.");
//         }
//         product.totalstock = totalStock;


//         await product.save();
//         req.flash('updateSuccess', 'Product updated successfully');
//         res.redirect('/admin/products');
//     } catch (error) {
//         console.log('Error while updating the selected product:', error);
//         res.render('admin/servererror', { error: error.message });
//     }
// };

// rendering the update image page
const updateImage = async (req, res) => {
    try {
        console.log('entered into the image updating page from the admin side....');
        const id = req.params.id;
        console.log(id, '###########8###########');
        const imageNotFound = req.flash('imageNotFound');
        const product = await productModel.findById(id);
        console.log(product, '--------------------->');
        console.log(product.image, '111111111111111111');
        res.render('admin/updateimage', { product: product, imageNotFound });
    } catch (error) {
        console.log('error occured while editing the image from the admin side', error);
        res.render('admin/servererror');
    }
}


// updating the already inserted product images

const updateImagePost = async (req, res) => {
    try {
        console.log('upating the already added image from the adminside');
        const id = req.params.id;
        const newimage = req.files.map(file => file.path);
        const Product = await productModel.findById(id);
        Product.image.push(...newimage);
        Product.save();
        res.redirect('/admin/updateproduct/' + id);
    } catch (error) {
        console.log('error occured while updating the image from the admin side', error);
        res.render('admin/servererror');
    }
}

// deleting the selected image from already uploaded images

const deleteImage = async (req, res) => {
    try {
        console.log('deleting the selected image from the already uploaded images');
        const pid = req.query.pid;
        const filename = req.query.filename;
        if (filename) {
            try {
                console.log('image is going deleted permanently');
                await productModel.updateOne({ _id: pid }, { $pull: { image: filename } });
                res.redirect('/admin/updateimage/' + pid);
                console.log('image deleted permanently');
            } catch (error) {
                console.log('didnt able to delete the image permanently');
                res.status(500).send('internal server error');
            }
        } else {
            console.log('selected image not found');
            req.flash('imageNotFound', "Image don't found");
            res.redirect('/admin/editimage/' + pid);
        }
    } catch (error) {
        console.log('OOOPS..........!', error);
        res.render('admin/servererror');
    }
}



module.exports = { product, addProduct, addProductPost, unlist, updateProduct, updateProductPost, updateImage, updateImagePost, deleteImage }