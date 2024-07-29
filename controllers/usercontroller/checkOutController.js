const mongoose = require('mongoose');
const userModel = require('../../model/userModel');
const addModel = require('../../model/addressModel');
const productModel = require('../../model/productModel');
const cartModel = require('../../model/cartModel');
const catModel = require('../../model/catagoryModel');
const orderModel = require('../../model/orderModel');
const couponModel = require('../../model/couponModel');


// rendering the checkout page
const checkout = async (req, res) => {
  try {
    console.log('entered the checkout page');
    const userId = req.session.userId;
    req.session.checkoutSave = true;
    const categories = await catModel.find();

    const address = await addModel.findOne({ userId: userId });

    const data = await cartModel.findOne({ userId }).populate({
      path: 'item.productId',
      select: 'name image'
    });

    console.log('data:',data);

    const outOfStockItems = [];

    for (const cartItem of data.item || []) {
      const pro = cartItem.productId;
      const product = await productModel.findOne({ _id: pro._id });
      const size = product.stock.findIndex(s => s.size == cartItem.size);
      if (product.stock[size].quantity < cartItem.quantity) {
        outOfStockItems.push(`${product.name} (Size: ${cartItem.size})`);
      }
    }

    if (outOfStockItems.length > 0) {
      return res.json({ success: false, outOfStockItems });
    }

    if (data.item.length == 0) {
      return res.json({ success: false, message: 'Cart is empty' });
    }

    let totalAmount = data?.total;
    console.log('totalAmount:',totalAmount);

    // applying delivary charges if total is less than 500
    let DeliveryCharge = 0;
    if (totalAmount < 500) {
      DeliveryCharge = 40;
      totalAmount += DeliveryCharge;
    }

    const couponData = req.session.coupon;
    console.log('couponData:',couponData);
    const currentDate = new Date();
    const couponDetails = await couponModel.find({ minimumPrice: { $lte: totalAmount } });
    console.log('couponDetails:',couponDetails);
    const validCoupons = couponDetails.filter(coupon => new Date(coupon.expiry) >= currentDate);
    console.log('validCoupons:',validCoupons);

    // If everything is in stock, you can proceed with the checkout
    return res.render('user/checkout', { 
      categories, 
      address, 
      data, 
      DeliveryCharge,
      validCoupons,
      couponData,
    });

  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: 'An error occurred' });
  }
};


// placing the order by user
const placeOrder = async (req, res) => {
  try {
    console.log('placing the order by user');
    const userId = req.session.userId;
    const { address, paymentMethod } = req.body;

    // Check if address is provided
    if (address === undefined) {
      return res.status(400).json({ error: 'No address selected' });
    }

    const cart = await cartModel.findOne({ userId: userId }).populate({
      path: 'item.productId',
      select: 'discountPrice'
    });

    if (!cart || cart.item.length === 0) {
      return res.redirect('/cart');
    }

    const useraddress = await addModel.findOne({ userId: userId });

    if (!useraddress || !useraddress.address || !useraddress.address[address]) {
      return res.status(400).json({ error: 'Invalid address selected' });
    }

    const selectedaddress = useraddress.address[address];

    let totalAmount = 0;

    const orderItems = cart.item.map(cartItem => {
      const product = cartItem.productId;
      totalAmount += cartItem.quantity * product.discountPrice;

      return {
        productId: product._id,
        quantity: cartItem.quantity,
        size: cartItem.size,
        price: cartItem.price
      }
    });

    let order = new orderModel({
      userId: userId,
      items: orderItems,
      amount: totalAmount,
      payment: paymentMethod,
      address: selectedaddress,
      status: "pending"
    });

    cart.item = [];
    cart.total = 0;
    const savedOrder = await order.save();
    await cart.save();

    req.session.orderId = savedOrder.orderId;
    res.redirect('/orderconfirmation');

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}



const orderConfirmation = async (req, res) => {
  try {
    console.log('rendering the order confirmation page');
    // req.session.cartCount = 0;
    // const itemCount = req.session.cartCount;
    res.render('user/orderconfirmation');
  } catch (error) {
    console.log(error);
    res.render('user/error');
  }
}


module.exports = { checkout, placeOrder, orderConfirmation }
