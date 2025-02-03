const mongoose = require('mongoose');
const userModel = require('../../model/userModel');
const addModel = require('../../model/addressModel');
const productModel = require('../../model/productModel');
const cartModel = require('../../model/cartModel');
const catModel = require('../../model/catagoryModel');
const orderModel = require('../../model/orderModel');
const couponModel = require('../../model/couponModel');
const paymentModel = require('../../model/paymentModel');
const WalletModel = require('../../model/WalletModel');


// rendering the checkout page
const checkout = async (req, res) => {
  try {
    console.log('entered the checkout page');
    const userId = req.session.userId;
    console.log('userId:', userId);

    const address = await addModel.findOne({ userId: userId });

    const user = await userModel.findOne({ _id: userId });
    console.log('user:', user);
    const data = await cartModel.findOne({ userId }).populate({
      path: 'item.productId',
      select: 'name image price'
    });

    console.log('data:', data);

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

    let totalAmount = data.total;

    const couponData = req.session.coupon;
    console.log('couponData:', couponData);
    const currentDate = new Date();


    const couponDetails = await couponModel.find({ minimumPrice: { $lte: totalAmount } });
    console.log('couponDetails:', couponDetails);

    const validCoupons = couponDetails.filter(coupon =>
      new Date(coupon.expiry) >= currentDate &&
      !user.usedCoupons.includes(coupon.couponCode)
    );

    console.log('validCoupons:', validCoupons);

    req.session.checkoutSave = true;

    if (!couponData) {
      res.render('user/checkout', { address, data, validCoupons, couponData: "" });
    } else {
      res.render('user/checkout', { address, data, validCoupons, couponData: couponData })
    }
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: 'An error occurred' });
  }
};


// applying the coupon in the checkout page
const applyCoupon = async (req, res) => {
  try {
    console.log('entering into the apply coupon function');
    const { cartTotal, couponCode } = req.body;
    console.log('cartTotal:', cartTotal);
    console.log('couponCode:', couponCode);

    const userId = req.session.userId;
    const couponData = await couponModel.findOne({ couponCode: couponCode });
    console.log('couponData:', couponData);
    if (couponData && couponData.status === true) {
      const user = await userModel.findById(userId);

      if (user && user.usedCoupons.includes(couponCode)) {
        res.json({ success: false, message: "Already Redeemed" });
      }
      if (couponData.expiry > new Date() && couponData.minimumPrice <= cartTotal) {
        let discountPrice;
        let totalAmount;

        if (couponData.type === 'percentageDiscount') {
          discountPrice = (cartTotal * couponData.discount) / 100;
          if (discountPrice >= couponData.maxRedeem) {
            discountPrice = couponData.maxRedeem;
          }
          totalAmount = cartTotal - discountPrice;
        } else if (couponData.type === 'flatDiscount') {
          discountPrice = couponData.discount;
          totalAmount = cartTotal - discountPrice;
        }

        req.session.coupon = couponData;

        console.log('req.session.coupon:', req.session.coupon)

        res.json({ success: true, discountPrice, totalAmount });
      } else {
        res.json({ success: false, message: "Invalid Coupon" });
      }
    } else {
      res.json({ success: false, message: "Coupon not found" });
    }
  } catch (error) {
    console.log('error occurred while applying the coupon', error);
    res.render('user/error');
  }
}


// removing the applied coupon from the checkout page
const removeCoupon = async (req, res) => {
  try {
    console.log('entering into the removing applied coupon');
    const { cartTotal, couponCode } = req.body;
    console.log('cartTotal:', cartTotal);
    console.log('couponCode', couponCode);

    if (!cartTotal || !couponCode) {
      return res.status(400).json({
        success: false,
        message: "cart total and coupon code are required"
      });
    }

    req.session.coupon = null;

    console.log('req.session.coupon:', req.session.coupon);

    res.status(200).json({
      success: true,
      message: "coupon removed successfully",
      removedCouponCode: couponCode,
      updatedTotal: cartTotal
    })
  } catch (error) {
    console.log('error while removinga the applied coupon', error);
    res.status(500).json({ success: false, message: "An error occured while removing the coupon" })
  }
}


// placing an order by the user through razorpay or COD
const placeOrder = async (req, res) => {
  try {
    console.log('entering into the place order function by the user');
    const { transactionId } = req.query;
    const { Amount, address, paymentMethod, coupon, status } = req.body;
    const userId = req.session.userId;

    console.log('req.query:', req.query);
    console.log('req.body:', req.body);

    if (!address) {
      return res.json({ success: false, message: "please select an address" });
    }

    const cartDetails = await cartModel.findOne({ userId: userId }).populate('productId');
    let totalAmount = cartDetails.total;

    console.log('totalAmount:', totalAmount);

    let couponDiscount = 0;

    const couponData = await couponModel.findOne({ couponCode: coupon });
    console.log('couponData:', couponData);

    if (couponData) {
      couponDiscount = Number((totalAmount - Amount).toFixed(2));
      await userModel.findByIdAndUpdate(userId, { $addToSet: { usedCoupons: coupon } });
    }

    console.log('couponDiscount:', couponDiscount);

    await userModel.findByIdAndUpdate(userId, { $addToSet: { usedCoupons: coupon } });

    const useraddress = await addModel.findOne({ userId: userId });
    console.log('useraddress:', useraddress);
    const selectedAddress = useraddress.address[address];
    console.log('selectedaddress:', selectedAddress);

    const orderedItem = await cartDetails.item.map((item) => ({
      productId: item.productId._id,
      quantity: item.quantity,
      size: item.size,
      productPrice: item.price,
      offer_id: item.offer_id,
      totalProductPrice: item.total
    }));

    console.log('orderedItem:', orderedItem);

    // reducing the stock of the selected size in the cart
    for (let item of orderedItem) {
      const { productId, quantity, size } = item
      const product = await productModel.findById(productId);
      console.log('product:', product);

      if (product) {
        const sizeIndex = product.stock.findIndex(s => s.size === size);
        console.log('sizeIndex:', sizeIndex);
        if (sizeIndex !== -1) {
          product.stock[sizeIndex].quantity -= quantity;
          product.totalstock -= quantity;
          await product.save();
        } else {
          console.log(`size ${size} not found for the product ${productId}`);
        }
      } else {
        console.log(`product not found: ${productId}`);
      }
    }

    const order = new orderModel({
      userId: userId,
      cartId: cartDetails._id,
      orderedItem: orderedItem,
      orderAmount: Amount,
      deliveryAddress: selectedAddress,
      paymentMethod: paymentMethod,
      paymentStatus: status,
      couponDiscount: couponDiscount
    })

    console.log('order before saving:', order);

    await order.save()
    console.log('order after saving:', order);

    await cartModel.deleteOne({ userId: userId });

    if (status === 'pending' && paymentMethod === 'Razorpay') {
      return res.json({ success: false, orderId: order._id })
    }

    const payment = new paymentModel({
      userId: userId,
      orderId: order._id,
      amount: totalAmount,
      status: paymentMethod === 'COD' ? "pending" : "completed",
      paymentMethod: paymentMethod,
      transactionId: transactionId
    });

    await payment.save()

    console.log('payment:', payment);

    console.log('OrderId:', order._id,);

    res.status(200).json({ success: true, message: "Order has placed successfully", orderId: order._id });
  } catch (error) {
    console.log('error occured while placing the order....fix it', error);
    res.render('user/error');
  }
}

// placing the order using the wallet
const placeOrderWallet = async (req, res) => {
  try {
    console.log('placing thee order by using the user wallet');
    const { Amount, address, paymentMethod, status, coupon } = req.body;
    console.log('Amount:', Amount);
    console.log('address:', address);
    console.log('paymentMethod:', paymentMethod);
    console.log('status:', status);
    console.log('coupon:', coupon);

    const userId = req.session.userId;

    // fetching the cart details
    const cartDetails = await cartModel.findOne({ userId }).populate('item.productId');
    console.log('cartDetails:', cartDetails);

    if (!cartDetails || cartDetails.item.length === 0) {
      return res.status(400).json({ success: false, message: "cart is empty" });
    }

    const totalAmount = cartDetails.total;
    console.log('totalAmount:', totalAmount);

    let couponDiscount = 0;

    const couponData = await couponModel.findOne({ couponCode: coupon });
    console.log('couponData:', couponData);

    if (couponData) {
      couponDiscount = Number((totalAmount - Amount).toFixed(2));
      await userModel.findByIdAndUpdate(userId, { $addToSet: { usedCoupons: coupon } });
    }

    const useraddress = await addModel.findOne({ userId: userId });
    const deliveryAddress = useraddress.address[address];
    console.log('deliveryAddress:', deliveryAddress);

    // preparing the ordered items
    const orderedItem = await cartDetails.item.map((item) => ({
      productId: item.productId._id,
      quantity: item.quantity,
      size: item.size,
      productPrice: item.price,
      offer_id: item.offer_id,
      totalProductPrice: item.total
    }));

    console.log('orderedItem:', orderedItem);

    for (let item of orderedItem) {
      const { productId, quantity, size } = item
      const product = await productModel.findById(productId);
      console.log('product:', product);

      if (product) {
        const sizeIndex = product.stock.findIndex(s => s.size === size);
        console.log('sizeIndex:', sizeIndex);
        if (sizeIndex !== -1) {
          product.stock[sizeIndex].quantity -= quantity;
          product.totalstock -= quantity;
          await product.save();
        } else {
          console.log(`size ${size} not found for the product ${productId}`);
        }
      } else {
        console.log(`product not found: ${productId}`);
      }
    }

    // fetching the wallet details
    const walletDetails = await WalletModel.findOne({ userId });
    console.log('walletDetails:', walletDetails);

    if (!walletDetails || walletDetails.balance < totalAmount) {
      return res.status(400).json({ success: false, message: "Insufficient Wallet balance" });
    }

    // creating a new order
    const order = new orderModel({
      userId: userId,
      cartId: cartDetails._id,
      orderedItem: orderedItem,
      orderAmount: Amount,
      deliveryAddress: deliveryAddress,
      paymentMethod: paymentMethod,
      paymentStatus: status,
      couponDiscount: couponDiscount
    });

    console.log('order before saving:', order);
    await order.save();
    console.log('order after saving:', order);


    // updating the wallet with the order reference
    const walletFund = await WalletModel.updateOne(
      { userId: userId },
      {
        $inc: { balance: -totalAmount },
        $push: { transaction: { amount: totalAmount, transactionsMethod: "Payment", orderId: order._id } }
      }
    );
    console.log('walletFund:', walletFund);

    await cartModel.deleteOne({ userId: userId });

    // creating a payment model
    const payment = new paymentModel({
      userId: userId,
      orderId: order._id,
      amount: totalAmount,
      status: "completed",
      paymentMethod: paymentMethod
    });
    await payment.save()

    console.log('payment:', payment);

    console.log('OrderId:', order._id,);
    res.status(200).json({ success: true, message: "Order has placed successfully", orderId: order._id });

  } catch (error) {
    console.log('some error occurred while placing the order', error);
    res.render('user/error');
  }
}

// retrying the failed payment while order placing using Razorpay
const retryPayment = async (req, res) => {
  try {
    console.log('entering into the retrying the failed razorpay payment while placing an order');
    const userId = req.session.userId;
    const { orderId, transactionId } = req.body;
    console.log('req.body:', req.body);
    const orderDetail = await orderModel.findOne({ _id: orderId });
    console.log('orderDetail:', orderDetail);
    const updateOrderStatus = await orderModel.updateOne({ _id: orderId }, { $set: { paymentStatus: 'success' } });
    console.log('updateOrderStatus:', updateOrderStatus);
    const payment = new paymentModel({
      userId: userId,
      orderId: orderId,
      amount: orderDetail.orderAmount,
      status: "completed",
      paymentMethod: "Razorpay",
      transactionId: transactionId
    });
    await payment.save();
    console.log('updated payment model:', payment);
    res.status(200).json({ success: true, message: "order placed successfully", orderId: orderId._id });
  } catch (error) {
    console.log('error occurred while retrying the payment method', error);
    res.render('user/error');
  }
}

// rendering the order confirmation page for the user
const orderConfirmation = async (req, res) => {
  try {
    console.log('rendering the order confirmation page');
    const userId = req.session.userId;
    const { orderId } = req.query;
    console.log('orderId:', orderId);
    const userdata = await userModel.findOne({ _id: userId });
    console.log('userdata:', userdata);
    const orderDetail = await orderModel.findOne({ _id: orderId }).populate('userId');
    console.log('orderDetail:', orderDetail);
    const formattedDate = orderDetail.createdAt.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    console.log('formattedDate:', formattedDate);
    res.render('user/orderconfirmation', {
      orderDetail,
      userdata,
      formattedDate,
    });
  } catch (error) {
    console.log('error in rendering the order confirmation page for the user', error);
    res.render('user/error');
  }
}


module.exports = {
  checkout,
  applyCoupon,
  removeCoupon,
  placeOrder,
  placeOrderWallet,
  retryPayment,
  orderConfirmation
}
