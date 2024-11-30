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
            selectedCategory: selectedCategory,
            selectedCategoryId: selectedCategory
        });
    } catch (error) {
        console.log('error occurred while rendering the shop page', error);
        res.render('user/error');
    }
}

// rendering the user side single shopping product page...
const shopSingle = async (req, res) => {
    try {
        console.log('rendering the shop single page for the user');
        const productId = req.query.productId;
        console.log('productId:', productId);
        let userId = req.session.userId;
        const productData = await productModel.findOne({ _id: productId });
        console.log('productData:', productData);
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


// Utility function to apply offers
const applyOffers = async (products, offerdata) => {
    return products.map(product => {
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
};

// Utility function to get common data
const getCommonData = async (userId, page, limit, categoryId) => {
    const skip = (page - 1) * limit;
    const userdata = userId ? await userModel.findOne({ _id: userId }) : null;
    const categories = await catagoryModel.find();
    const matchStage = categoryId ? { status: true, category: categoryId } : { status: true };
    const totalProducts = await productModel.countDocuments(matchStage);
    const totalPages = Math.ceil(totalProducts / limit);
    const cartCount = userId ? await cartModel.countDocuments({ userId: userId }) : 0;
    const wishlistCount = userdata ? userdata.wishlist.length : 0;
    const offerdata = await offerModel.find({
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
    });

    return {
        userdata, categories, totalProducts, totalPages, cartCount, wishlistCount, offerdata, skip, matchStage
    };
};

// Utility function to render the shop page
const renderShopPage = (res, products, commonData, page, totalPages, categoryId) => {
    res.render('user/shop', {
        product: products,
        categories: commonData.categories,
        userdata: commonData.userdata,
        wishlistCount: commonData.wishlistCount,
        cartCount: commonData.cartCount,
        currentPage: page,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: totalPages,
        selectedCategory: categoryId
    });
};

// sorting the product price on the basis of high to low
const highLow = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const categoryId = req.query.category;
        const commonData = await getCommonData(req.session.userId, page, limit, categoryId);

        let products = await productModel.find(commonData.matchStage)
            .populate('category')
            .sort({ price: -1 })
            .skip(commonData.skip)
            .limit(limit);

        products = await applyOffers(products, commonData.offerdata);
        products.sort((a, b) => b.discountedPrice - a.discountedPrice);

        renderShopPage(res, products, commonData, page, commonData.totalPages, categoryId);
    } catch (error) {
        console.error('Error in highLow:', error);
        res.render('user/error', { error: 'An error occurred while sorting products.' });
    }
};

// sorting the products price starting from low to high
const lowHigh = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const categoryId = req.query.category;
        const commonData = await getCommonData(req.session.userId, page, limit, categoryId);

        let products = await productModel.find(commonData.matchStage)
            .populate('category')
            .sort({ price: 1 })
            .skip(commonData.skip)
            .limit(limit);

        products = await applyOffers(products, commonData.offerdata);
        products.sort((a, b) => a.discountedPrice - b.discountedPrice);

        renderShopPage(res, products, commonData, page, commonData.totalPages, categoryId);
    } catch (error) {
        console.error('Error in lowHigh:', error);
        res.render('user/error', { error: 'An error occurred while sorting products.' });
    }
};

// sorting the products in the ascending order of alphabets
const aToZ = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const categoryId = req.query.category;
        const commonData = await getCommonData(req.session.userId, page, limit, categoryId);

        let products = await productModel.find(commonData.matchStage)
            .populate('category')
            .sort({ name: 1 })
            .skip(commonData.skip)
            .limit(limit)
            
        console.log('Products without lookup:', products);

        products = await applyOffers(products, commonData.offerdata);
        console.log('products:', products);

        renderShopPage(res, products, commonData, page, commonData.totalPages, categoryId);
    } catch (error) {
        console.log('Error in aToZ:', error);
        res.render('user/error', { error: 'An error occurred while sorting products.' });
    }
};

// sorting the products in the descending order of starting alphabets
const zToa = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const categoryId = req.query.category;
        const commonData = await getCommonData(req.session.userId, page, limit, categoryId);

        let products = await productModel.find(commonData.matchStage)
            .populate('category')
            .sort({ name: -1 })
            .skip(commonData.skip)
            .limit(limit)

        products = await applyOffers(products, commonData.offerdata);

        renderShopPage(res, products, commonData, page, commonData.totalPages, categoryId);
    } catch (error) {
        console.error('Error in zToa:', error);
        res.render('user/error', { error: 'An error occurred while sorting products.' });
    }
};

// filtering the products on the basis of the category
const catfilter = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const categoryId = req.query.category;
        const commonData = await getCommonData(req.session.userId, page, limit, categoryId);

        let products = await productModel.find(commonData.matchStage)
            .populate('category')
            .sort({ _id: -1 })
            .skip(commonData.skip)
            .limit(limit);

        products = await applyOffers(products, commonData.offerdata);

        renderShopPage(res, products, commonData, page, commonData.totalPages, categoryId);
    } catch (error) {
        console.error('Error in catfilter:', error);
        res.render('user/error', { error: 'An error occurred while filtering products.' });
    }
};


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

// searching some products
const search = async (req, res) => {
    try {
        console.log('Entering into the searching of products');
        const { words, category } = req.query;
        const userId = req.session.userId;
        console.log('Search words:', words);
        console.log('Selected category:', category);

        let matchStage = {};
        
        if (words) {
            matchStage.name = { $regex: words, $options: 'i' };
        }
        
        if (category) {
            matchStage.category = category;
        }

        let products = await productModel.find(matchStage).populate('category');
        console.log('Products found:', products);

        let categories = null;
        let selectedCategory = category;

        if (products.length === 0 && !category) {
            categories = await catagoryModel.findOne({ name: { $regex: words, $options: 'i' } });
            console.log('Categories:', categories);
            if (categories) {
                products = await productModel.find({ category: categories._id }).populate('category');
                console.log('Products by category:', products);
                selectedCategory = categories._id;
            }
        }

        console.log('Final Product Data:', products);

        // Use the getCommonData utility function
        const commonData = await getCommonData(userId, 1, products.length || 1, selectedCategory);

        console.log('commonData:', commonData);

        // Apply offers to the products
        products = await applyOffers(products, commonData.offerdata);

        res.render('user/search', {
            productData: products,
            cartCount: commonData.cartCount,
            categories: categories ? [categories] : commonData.categories,
            selectedCategory: selectedCategory,
            searchWords: words
        });

    } catch (error) {
        console.error('Error while searching for a product:', error);
        res.render('user/error', { error: 'An error occurred while searching for products.' });
    }
};



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