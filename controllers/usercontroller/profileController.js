const userModel = require('../../model/userModel');
const addModel = require('../../model/addressModel');
const productModel = require('../../model/productModel');
const cartModel = require('../../model/cartModel');
const catModel = require('../../model/catagoryModel');
const orderModel = require('../../model/orderModel');
const flash = require('express-flash');
const bcrypt = require('bcryptjs');
const { default: mongoose } = require('mongoose');


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
        const address = await addModel.findOne({ userId: userId });
        console.log(address);
        res.render('user/address', { userAddress: address, updateSuccess, addressExist, error });
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
        res.render('user/editaddress', { address: address[0] })
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

        // getting the current address
        const currentAddress = await addModel.findOne(
            { 'userId': userId, 'address._id': addressId },
            { 'address.$': 1 }
        );

        console.log(currentAddress, '????????????????????????');

        // checking any changes have made to the current address
        const currentAddressData = currentAddress.address[0];

        console.log(currentAddressData);

        const isChanged =
            currentAddressData.saveAs !== saveas ||
            currentAddressData.name !== name ||
            currentAddressData.email !== email ||
            currentAddressData.houseName !== housename ||
            currentAddressData.street !== street ||
            currentAddressData.pincode !== pincode ||
            currentAddressData.city !== city ||
            currentAddressData.state !== state ||
            currentAddressData.country !== country ||
            currentAddressData.mobile !== parseInt(mobile);

        if (!isChanged) {
            req.flash('error', 'No changes were made to the address');
            return res.redirect('/address');
        }

        console.log(isChanged);

        // Checking if the new address already exists
        const isAddressExists = await addModel.findOne({
            'userId': userId,
            'address': {
                $elemMatch: {
                    '_id': { $ne: new mongoose.Types.ObjectId(addressId) },
                    'saveAs': saveas,
                    'name': name,
                    'email': email,
                    'houseName': housename,
                    'street': street,
                    'pincode': pincode,
                    'city': city,
                    'state': state,
                    'country': country,
                    'mobile': parseInt(mobile)
                }
            }
        });

        if (isAddressExists) {
            req.flash('error', 'This address already exists');
            return res.redirect('/address');
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
        console.log(updatedAddress, '+++++++++++++++++++++++++');

        if (updatedAddress.modifiedCount > 0) {
            req.flash('updateSuccess', 'Address updated successfully');
        } else {
            req.flash('error', 'No changes were made to the address');
        }
        res.redirect('/address');
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
        res.redirect('/address');
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
        // const userId = req.session.userId;
        res.render('user/addaddress');
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
        const userId = req.session.userId;
        let addDoc = await addModel.findOne({ userId: userId });
        console.log(addDoc);

        if (!addDoc) {
            addDoc = new addModel({
                userId: userId,
                address: []
            });
        }

        const newAddress = {
            name,
            email,
            mobile: Number(mobile),
            houseName: housename,
            street,
            city,
            state,
            country,
            pincode,
            saveAs: saveas
        };
        addDoc.address.push(newAddress);

        console.log('Updated address array:', addDoc.address);
        await addDoc.save();
        return res.redirect('/address');
    } catch (error) {
        console.error('error while creating new address', error);
        res.render('user/error');
    }
}

// rendering the order page
const order = async (req, res) => {
    console.log('Rendering the user side order details page');
    try {
        const categories = await catModel.find();
        const userId = req.session.userId;

        const orders = await orderModel
            .find({ userId: userId })
            .sort({ createdAt: -1 })
            .populate({
                path: 'items.productId',
                select: 'name image _id',
            });

        // console.log('Orders retrieved:', orders);

        const itemCount = req.session.cartCount || 0;

        res.render('user/orders', {
            orders: orders,
            categories: categories,
            itemCount: itemCount,
        });
    } catch (error) {
        console.error('Error while rendering the order page:', error);
        res.status(500).render('user/error', { error: 'An error occurred while fetching your orders.' });
    }
}


const singleorder = async (req, res) => {
    try {
        const orderId = req.query.orderId.trim();
        const userId = req.session.userId;
        const cartCount = await cartModel.countDocuments({ userId: userId });
        const orderDetails = await orderModel.findOne({ userId: userId, _id: orderId }).populate({
            path: 'items.productId',
            select: 'name image _id',
        });

        // console.log('orderdetails:', orderDetails);

        if (!orderDetails) {
            return res.status(404).render('error', { error: 'Order not found.' });
        }

        res.render('user/singleorder', {
            orderDetails,
            cartCount
        });
    } catch (error) {
        console.log("error in singleorder", error);
        res.status(500).render('error', { error: 'An error occurred while fetching the order details.' });
    }
};


const cancelProduct = async (req, res) => {
    try {
        console.log('entered');
        const { orderId, productId } = req.body;

        console.log('body:', req.body);

        const userId = req.session.userId;

        const orderdetails = await orderModel.findOne({ userId: userId, _id: orderId });
        if (!orderdetails) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        console.log('orderdetails:', orderdetails);
        
        const itemIndex = orderdetails.items.findIndex(item => item.productId.toString() === productId);
        console.log('itemIndex:', itemIndex);
        if (itemIndex === -1) {
        console.log('itemIndex:iffffffffff', itemIndex);
            return res.status(404).json({ success: false, message: 'Product not found in order' });
        }

        console.log('itemIndex:', itemIndex);

        const item = orderdetails.items[itemIndex];

        console.log('item:', item);

        // Check if the item is already cancelled
        if (item.status === 'cancelled') {
            return res.status(400).json({ success: false, message: 'Product is already cancelled' });
        }

        // Update product stock
        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        console.log('product:', product);
        const sizeIndex=product.stock.findIndex((stock)=>stock.size==item.size)
        console.log(sizeIndex,'----------');
        product.stock[sizeIndex].quantity += item.quantity;
        console.log('product before saving:', product);

        await product.save();

        // Update order item status
        item.status = 'cancelled';
        await orderdetails.save();

        res.json({ success: true, message: 'Product cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling product:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel product' });
    }
};


module.exports = { userProfile, updateProfile, updateProfilePost, resetpassword, resetPasswordPost, showAddress, addAddress, addAddressPost, editAddress, editAddressPost, delAddress, order, singleorder, cancelProduct }