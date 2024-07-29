const productModel = require('../../model/productModel');
const catModel = require('../../model/catagoryModel');
const cartModel = require('../../model/cartModel');
const offerModel = require('../../model/offerModel');
const mongoose = require('mongoose');
const flash = require('express-flash');


// rendering the user side cart page
const showCart = async (req, res) => {
    try {
        console.log('entering the cart displaying page');
        const id = req.session.userId;
        const categories = await catModel.find();

        // fetching the user's cart
        let cart = await cartModel.findOne({ userId: id }).populate({
            path: "item.productId",
            select: "name stock image category price",
            populate: {
                path: "category"
            }
        });

        // const originalPrice = cart?.item.map((items) => {
        //     return items.productId.price;
        // })

        // console.log('originalPrice:', originalPrice);

        if (!cart || !cart.item) {
            cart = new cartModel({
                userId: id,
                item: [],
                total: 0
            });
        }

        // fetching active offers
        const offerData = await offerModel.find({
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        console.log('offerData:', offerData);


        let totalActualAmount = 0;
        let totalDiscountedAmount = 0;

        // process each cart items with offers
        const cartItemsWithOffers = cart.item.map(cartItem => {
            const product = cartItem.productId;
            const originalPrice = cartItem.productId.price;

            console.log('originalPrice:', originalPrice);

            // let productDiscountedPrice = cartItem.price;
            // let categoryDiscountedPrice = cartItem.price;
            let productDiscountedPrice = cartItem.productId.price;
            let categoryDiscountedPrice = cartItem.productId.price;

            let offerApplied = false;
            let appliedOffer = null


            offerData.forEach(offer => {
                if (offer.offerType === 'product' && offer.productId.includes(product._id.toString())) {

                    // productDiscountedPrice = cartItem.price - (cartItem.price * offer.discount / 100);
                    productDiscountedPrice = originalPrice - (originalPrice * offer.discount / 100);


                    console.log('productDiscountedPrice:', productDiscountedPrice);
                    offerApplied = true;
                }
                if (offer.offerType === 'category' && offer.categoryId.includes(product.category._id.toString())) {
                    // categoryDiscountedPrice = cartItem.price - (cartItem.price * offer.discount / 100);
                    categoryDiscountedPrice = originalPrice - (originalPrice * offer.discount / 100);

                    console.log('categoryDiscountedPrice:', categoryDiscountedPrice);
                    offerApplied = true;
                }
            });

            // let discountedPrice = cartItem.price;
            let discountedPrice = originalPrice;

            if (offerApplied) {
                if (productDiscountedPrice <= categoryDiscountedPrice) {
                    console.log('applied offer from the product side');
                    appliedOffer = offerData.find(offer => offer.offerType === 'product' && offer.productId.includes(product._id.toString()));
                    console.log('appliedOffer:', appliedOffer);
                    discountedPrice = Math.round(productDiscountedPrice);
                    console.log('discount price from the product side');
                    console.log('discountedPrice:', discountedPrice);
                } else {
                    console.log('applied offer from the category side');
                    appliedOffer = offerData.find(offer => offer.offerType === 'category' && offer.categoryId.includes(product.category._id.toString()));
                    console.log('appliedOffer:', appliedOffer);
                    discountedPrice = Math.round(categoryDiscountedPrice);
                    console.log('discount price from the category side');
                    console.log('discountedPrice:', discountedPrice);
                }
            }

            // totalActualAmount += cartItem.price * cartItem.quantity;
            totalActualAmount += originalPrice * cartItem.quantity;

            console.log('totalActualAmount:', totalActualAmount);
            totalDiscountedAmount += discountedPrice * cartItem.quantity;
            console.log('totalDiscountedAmount:', totalDiscountedAmount);

            return {
                ...cartItem.toObject(),
                productDetails: product,
                discountedPrice,
                appliedOffer: appliedOffer ? {
                    offerName: appliedOffer.offerName,
                    discount: appliedOffer.discount,
                    offerId: appliedOffer._id
                } : null,
                offerText: appliedOffer ? `${appliedOffer.discount}% off` : ''
            };
        });

        let totalSavings = totalActualAmount - totalDiscountedAmount;

        console.log('Cart Items with Offers:', cartItemsWithOffers);
        console.log('Total Actual Amount:', totalActualAmount);
        console.log('Total Discounted Amount:', totalDiscountedAmount);
        console.log('Total Savings:', totalSavings);

        // check for insufficient stock
        const insufficientStock = cartItemsWithOffers.filter(cartItem => {
            const product = cartItem.productId;
            const size = product.stock.findIndex((s) => s.size == cartItem.size);
            return size != -1 && product.stock[size].quantity < cartItem.quantity;
        }).map(cartItem => ({
            item: cartItem,
            availableQuantity: cartItem.productId.stock.find(s => s.size == cartItem.size)?.quantity || 0,
        }));

        console.log('cart:', cart);

        const itemCount = cart.item.length;
        req.session.cartCount = itemCount;
        req.session.checkout = true;
        const nostock = req.flash('nostock')
        res.render("user/cart", {
            cart: {
                ...cart.toObject(),
                item: cartItemsWithOffers
            },
            insufficientStock,
            categories,
            nostock,
            itemCount,
            totalActualAmount,
            totalDiscountedAmount,
            totalSavings
        });
    } catch (error) {
        console.log(error);
        res.render("user/serverError");
    }
};


// adding the displayed products to the cart
const addCart = async (req, res) => {
    console.log('entering into the addcart function');
    try {
        const selectedSize = req.body.size;
        const pid = req.params.id;
        const userId = req.session.userId;

        const product = await productModel.findOne({ _id: pid });
        console.log('product:', product);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        // fetching the active offers
        const activeOffers = await offerModel.find({
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        console.log('activeOffers:', activeOffers);

        let discountedPrice = product.price;
        console.log('discountedPrice:', discountedPrice);
        let appliedOffer = null;

        // checking for the product specific orders
        activeOffers.forEach(offer => {
            if (offer.offerType === 'product' && offer.productId.includes(pid)) {
                console.log('potential discount calculating if any product offer exists');
                const potentialDiscountPrice = product.price - (product.price * offer.discount / 100);
                console.log('potentialDiscountPrice:', potentialDiscountPrice);
                if (potentialDiscountPrice < discountedPrice) {
                    discountedPrice = potentialDiscountPrice;
                    console.log('discountedPrice:', discountedPrice);
                    appliedOffer = offer;
                }
            }
        });

        // if no product-specific offer, check for category offers
        if (!appliedOffer) {
            activeOffers.forEach(offer => {
                if (offer.offerType === 'category' && offer.categoryId.includes(product.category.toString())) {
                    console.log('potential discount calculating if any category offer exists');
                    const potentialDiscountPrice = product.price - (product.price * offer.discount / 100);
                    console.log('potentialDiscountPrice:', potentialDiscountPrice);
                    if (potentialDiscountPrice < discountedPrice) {
                        discountedPrice = potentialDiscountPrice;
                        console.log('discountedPrice:', discountedPrice);
                        appliedOffer = offer;
                    }
                }
            });
        }

        discountedPrice = Math.round(discountedPrice);
        console.log('discountedPrice:', discountedPrice);

        const stock = await productModel.findOne({
            _id: pid,
            "stock.size": selectedSize
        });

        if (!stock) {
            return res.json({ success: false, message: 'Selected size not found for this product.' });
        }

        const selectedStock = stock.stock.find((item) => item.size == selectedSize);

        if (!selectedStock || selectedStock.quantity === 0) {
            return res.json({ success: false, message: 'Selected size is out of stock. Please choose another size.' });
        }

        let cart = await cartModel.findOne({ userId }) || await cartModel.findOne({ sessionId: req.session.id });

        if (!cart) {
            cart = new cartModel({
                sessionId: req.session.id,
                item: [],
                total: 0
            });
        }

        const productExist = cart.item.findIndex(
            (item) => item.productId.toString() === pid && item.size === selectedSize
        );

        if (productExist !== -1) {
            // Checking if adding one more product would exceed the existing stock limit
            if (cart.item[productExist].quantity + 1 > selectedStock.quantity) {
                return res.json({ success: false, message: 'Cannot add more of this item. Stock limit reached.' });
            }
            cart.item[productExist].quantity += 1;
            cart.item[productExist].price = discountedPrice;
            cart.item[productExist].total = cart.item[productExist].quantity * discountedPrice;
            cart.item[productExist].offer_id = appliedOffer ? appliedOffer._id : null;
        } else {
            const newItem = {
                productId: pid,
                quantity: 1,
                size: selectedSize,
                price: discountedPrice,
                stock: selectedStock.quantity,
                total: discountedPrice,
                offer_id: appliedOffer ? appliedOffer._id : null
            };
            cart.item.push(newItem);
        }

        if (userId && !cart.userId) {
            cart.userId = userId;
        }

        cart.total = cart.item.reduce((acc, item) => acc + item.total, 0);
        await cart.save();

        const cartCount = await cartModel.countDocuments({ userId });
        console.log('cartCount:', cartCount);
        res.locals.session.cartCount = cartCount ? cartCount : 0
        console.log('res.locals.session.cartCount:', res.locals.session.cartCount);
        return res.json({ success: true, cartCount });

    } catch (error) {
        console.log('error while adding product to the cart', error);
        return res.json({ success: false, message: 'An error occurred. Please try again.' });
    }
}

// updating the quantity of the product from the cart
const updateCart = async (req, res) => {
    try {
        console.log('entering to the updateCart function');

        const { productId, size } = req.params;
        const { action, cartId } = req.body;

        const id = req.session.userId;

        console.log('action:', action);
        console.log('productId:', productId);
        console.log('size:', size);
        console.log('cartId:', cartId);

        // let cartDetails = await cartModel.findOne({ userId: id }).populate({
        //     path: "item.productId",
        //     select: "name stock image category price",
        //     populate: {
        //         path: "category"
        //     }
        // });


        const cart = await cartModel.findOne({ _id: cartId }).populate({
            path: "item.productId",
            select: "name stock image category price",
            populate: {
                path: "category"
            }
        });

       
        if (!cart) {
            return res.status(404).json({ success: false, error: "Cart not found" });
        }
        const itemIndex = cart.item.findIndex((item) => item.productId._id.toString() === productId && item.size === size);

        console.log('itemIndex:', itemIndex);

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, error: "Item not found in cart" });
        }

        const currentQuantity = cart.item[itemIndex].quantity;
        console.log('currentQuantity:', currentQuantity);

        const offerPrice = cart.item[itemIndex].price;
        console.log('offerPrice:',offerPrice);
       

        const stockLimit = cart.item[itemIndex].stock;
        const opid = cart.item[itemIndex].productId;
        const product = await productModel.findOne({ _id: opid });

        const price = product.price;

        console.log('price:', price);

        const selectedinfo = product.stock.findIndex((stock) => stock.size == size);
        const stockLimit2 = product.stock[selectedinfo].quantity;
        let updatedQuantity;

        if (action == '1') {
            updatedQuantity = currentQuantity + 1;
        } else if (action == '-1') {
            updatedQuantity = currentQuantity - 1;
        } else {
            return res.status(400).json({ success: false, error: "Invalid action" });
        }



        if (updatedQuantity > stockLimit2 && action == "1") {
            return res.status(400).json({ success: false, error: "Quantity exceeds stock limits" });
        } else if (updatedQuantity == 0) {
            return res.status(400).json({ success: false, error: "Quantity cannot be Zero" });
        } else if (updatedQuantity > 5) {
            return res.status(400).json({ success: false, error: "Quantity limit reached" });
        }

        cart.item[itemIndex].quantity = updatedQuantity;

        const totalMrp = cart.item.reduce((acc, curr) => {
            console.log('curr.quantity:', curr.quantity);
            console.log('curr.productId.price:', curr.productId.price);
            console.log('acc:', acc);
            return acc + (curr.quantity * curr.productId.price)
        }, 0);

        console.log('totalMrp:', totalMrp);

        const newProductTotal = ((offerPrice < price) ? offerPrice : price) * updatedQuantity;

        console.log('newProductTotal:', newProductTotal);

        // const newProductTotal = (price -(price * offer/100) )* updatedQuantity;

        cart.item[itemIndex].total = newProductTotal;

        const savings = totalMrp - (offerPrice * updatedQuantity);

        console.log('savings:', savings);

        // calculating new total and cart count
        const total = cart.item.reduce((acc, item) => acc + item.total, 0);
        console.log('total:', total);
        
        const newCartCount = cart.item.reduce((acc, item) => acc + item.quantity, 0);
        console.log('newCartCount:', newCartCount);

        cart.total = total;
        await cart.save();


        // updating session with new cart count
        req.session.cartCount = newCartCount;
        await req.session.save();

        // update res.locals in immediate use in this request
        res.locals.session = res.locals.session || {};
        res.locals.session.cartCount = newCartCount;
        // console.log(res.locals.session.cartCount, newCartCount, '>>>>>>>>>>>>>>>>>>>>>>');
        // console.log(updatedQuantity, newProductTotal, total, '$$$$$$$$$$$$$$');

        res.json({
            success: true,
            newQuantity: updatedQuantity,
            newProductTotal,
            total: totalMrp,
            cartCount: newCartCount,
            savings
        })
    } catch (error) {
        console.error("Error updating cart quantity:", error);
        res.status(500).json({ success: false, error: "An error occurred while updating the cart" });
    }
}

// deleting the product from the cart
const deleteCart = async (req, res) => {
    try {
        console.log('entering into function that removing the products from the cart');
        const userId = req.session.userId;
        const pid = req.params.id;
        const size = req.params.size;
        const output = await cartModel.updateOne({ userId: userId }, { $pull: { item: { _id: pid, size: size } } });
        const updatedCart = await cartModel.findOne({ userId: userId });
        const add = updatedCart.item.reduce((acc, item) => acc + item.total, 0);
        updatedCart.total = add;
        await updatedCart.save();
        res.redirect('/cart');
    } catch (error) {
        console.error('error while removing the product from the cart', error);
        res.render('user/error');
    }
}



module.exports = { showCart, addCart, updateCart, deleteCart }