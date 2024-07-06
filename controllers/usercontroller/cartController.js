const productModel = require('../../model/productModel');
const catModel = require('../../model/catagoryModel');
const cartModel = require('../../model/cartModel');
const mongoose = require('mongoose');
const flash = require('express-flash');


// rendering the user side cart page
const showCart = async (req, res) => {
    try {
        console.log('entering the cart displaying page');
        const id = req.session.userId;
        const sessionId = req.session.id;
        const categories = await catModel.find();
        let cart;
        if (id) {
            cart = await cartModel.findOne({ userId: id }).populate({
                path: "item.productId",
                select: "name stock image",
            });
        } else {
            cart = await cartModel.findOne({ sessionId }).populate({
                path: "item.productId",
                select: "name stock image",
            });
        }

        if (!cart || !cart.item) {
            cart = new cartModel({
                sessionId: req.session.id,
                item: [],
                total: 0
            });
        }

        const insufficientStock = [];
        for (const cartItem of cart.item) {
            const product = cartItem.productId;
            const size = product.stock.findIndex((s) => s.size == cartItem.size);
            if (product.stock[size].quantity < cartItem.quantity) {
                insufficientStock.push({
                    item: cartItem,
                    availableQuantity: size !== -1 ? product.stock[size].quantity : 0,
                });
            }
        }
        const result = await cartModel.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(id) } },
            { $unwind: '$item' },
            { $group: { _id: null, itemCount: { $sum: 1 } } },
        ])
        if (result.length > 0) {
            const itemCount = result[0].itemCount;
            req.session.cartCount = itemCount;
        }
        if (result.length === 0) {
            req.session.cartCount = 0;
        }
        req.session.checkout = true;
        const nostock = req.flash('nostock')
        const itemCount = req.session.cartCount;
        res.render("user/cart", { cart, insufficientStock, categories, nostock, itemCount });
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
        const product = await productModel.findOne({ _id: pid });
        const userId = req.session.userId;
        const price = product.discountPrice;
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
        
        let cart;
        if (userId) {
            cart = await cartModel.findOne({ userId });
        }
        if (!cart) {
            cart = await cartModel.findOne({ sessionId: req.session.id });
        }
        if (!cart) {
            cart = new cartModel({
                sessionId: req.session.id,
                item: [],
                total: 0
            });
        }

        // Check if the cart already has 5 unique products
        if (cart.item.length >= 5 && !cart.item.some(item => item.productId.toString() === pid && item.size === selectedSize)) {
            return res.json({ success: false, message: 'You can only add up to 5 different products to your cart.' });
        }

        const productExist = cart.item.findIndex(
            (item) => item.productId.toString() === pid && item.size === selectedSize
        );

        if (productExist !== -1) {
            // Check if adding one more would exceed the stock
            if (cart.item[productExist].quantity + 1 > selectedStock.quantity) {
                return res.json({ success: false, message: 'Cannot add more of this item. Stock limit reached.' });
            }
            cart.item[productExist].quantity += 1;
            cart.item[productExist].total = cart.item[productExist].quantity * price;
        } else {
            const newItem = {
                productId: pid,
                quantity: 1,
                size: selectedSize,
                price: price,
                stock: selectedStock.quantity,
                total: price
            };
            cart.item.push(newItem);
        }

        if (userId && !cart.userId) {
            cart.userId = userId;
        }

        cart.total = cart.item.reduce((acc, item) => acc + item.total, 0);
        await cart.save();

        return res.json({ success: true });

    } catch (error) {
        console.log('error while adding product to the cart', error);
        return res.json({ success: false, message: 'An error occurred. Please try again.' });
    }
}

const updateCart = async (req, res) => {
    try {
        console.log('entering to the updateCart function');

        const { productId, size } = req.params;
        const { action, cartId } = req.body;
        const cart = await cartModel.findOne({ _id: cartId });

        if (!cart) {
            return res.status(404).json({ success: false, error: "Cart not found" });
        }

        console.log('cart:', cart);
        console.log('productId:', productId);
        console.log('size:', size);

        const itemIndex = cart.item.findIndex((item) => item.productId.toString() == productId && item.size == size);

        console.log('itemIndex:', itemIndex);

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, error: "Item not found in cart" });
        }

        const currentQuantity = cart.item[itemIndex].quantity;

        console.log('currentQuantity:', currentQuantity);

        const stockLimit = cart.item[itemIndex].stock;
        const price = cart.item[itemIndex].price;
        const opid = cart.item[itemIndex].productId;
        const product = await productModel.findOne({ _id: opid });
        const selectedinfo = product.stock.findIndex((stock) => stock.size == size);
        const stockLimit2 = product.stock[selectedinfo].quantity;
        let updatedQuantity;

        if (action == '1') {
            updatedQuantity = currentQuantity + 1;
        } else if (action == '-1') {
            updatedQuantity = currentQuantity - 1;
        } else {
            return res.staus(400).json({ success: false, error: "Invalid action" });
        }

        if (updatedQuantity > stockLimit2 && action == "1") {
            return res.status(400).json({ success: false, error: "Quantity exceeds stock limits" });
        } else if (updatedQuantity == 0) {
            return res.status(400).json({ success: false, error: "Quantity cannot be Zero" });
        }
        cart.item[itemIndex].quantity = updatedQuantity;

        const newProductTotal = price * updatedQuantity;
        cart.item[itemIndex].total = newProductTotal;
        await cart.save();
        const total = cart.item.reduce((acc, item) => acc + item.total, 0);
        cart.total = total;
        await cart.save();
        res.json({
            success: true,
            newQuantity: updatedQuantity,
            newProductTotal,
            total: total,
        })
    } catch (error) {
        console.error("Error updating cart quantity:", error);
        res.redirect('/error');
    }
}

const deleteCart = async (req, res) => {
    try {
        console.log('entering into function that removing the products from the cart');
        const userId = req.session.userId;
        const pid = req.params.id;
        const size = req.params.size;

        const output = await cartModel.updateOne({ userId: userId }, { $pull: { item: { _id: pid, size: size } } });
        console.log(output);
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