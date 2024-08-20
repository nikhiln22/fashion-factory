const productModel = require('../../model/productModel');
const catagoryModel = require('../../model/catagoryModel');
const cartModel = require('../../model/cartModel');
const offerModel = require('../../model/offerModel');
const userModel = require('../../model/userModel');



// rendering the user side shoplisting page...
const shop = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const selectedCategory = req.query.category || null;
    try {
        let userId = req.session.userId;
        let userData = await userModel.findOne({ _id: userId, status: true });
        let categoryData = await catagoryModel.find({});
        let offerData = await offerModel.find({
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        let productData = await productModel.find({ status: true }).sort({ _id: -1 }).limit(limit).skip(skip).populate('category');

        productData = productData.map((product) => {
            let discountedPrice = product.price;
            let appliedOffer = null;

            offerData.forEach((offer) => {
                if (offer.offerType === 'product' && offer.productId.includes(product._id.toString())) {
                    let newDiscountedPrice = product.price - (product.price * offer.discount / 100);
                    if (newDiscountedPrice < discountedPrice) {
                        discountedPrice = Math.round(newDiscountedPrice);
                        appliedOffer = offer;
                    }
                }
            });

            offerData.forEach((offer) => {
                if (offer.offerType === 'category' && offer.categoryId.includes(product.category._id.toString())) {
                    let newDiscountedPrice = product.price - (product.price * offer.discount / 100);
                    if (newDiscountedPrice < discountedPrice) {
                        discountedPrice = Math.round(newDiscountedPrice);
                        appliedOffer = offer;
                    }
                }
            });

            return {
                ...product.toObject(),
                originalPrice: product.price,
                discountedPrice,
                appliedOffer: appliedOffer ? {
                    offerName: appliedOffer.offerName,
                    discount: appliedOffer.discount,
                } : null,
                offerText: appliedOffer ? `${appliedOffer.discount}% off` : '',
            };
        });

        const totalProducts = await productModel.countDocuments({ status: true });
        const totalPages = Math.ceil(totalProducts / limit);

        const cartCount = userId ? await cartModel.countDocuments({ userId }) : 0;
        const wishlistCount = userData ? userData.wishlist.length : 0;

        res.render('user/shop', {
            product: productData,
            categories: categoryData,
            userData,
            cartCount,
            wishlistCount,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            selectedCategory: selectedCategory
        });
    } catch (error) {
        console.log('error occurred while rendering the shop page', error);
        res.render('user/error');
    }
}

// rendering the user side single shopping product page...
const shopSingle = async (req, res) => {
    try {
        const productId = req.query.productId;
        let userId = req.session.userId;
        const productData = await productModel.findOne({ _id: productId });
        let categoryData = await productModel.find({ category: productData.category, _id: { $ne: productId } });

        const userData = userId ? await userModel.findOne({ _id: userId }) : null;
        const cartCount = userId ? (await cartModel.find({ userId: userId })).length : 0;
        const wishlistCount = userData ? userData.wishlist.length : 0;

        const offerData = await offerModel.find({
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        let productDiscountedPrice = productData.price;
        let categoryDiscountedPrice = productData.price;
        let discountedPrice;
        let appliedOffer = null;

        offerData.forEach(offer => {
            if (offer.offerType === 'product' && offer.productId.includes(productData._id.toString())) {
                productDiscountedPrice = productData.price - (productData.price * offer.discount / 100);
            }
            if (offer.offerType === 'category' && offer.categoryId.includes(productData.category.toString())) {
                categoryDiscountedPrice = productData.price - (productData.price * offer.discount / 100);
            }
        });

        if (productDiscountedPrice <= categoryDiscountedPrice) {
            appliedOffer = offerData.find(offer => offer.offerType === 'product' && offer.productId.includes(productData._id.toString()));
            discountedPrice = Math.round(productDiscountedPrice);
        } else {
            appliedOffer = offerData.find(offer => offerData.offerType === 'category' && offer.categoryId.includes(productData.category.toString()));
            discountedPrice = Math.round(categoryDiscountedPrice);
        }

        categoryData = categoryData.map(item => {
            let itemDiscountedPrice = item.price;
            let itemAppliedOffer = null;

            offerData.forEach(offer => {
                if (offer.offerType === 'product' && offer.productId.includes(item._id.toString())) {
                    itemDiscountedPrice = item.price - (item.price * offer.discount / 100);
                }
                if (offer.offerType === 'category' && offer.categoryId.includes(item.category.toString())) {
                    itemDiscountedPrice = item.price - (item.price * offer.discount / 100);
                }
            });

            if (itemDiscountedPrice < item.price) {
                itemAppliedOffer = offerData.find(offer => (offer.offerType === 'product' && offer.productId.includes(item._id.toString())) || (offer.offerType === 'category' && offer.categoryId.includes(item.category.toString())));
            }

            return {
                ...item.toObject(),
                originalPrice: item.price,
                discountedPrice: itemAppliedOffer ? Math.round(itemDiscountedPrice) : null,
                appliedOffer: itemAppliedOffer ? { offerName: itemAppliedOffer.offerName, discount: itemAppliedOffer.discount } : null
            };
        });

        res.render('user/shopsingle', {
            product: { ...productData.toObject(), originalPrice: productData.price, discountedPrice, appliedOffer: appliedOffer ? { offerName: appliedOffer.offerName, discount: appliedOffer.discount } : null },
            userData: userData,
            categoryData,
            cartCount,
            wishlistCount
        })

    } catch (error) {
        console.log('Error occured while rendering the single product shopping page', error);
        res.render('user/error');
    }
}



// products sorting from price high to low
const highLow = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const categoryId = req.query.categoryId;
    try {
        console.log('rendering the page where the price sorts from the highest value to the lowest');
        const userId = req.session.userId;
        const userdata = userId ? await userModel.findOne({ _id: userId }) : null;

        let productsQuery = categoryId ? productModel.find({ category: categoryId }) : productModel.find();

        let products = await productModel.find().populate('category');
        const categories = await catagoryModel.find();

        const totalProductsQuery = categoryId ? productModel.countDocuments({ status: true, category: categoryId }) : productModel.countDocuments({ status: true });
        const totalProducts = await totalProductsQuery;

        // const totalProducts = await productModel.countDocuments({ status: true });
        const totalPages = Math.ceil(totalProducts / limit);

        let offerdata = await offerModel.find({
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });
        const applyOffer = (product) => {
            let discountedPrice = product.price;
            let appliedOffer = null;
            offerdata.forEach(offer => {
                const productMatchesOffer = offer.offerType === 'product' && offer.productId.some(id => id.toString() === product._id.toString());
                const categoryMatchesOffer = offer.offerType === 'category' && product.category && offer.categoryId.some(id => id.toString() === product.category._id.toString());

                if (productMatchesOffer || categoryMatchesOffer) {
                    let newDiscountedPrice = product.price - (product.price * offer.discount / 100);
                    if (newDiscountedPrice < discountedPrice) {
                        discountedPrice = Math.round(newDiscountedPrice);
                        appliedOffer = offer;
                    }
                }
            });
            return { discountedPrice, appliedOffer };
        };

        products = products.map(product => {
            const { discountedPrice, appliedOffer } = applyOffer(product);
            return {
                ...product._doc,
                originalPrice: product.price,
                discountedPrice,
                appliedOffer: appliedOffer ? {
                    offerName: appliedOffer.offerName,
                    discount: appliedOffer.discount
                } : null,
                offerText: appliedOffer ? `${appliedOffer.discount}% off` : ''
            };
        });

        products = products.sort((a, b) => b.discountedPrice - a.discountedPrice);
        products = products.slice(skip, skip + limit);

        const cartCount = userId ? await cartModel.countDocuments({ userId: userId }) : 0;
        const wishlistCount = userdata ? userdata.wishlist.length : 0;

        res.render('user/shop', {
            product: products,
            categories,
            userdata,
            wishlistCount,
            cartCount,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            selectedCategory: categoryId
        })
    } catch (error) {
        console.log('error while displaying the sorted products', error);
        res.render('user/error');
    }
}

// products sorting form price low to high
const lowHigh = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const categoryId = req.query.categoryId;
    try {
        console.log('rendering the page where the price sorts from the lowest value to the highest');
        const userId = req.session.userId;
        const userdata = userId ? await userModel.findOne({ _id: userId }) : null;

        let productsQuery = categoryId ? productModel.find({ category: categoryId }) : productModel.find();


        let products = await productModel.find().populate('category');
        const categories = await catagoryModel.find();

        const totalProductsQuery = categoryId ? productModel.countDocuments({ status: true, category: categoryId }) : productModel.countDocuments({ status: true });
        const totalProducts = await totalProductsQuery;

        // const totalProducts = await productModel.countDocuments({ status: true });
        const totalPages = Math.ceil(totalProducts / limit);
        let offerdata = await offerModel.find({
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });
        const applyOffer = (product) => {
            let discountedPrice = product.price;
            let appliedOffer = null;
            offerdata.forEach(offer => {
                const productMatchesOffer = offer.offerType === 'product' && offer.productId.some(id => id.toString() === product._id.toString());
                const categoryMatchesOffer = offer.offerType === 'category' && product.category && offer.categoryId.some(id => id.toString() === product.category._id.toString());

                if (productMatchesOffer || categoryMatchesOffer) {
                    let newDiscountedPrice = product.price - (product.price * offer.discount / 100);
                    if (newDiscountedPrice < discountedPrice) {
                        discountedPrice = Math.round(newDiscountedPrice);
                        appliedOffer = offer;
                    }
                }
            });
            return { discountedPrice, appliedOffer };
        };

        products = products.map(product => {
            const { discountedPrice, appliedOffer } = applyOffer(product);
            return {
                ...product._doc,
                originalPrice: product.price,
                discountedPrice: discountedPrice || product.price,
                appliedOffer: appliedOffer ? {
                    offerName: appliedOffer.offerName,
                    discount: appliedOffer.discount
                } : null,
                offerText: appliedOffer ? `${appliedOffer.discount}% off` : ''
            };
        });

        products = products.sort((a, b) => a.discountedPrice - b.discountedPrice);
        products = products.slice(skip, skip + limit);

        const cartCount = userId ? await cartModel.countDocuments({ userId: userId }) : 0;
        const wishlistCount = userdata ? userdata.wishlist.length : 0;

        res.render('user/shop', {
            product: products,
            categories,
            userdata,
            wishlistCount,
            cartCount,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            selectedCategory: categoryId
        })
    } catch (error) {
        console.log('error while displaying the sorted products', error);
        res.render('user/error');
    }
}

// sorting the products from the a To Z
const aToZ = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const selectedCategory = req.query.category;
    try {
        console.log('rendering the page where the product name sorts from a to Z');
        const userId = req.session.userId;
        const userdata = userId ? await userModel.findOne({ _id: userId }) : null;

        let matchStage = { status: true };
        if (selectedCategory) {
            matchStage.category = selectedCategory;
        }

        const totalProducts = await productModel.countDocuments({ matchStage });
        const totalPages = Math.ceil(totalProducts / limit);
        let aggregationPipeline = [
            { $match: matchStage },
            {
                $addFields: {
                    lowerCaseName: { $toLower: "$name" }
                }
            },
            {
                $sort: {
                    lowerCaseName: 1
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            },
            {
                $project: {
                    lowerCaseName: 0
                }
            }
        ];

        let products = await productModel.aggregate(aggregationPipeline)

        products.forEach((item => {
            console.log(item.name);
        }))
        const categories = await catagoryModel.find();

        const cartCount = userId ? await cartModel.countDocuments({ userId: userId }) : 0;
        const wishlistCount = userdata ? userdata.wishlist.length : 0;

        res.render('user/shop', {
            product: products,
            categories,
            cartCount,
            wishlistCount,
            userdata,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            selectedCategory: selectedCategory
        })
    } catch (error) {
        console.log('error happened while displaying the sorted products', error);
        res.render('user/error');
    }
}

// sorting the products from the z to a
const zToa = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    try {
        console.log('rendering the page where the product name sorts from a to Z');
        const userId = req.session.userId;
        const userdata = userId ? await userModel.findOne({ _id: userId }) : null;
        const totalProducts = await productModel.countDocuments({ status: true });
        const totalPages = Math.ceil(totalProducts / limit);
        let products = await productModel.aggregate([
            {
                $addFields: {
                    lowerCaseName: { $toLower: "$name" }
                }
            },
            {
                $sort: {
                    lowerCaseName: -1
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            },
            {
                $project: {
                    lowerCaseName: 0
                }
            }
        ]);

        products = await productModel.populate(products, { path: 'category' });
        const categories = await catagoryModel.find();

        const cartCount = userId ? await cart.countDocuments({ userId: userId }) : 0;
        const wishlistCount = userId ? userdata.wishlist.length : 0;

        res.render('user/shop', {
            product: products,
            categories,
            cartCount,
            wishlistCount,
            userdata,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages
        })
    } catch (error) {
        console.log('error happened while displaying the sorted products', error);
        res.render('user/error');
    }
}

// filtering the products based on the category
const catfilter = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    try {
        console.log('filtering the products based on the category');
        const userId = req.session.userId;
        const { id } = req.query;
        const userdata = userId ? await userModel.findOne({ _id: userId }) : null;

        let products = await productModel.find({ category: id, status: true }).sort({ _id: -1 }).limit(limit).skip(skip);

        // console.log('products:', products);
        const categories = await catagoryModel.find();
        // console.log('categories:', categories);

        let offerdata = await offerModel.find({
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        products = products.map(product => {
            let discountedPrice = product.price;
            let appliedOffer = null;

            offerdata.forEach(offer => {
                if (offer.offerType === 'product' && offer.productId.includes(product._id.toString())) {
                    let newDiscountedPrice = product.price - (product.price * offer.discount / 100);
                    if (newDiscountedPrice < discountedPrice) {
                        discountedPrice = Math.round(newDiscountedPrice);
                        appliedOffer = offer;
                    }
                }
            });

            offerdata.forEach(offer => {
                if (offer.offerType === 'category' && offer.categoryId.includes(id)) {
                    let newDiscountedPrice = product.price - (productprice * offer.discountPrice / 100);
                    if (newDiscountedPrice < discountedPrice) {
                        discountedPrice = Math.round(newDiscountedPrice);
                        appliedOffer = offer;
                    }
                }
            });

            return {
                ...product.toObject(),
                originalPrice: product.price,
                discountedPrice,
                appliedOffer: appliedOffer ? {
                    offerName: appliedOffer.offerName,
                    discount: appliedOffer.discount
                } : null,
                offerText: appliedOffer ? `${appliedOffer.discount}% Off` : ''
            };
        });

        const totalProducts = await productModel.countDocuments({ category: id, status: true });
        const totalPages = Math.ceil(totalProducts / limit);
        console.log('totalPages:', totalPages);
        const cartCount = userId ? await cartModel.countDocuments({ userId: userId }) : 0;
        const wishlistCount = userdata ? userdata.wishlist.length : 0;

        res.render('user/shop', {
            product: products,
            categories,
            cartCount,
            wishlistCount,
            userdata,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            selectedCategory: id
        })
    } catch (error) {
        console.log('error while filter the category products', error);
        res.render('user/error');
    }
}

// searching a particular product
const search = async (req, res) => {
    try {
        console.log('entering into the searching of products');
        const { words } = req.body;
        const userId = req.session.userId;
        console.log('words:', words);
        let product = await productModel.find({ name: { $regex: words, $options: 'i' } });
        console.log('products found:', product);

        let categories = null;
        let selectedCategory = null;
        if (product.length === 0) {
            categories = await catagoryModel.findOne({ name: { $regex: words, $options: 'i' } });
            console.log('categories:', categories);
            if (categories) {
                product = await productModel.find({ category: categories._id });
                console.log('products by category:', product);
            }
        }

        console.log('Final Product Data:', product);
        const cartCount = userId ? await cartModel.countDocuments({ userId: userId }) : 0;
        const userData = userId ? await userModel.findOne({ _id: userId }) : null;
        const wishlistCount = userData ? userData.wishlist.length : 0;
        res.render('user/shop', {
            product,
            cartCount,
            categories,
            selectedCategory,
            userData,
            wishlistCount,
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
            nextPage: 1,
            previousPage: 1,
            lastPage: 1
        });
    } catch (error) {
        console.log('error while searching an product', error);
        res.render('user/error');
    }
}



// adding a desired product to wishlist
const addWishlist = async (req, res) => {
    try {
        console.log('moving a product to wishlist');
        const { productId } = req.body;
        const userId = req.session.userId;
        const user = await userModel.findOne({ _id: userId });

        if (user.wishlist.includes(productId)) {
            return res.status(200).json({ success: false, message: 'Product already in the wishlist' })
        }

        const wishlist = await userModel.updateOne({ _id: userId }, { $push: { wishlist: productId } });
        const updatedUser = await userModel.findOne({ _id: userId });
        const wishlistCount = updatedUser.wishlist.length;
        res.locals.session.wishlistCount = wishlistCount ? wishlistCount : 0
        res.status(200).json({ success: true, wishlistCount });
    } catch (error) {
        console.log('error while adding the selected product to the wishlist', error);
        res.render('user/error');
    }
}

// rendering the wishlist page for the user
const wishlist = async (req, res) => {
    try {
        console.log('rendering the wishlist page for the user');
        const userId = req.session.userId;
        const user = await userModel.findById(userId).populate('wishlist');
        res.render('user/wishlist', { wishlistItems: user.wishlist });
    } catch (error) {
        console.log('error happened while rendering the wishlist page', error);
        res.render('user/error');
    }
}

// removing the added product from the wishlist
const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.userId;
        await userModel.findByIdAndUpdate(userId, { $pull: { wishlist: productId } });
        const updatedUser = await userModel.findOne({ _id: userId });
        const wishlistCount = updatedUser.wishlist.length;
        res.locals.session.wishlistCount = wishlistCount ? wishlistCount : 0
        res.status(200).json({ success: true });
    } catch (error) {
        console.log('error while removing product from wishlist', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}



module.exports = {
    shop,
    shopSingle,
    wishlist,
    addWishlist,
    removeFromWishlist,
    highLow,
    lowHigh,
    aToZ,
    zToa,
    catfilter,
    search
};