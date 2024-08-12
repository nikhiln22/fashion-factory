const userModel = require('../../model/userModel');
const addModel = require('../../model/addressModel');
const productModel = require('../../model/productModel');
const cartModel = require('../../model/cartModel');
const catModel = require('../../model/catagoryModel');
const orderModel = require('../../model/orderModel');
const walletModel = require('../../model/WalletModel');
const flash = require('express-flash');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const mongoose = require('mongoose');


// rendering the user profile page
const userProfile = async (req, res) => {
    try {
        console.log('rendering the user profile page');
        const updateSuccess = req.flash('updateSuccess');
        const userExist = req.flash('userExist');
        const error = req.flash('error');
        const user = await userModel.findOne({ _id: req.session.userId, status: true });
        res.render('user/profile', { user, updateSuccess, userExist, error });
    } catch (error) {
        console.log('error occured while rendering the profile page', error);
        res.render('user/error');
    }
}

// rendering the user profile updating page
const updateProfile = async (req, res) => {
    try {
        console.log('rendering the user profile updating page');
        const userId = req.session.userId;
        const user = await userModel.findOne({ _id: userId });
        res.render('user/updateprofile', { user });
    } catch (error) {
        console.log('error while rendering the userEditProfile page', error);
        res.render('user/error');
    }
}

// updating the user details
const updateProfilePost = async (req, res) => {
    try {
        console.log('entering to the updateprofilepost function');
        const userId = req.session.userId;
        let { username, phone } = req.body;
        username = username.trim();
        phone = phone.trim();

        if (!username || !phone) {
            req.flash('error', 'Username and phone number are required');
            return res.redirect('/updateprofile');
        }

        // checking for the user uniqueness...
        const existingUser = await userModel.findOne({ username, _id: { $ne: userId } });
        console.log(existingUser);
        if (existingUser) {
            req.flash('userExist', 'Username is already taken');
            return res.redirect('/updateprofile');
        }

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { username, phone },
            { new: true, runValidators: true }
        );
        console.log(updatedUser);

        if (!updatedUser) {
            req.flash('error', 'User not found');
            return res.redirect('/updateprofile');
        }

        req.flash('updateSuccess', 'Profile updated successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating user profile', error);
        req.flash('error', 'An error occurred while updating your profile');
        res.redirect('/updateprofile');
    }
}


// rendering the password reseting page
const resetpassword = async (req, res) => {
    try {
        console.log('rendering the password resetting page');
        const userId = req.session.userId;
        const passwordExist = req.flash('passwordExist');
        const user = await userModel.findOne({ _id: userId });
        res.render('user/resetpassword', { user, passwordExist });
    } catch (error) {
        console.error('Error rendering the resetpassword page', error);
        res.render('user/error');
    }
}

// updating the already existing password
const resetPasswordPost = async (req, res) => {
    try {
        console.log('entering into the resetpassword function');
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.session.userId;
        const user = await userModel.findOne({ _id: userId });
        const isPassword = await bcrypt.compare(newPassword, user.password);
        if (isPassword) {
            req.flash('passwordExist', 'Please enter a different password');
            res.redirect('/resetpassword');
        }
        else if (newPassword != confirmPassword) {
            req.flash('passwordExist', 'Passwords do not match');
            res.redirect('/resetpassword');
        }
        else {
            const passwordMatch = await bcrypt.compare(currentPassword, user.password);
            if (passwordMatch) {
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                const newUser = await userModel.updateOne({ _id: userId }, { password: hashedPassword });
                req.flash('updateSuccess', 'Password Updated successfully');
                res.redirect('/profile');
            } else {
                req.flash('passwordExist', 'invalid Password');
                res.redirect('/resetpassword');
            }
        }
    } catch (error) {
        console.error('error while updating the password', error);
        res.render('user/error');
    }
}

// rendering the user address page
const showAddress = async (req, res) => {
    try {
        console.log('entered to the user address page');
        const updateSuccess = req.flash('updateSuccess');
        const addressExist = req.flash('addressExist');
        const error = req.flash('error');
        const userId = req.session.userId;
        const categories = await catModel.find();
        req.session.checkoutSave = false;
        const address = await addModel.findOne({ userId: userId });
        const itemCount = req.session.cartCount;
        res.render('user/address', { userAddress: address, categories, updateSuccess, addressExist, error });
    } catch (error) {
        console.error('error while rendering the address page');
        res.render('user/error');
    }
}

// rendering the edit address page

const editAddress = async (req, res) => {
    try {
        console.log('entering into the editing the inserted address');
        const userId = req.session.userId;
        const id = req.params.id;
        const categories = await catModel.find()
        const address = await addModel.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(userId) }
            },
            {
                $unwind: '$address'
            },
            {
                $match: { 'address._id': new mongoose.Types.ObjectId(id) }
            }
        ]);
        console.log(address);
        res.render('user/editaddress', { address: address[0], categories })
    } catch (error) {
        console.error('error while updating the inserted address', error);
        res.render('user/error');
    }
}

// editing the already inserted address

const editAddressPost = async (req, res) => {
    try {
        console.log('entered into the address editing function');
        const { saveas, name, email, housename, street, pincode, city, state, country, mobile } = req.body;
        const addressId = req.params.id;
        const userId = req.session.userId;

        const redirectToCheckout = req.query.redirect === 'checkout';

        const isAddressExists = await addModel.findOne({
            'userId': userId,
            'address': {
                $elemMatch: {
                    '_id': { $ne: addressId },
                    'saveAs': saveas,
                    'email': email,
                    'name': name,
                    'mobile': mobile,
                    'houseName': housename,
                    'street': street,
                    'pincode': pincode,
                    'city': city,
                    'state': state,
                    'country': country
                }
            }
        });

        if (isAddressExists) {
            req.flash('error', 'This address already exists');
            return res.redirect(redirectToCheckout ? '/checkout' : '/address');
        }

        // Update the address
        const updatedAddress = await addModel.updateOne(
            { 'userId': userId, 'address._id': addressId },
            {
                $set: {
                    'address.$.saveAs': saveas,
                    'address.$.name': name,
                    'address.$.email': email,
                    'address.$.mobile': parseInt(mobile),
                    'address.$.houseName': housename,
                    'address.$.street': street,
                    'address.$.pincode': pincode,
                    'address.$.city': city,
                    'address.$.state': state,
                    'address.$.country': country,
                }
            }
        );

        if (updatedAddress.modifiedCount > 0) {
            req.flash('updateSuccess', 'Address updated successfully');
        } else {
            req.flash('error', 'No changes were made to the address');
        }
        res.redirect(redirectToCheckout ? '/checkout' : '/address');
    } catch (error) {
        console.log(error);
        req.flash('error', 'An error occurred while processing your request');
        res.render('user/error');
    }
}

// deleting an existing address from the user profile
const delAddress = async (req, res) => {
    try {
        console.log('entered to the function deleting existing user address');
        const addressId = req.params.id;
        const userId = req.session.userId;
        const remove = await addModel.updateOne(
            { userId: userId, 'address._id': addressId },
            { $pull: { address: { _id: addressId } } }
        );
        req.flash('updateSuccess', 'Address deleted successfully');

        if (req.query.redirect === 'checkout') {
            res.redirect('/checkout');
        } else {
            res.redirect('/address');
        }
    } catch (error) {
        console.log(error);
        req.flash('error', 'An error occurred while processing your request');
        res.render('user/error')
    }
}

// rendering the user address adding page
const addAddress = async (req, res) => {
    try {
        console.log('rendering the user address adding page');
        const categories = await catModel.find();
        res.render('user/addaddress', { categories });
    } catch (error) {
        console.error('error while rendering the address adding page', error);
        res.render('user/error');
    }
}

// adding new address for the user
const addAddressPost = async (req, res) => {
    try {
        console.log('adding new address for the user');
        const { saveas, name, email, housename, street, pincode, city, state, country, mobile } = req.body;
        console.log('req.body:', req.body);
        const userId = req.session.userId;
        console.log('userId:', userId);
        const existingUser = await addModel.findOne({ userId: userId });
        console.log('existingUser:', existingUser);
        if (existingUser) {
            const existingAddress = await addModel.find({
                'userId': userId,
                'address.name': name,
                'address.email': email,
                'address.houseName': housename,
                'address.street': street,
                'address.pincode': pincode,
                'address.city': city,
                'address.state': state,
                'address.country': country,
                'address.mobile': mobile
            })
            if (existingAddress.length) {
                if (req.session.checkoutSave) {
                    return res.redirect('/checkout');
                }
                return res.redirect('/address');
            }
            existingUser.address.push({
                name: name,
                mobile: mobile,
                email: email,
                houseName: housename,
                street: street,
                city: city,
                state: state,
                country: country,
                pincode: pincode,
                saveAs: saveas
            });
            await existingUser.save();
            if (req.session.checkoutSave) {
                return res.redirect('/checkout');
            }
            return res.redirect('/address');
        }
        const newAddress = await addModel.create({
            userId: userId,
            address: {
                name: name,
                mobile: mobile,
                email: email,
                houseName: housename,
                street: street,
                city: city,
                state: state,
                country: country,
                pincode: pincode,
                saveAs: saveas
            }
        });
        if (req.session.checkoutSave) {
            return res.redirect('/checkout')
        }
        res.redirect('/address');
    } catch (error) {
        console.error('error while creating new address', error);
        res.render('user/error');
    }
}

// rendering the order page
const order = async (req, res) => {
    const page = parseInt(req.query.page || 1);
    const limit = 4;
    const skip = (page - 1) * limit;
    try {
        console.log('rendering the orders history page for the user side');
        const userId = req.session.userId;
        const userData = await userModel.findOne({ _id: userId });
        const totalOrderAmount = req.query.totalOrderAmount;
        console.log('totalOrderAmount:', totalOrderAmount);
        req.session.totalOrderAmount = totalOrderAmount;
        const orderDetails = await orderModel.find({ userId: userId })
            .populate('orderedItem.productId')
            .sort({ _id: -1 })
            .limit(limit)
            .skip(skip)

        console.log('orderDetails:', orderDetails);

        const totaOrders = await orderModel.countDocuments({ userId: userId });
        const totalPages = Math.ceil(totaOrders / limit);

        res.render('user/orders', {
            orderDetails,
            userData,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            totalOrderAmount
        })

    } catch (error) {
        console.log('error occured while rendering the order page', error);
        res.render('user/error');
    }
}


// renderirng the order summary page 
const singleOrder = async (req, res) => {
    try {
        console.log('entering into the single order page');
        const orderId = req.query.orderId.trim();
        const userId = req.session.userId;
        const userData = await userModel.findOne({ _id: userId });
        console.log('userData:', userData);
        const cartCount = await cartModel.countDocuments({ userId: userId });
        const orderDetails = await orderModel.findOne({ _id: orderId }).populate('deliveryAddress').populate('orderedItem.productId');

        if (!orderDetails) {
            return res.status(404).render('error', { error: 'Order not found.' });
        }

        res.render('user/singleorder', {
            orderDetails,
            products: orderDetails.orderedItem,
            userData,
            cartCount
        });
    } catch (error) {
        console.log("error in singleorder", error);
        res.status(500).render('error', { error: 'An error occurred while fetching the order details.' });
    }
};

// cancelling the ordered product
const cancelProduct = async (req, res) => {
    try {
        console.log('entered');
        const { orderId, productId, paymentMethod } = req.body;

        console.log('body:', req.body);

        const userId = req.session.userId;

        const orderdetails = await orderModel.findOne({ _id: orderId, userId: userId }).populate("orderedItem.productId");
        console.log('orderdetails:', orderdetails);

        const totalOrderedProducts = orderdetails.orderedItem.length;


        console.log('orderdetails.orderedItem[0].productId._id:', orderdetails.orderedItem[0].productId._id);

        const itemIndex = orderdetails.orderedItem.findIndex(item => item.productId._id.toString() === productId);
        console.log('itemIndex:', itemIndex);
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Product not found in order' });
        }

        console.log('itemIndex:', itemIndex);

        const item = orderdetails.orderedItem[itemIndex];

        console.log('item:', item);

        // Check if the item is already cancelled
        if (item.productStatus === 'cancelled') {
            return res.status(400).json({ success: false, message: 'Product is already cancelled' });
        }

        // Update product stock
        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        console.log('product:', product);
        const sizeIndex = product.stock.findIndex((stock) => stock.size == item.size)
        console.log('sizeIndex:', sizeIndex);
        product.stock[sizeIndex].quantity += item.quantity;
        console.log('product before saving:', product);

        await product.save();

        console.log('product after saving:', product);

        // updating the order item status
        const productStatus = await orderModel.updateOne(
            { _id: orderId },
            { $set: { 'orderedItem.$[item].productStatus': "cancelled" } },
            { arrayFilters: [{ "item.productId": productId }] }
        );

        if (productStatus.modifiedCount === 0) {
            return res.status(500).json({ success: false, message: 'Failed to update order status' });
        }


        // calculating the refund amount for the cancelled product
        let refundAmount;
        if (orderdetails.couponDiscount) {
            refundAmount = (item.productPrice * item.quantity) - orderdetails.couponDiscount / totalOrderedProducts;
            console.log('refundAmount:', refundAmount);
        } else {
            refundAmount = item.productPrice * item.quantity;
            console.log('refundAmount:', refundAmount);
        }

        // handling the refund if the payment method is not COD
        const existingWallet = await walletModel.findOne({ userId: userId });

        if (paymentMethod !== "COD") {
            if (!existingWallet) {
                const newWallet = new walletModel({
                    userId: userId,
                    balance: refundAmount,
                    transaction: [{
                        amount: refundAmount,
                        transactionsMethod: "Refund"
                    }]
                });
                await newWallet.save();
            } else {
                await walletModel.updateOne({ userId: userId }, { $inc: { balance: refundAmount }, $push: { transaction: { amount: refundAmount, transactionsMethod: "Refund" } } })
            }
        }
        res.json({ success: true, message: 'Product cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling product:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel product' });
    }
};

// returning the placed order
const returnOrder = async (req, res) => {
    try {
        console.log('returning the placed order by the user');
        const userId = req.session.userId;
        console.log('userId:', userId);
        const { selectedReason, productId, orderId } = req.body;
        console.log('selectedReason:', selectedReason);
        console.log('productId:', productId);
        console.log('orderId:', orderId);

        // input validation
        if (!selectedReason || !productId || !orderId) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // find the order and update the product status
        const order = await orderModel.findOne({ _id: orderId, userId: userId });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const totalOrderedProducts = order.orderedItem.length

        const itemIndex = order.orderedItem.findIndex(item => item.productId.toString() === productId);
        console.log('itemIndex:', itemIndex);
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: "product not found in order" });
        }

        const item = order.orderedItem[itemIndex];
        console.log('item:', item);

        if (item.productStatus === "returned") {
            return res.status(400).json({ success: false, message: "Product already returned" });
        }

        // updating the order status
        order.orderedItem[itemIndex].productStatus = "returned";
        order.orderedItem[itemIndex].returnReason = selectedReason;
        await order.save();

        console.log('updated order details:', order);

        // updating the product stock as well
        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "product not found" });
        }

        const sizeIndex = product.stock.findIndex(stock => stock.size === item.size);
        if (sizeIndex !== -1) {
            product.stock[sizeIndex].quantity += item.quantity;
            product.totalStock += item.quantity;
            await product.save()
        }


        // calculating the refund amount for the returned product
        let refundAmount;
        if (order.couponDiscount) {
            refundAmount = (item.productPrice * item.quantity) - order.couponDiscount / totalOrderedProducts;
            console.log('refundAmount:', refundAmount);
        } else {
            refundAmount = item.productPrice * item.quantity;
            console.log('refundAmount:', refundAmount);
        }

        console.log('refundAmount:', refundAmount);

        // processing the refund to the user
        await walletModel.findOneAndUpdate(
            { userId: userId },
            {
                $inc: { balance: refundAmount },
                $push: {
                    transaction: {
                        amount: refundAmount,
                        transactionsMethod: "Refund"
                    }
                }
            },
            { upsert: true, new: true }
        );
        res.status(200).json({ success: true, message: "Order returned successfully" });
    } catch (error) {
        console.log('Error occured while returning the order', error);
        res.status(500).json({ success: false, message: "An error occurred while processing the return" });
    }
}

// rendering the wallet page for the user
const wallet = async (req, res) => {
    try {
        console.log('entering to the wallet displaying page from the user side');
        const userId = req.session.userId;
        const userdata = await userModel.findOne({ _id: userId });
        const cartCount = await cartModel.countDocuments({ userId: userId });
        const wishlistCount = userdata.wishlist.length;
        const walletDetails = await walletModel.findOne({ userId: userId });
        if (walletDetails) {
            const formattedTransactions = walletDetails.transaction.map(transaction => {
                const formattedDate = moment(transaction.date).format('DD-MM-YYYY');
                return {
                    ...transaction.toObject(),
                    formattedDate,
                }
            }).sort((a, b) => (a._id > b._id ? -1 : 1));
            const formattedWallet = {
                ...walletDetails.toObject(),
                transaction: formattedTransactions
            }

            console.log('formattedWallet:', formattedWallet);

            res.render('user/wallet', { walletDetails: formattedWallet, cartCount, wishlistCount, userdata })
        } else {
            res.render('user/wallet', { walletDetails: 0, cartCount, wishlistCount, userdata });
        }
    } catch (error) {
        console.log('error while rendering the wallet page for the user', error);
        res.render('user/error');
    }
}

const addWallet = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.session.userId;
        const walletdetail = await walletModel.findOne({ userId: userId });
        if (!walletdetail) {
            const newWallet = new walletModel({
                userId: userId,
                balance: amount,
                transaction: [{
                    amount: amount,
                    transactionsMethod: "Credit"
                }]
            })
            await newWallet.save();
        } else {
            await walletModel.updateOne({ userId: userId }, {
                $inc: { balance: amount }, $push: {
                    transaction: { amount: amount, transactionsMethod: "Credit" }
                }
            })
        }
        res.status(200).json({ success: true })
    } catch (error) {
        res.status(302).json({ success: false })
        console.log('Error in adding money to the wallet', error)
    }
}

// rendering the invoice page for the user
const invoicePage = async (req, res) => {
    try {
        console.log('rendering the invoice page for the user displaying ordered product details');
        const { orderId, productId } = req.body;
        const userId = req.session.userId;
        console.log('userId', userId);
        console.log('orderId:', orderId);
        console.log('productId:', productId);

        if (!orderId || !productId) {
            return res.status(400).json({ error: "Missing orderId or productId" });
        }

        const orderDetails = await orderModel.findOne({ _id: orderId.trim() }).populate('orderedItem.productId');
        console.log('orderDetails:', orderDetails);

        if (!orderDetails) {
            return res.status(404).json({ error: 'order not found' });
        }
        const userData = await userModel.findOne({ _id: userId });
        console.log('userData:', userData);

        if (!userData) {
            return res.status(404).json({ error: "user not found" });
        }
        const productData = orderDetails.orderedItem.find(item => item.productId._id.toString() === productId);
        console.log('productData:', productData);

        if (!productData) {
            return res.status(404).json({ error: "product not found in the order" });
        }

        res.render('user/invoicepage', {
            productData,
            orderDetails,
            userData
        })
    } catch (error) {
        console.log('error while rendering the invoice page for the user', error);
        res.render('user/error');
    }
}

module.exports = {
    userProfile,
    updateProfile,
    updateProfilePost,
    resetpassword,
    resetPasswordPost,
    showAddress,
    addAddress,
    addAddressPost,
    editAddress,
    editAddressPost,
    delAddress,
    order,
    singleOrder,
    returnOrder,
    cancelProduct,
    wallet,
    addWallet,
    invoicePage
}