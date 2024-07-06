const mongoose = require('mongoose');
const userModel = require('../../model/userModel');
const addModel = require('../../model/addressModel');
const productModel = require('../../model/productModel');
const cartModel = require('../../model/cartModel');
const catModel = require('../../model/catagoryModel');
const orderModel = require('../../model/orderModel');

// rendering the checkout page
const checkout = async (req, res) => {
  try {
    const userId = req.session.userId;
    req.session.checkoutSave = true;
    const categories = await catModel.find();

    const address = await addModel.findOne({ userId: userId });

    const data = await cartModel.findOne({ userId }).populate({
      path: 'item.productId',
      select: 'name image'
    });

    for (const cartItem of data.item || []) {
      const pro = cartItem.productId;
      const product = await productModel.findOne({ _id: pro._id });
      const size = product.stock.findIndex(s => s.size == cartItem.size);
      if (product.stock[size].quantity < cartItem.quantity) {
        console.log('Selected quantity exceeds available stock for productId:', product._id);
        return res.redirect('/cart');
      }
    }

    let shippingCost = 0;
    if (data.item.length == 0) {
      return res.redirect('/cart');
    }
    const itemCount = req.session.cartCount;

    res.render('user/checkout', { data: data, categories, address, itemCount, shippingCost })

  } catch (error) {
    console.log(error);
    res.render("user/serverError");
  }
};


// placing the order by user
const placeOrder = async (req, res) => {
  try {
    console.log('placing the order by user');
    const userId = req.session.userId;
    const { address, paymentMethod } = req.body;

    console.log('address:', address);
    console.log('PaymentMethod:', paymentMethod);

    const cart = await cartModel.findOne({ userId: userId }).populate({
      path: 'item.productId',
      select: 'discountPrice'
    });

    if (cart.item.length === 0) {
      return res.redirect('/cart');
    }
    
    console.log('Cart:', cart);

    const useraddress = await addModel.findOne({ userId: userId });

    console.log('Address:', useraddress);

    const selectedaddress = useraddress.address[address];

    console.log('Selectedaddress:', selectedaddress);

    let totalAmount = 0;

    const orderItems = cart.item.map(cartItem => {
      totalAmount += cartItem.quantity * cartItem.productId.discountPrice;
      console.log(totalAmount, cartItem.quantity, cartItem.productId.price,'----------------');
      return {
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        size: cartItem.size,
        price: cartItem.price
      }
    });

    for (const item of orderItems) {
      const product = await productModel.findById(item.productId);
      const sizeIndex = product.stock.findIndex(s => s.size === item.size);
      if (sizeIndex !== -1) {
        product.stock[sizeIndex].quantity -= item.quantity;
        product.totalstock -= item.quantity;
        await product.save();
      }
    }

    let order = new orderModel({
      userId: userId,
      items: orderItems,
      amount: totalAmount,
      payment: paymentMethod,
      address: selectedaddress,
      status: "pending"
    })

    cart.item = [];
    cart.total = 0;
    const savedOrder = await order.save()
    await cart.save();

    req.session.orderId = savedOrder.orderId;
    res.redirect('/orderconfirmation');

  } catch (error) {
    console.log(error);
    res.status(500).send('Internal servor error');
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
