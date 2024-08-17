const razorpay = require('razorpay');
const crypto = require('crypto');
const couponModel = require('../../model/couponModel');
const cartModel = require('../../model/cartModel');
const orderModel = require('../../model/orderModel');
const Razorpay = require('razorpay');
require('dotenv').config();


const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

// creating an order instance to integrate with Razorpay payment gateway
const createOrder = async (req, res) => {
    try {
        console.log('creating an order instance to integrate with the razorpay payment gateway');
        let { orderId } = req.body;
        console.log('req.body:', req.body);
        console.log('orderId:', orderId);
        const userId = req.session.userId;
        console.log('userId :', userId);
        let totalAmount;
        if (orderId) {
            const orderDetails = await orderModel.findOne({ _id: orderId });
            totalAmount = orderDetails.orderAmount;
            console.log('totalAmount from the existing order:', totalAmount);
        } else {
            const cartDetails = await cartModel.findOne({ userId: userId });
            console.log('cartDetails:', cartDetails);
            totalAmount = cartDetails.total;
            console.log('totalAmount from the cart:', totalAmount);
        }
        console.log('req.session.coupon:', req.session.coupon);
        if (req.session.coupon) {
            const couponDetails = await couponModel.findOne({ _id: req.session.coupon });
            console.log('couponDetails:', couponDetails);
            if (couponDetails && totalAmount >= couponDetails.minimumPrice) {
                if (couponDetails.type === 'flatDiscount') {
                    totalAmount = Math.max(0, totalAmount - couponDetails.discount);
                } else if (couponDetails.type === 'percentageDiscount') {
                    const discountAmount = (totalAmount * couponDetails.discount) / 100;
                    totalAmount = Math.max(0, totalAmount - discountAmount);
                }
            }
        }
        if (totalAmount < 500) {
            totalAmount += 40;
        }
        if (orderId) {
            const orderDetails = await orderModel.findOne({ _id: orderId });
            totalAmount = orderDetails.orderAmount;
            console.log('totalAmount:', totalAmount);
        }

        const instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        })

        const options = {
            amount: Math.round(totalAmount * 100),
            currency: "INR"
        }

        instance.orders.create(options, (error, order) => {
            if (error) {
                console.log('error in order creation', error);
                return res.status(500).json({ message: "something went wrong" })
            } else {
                console.log('successfully created an order');
                res.status(200).send({
                    success: true,
                    msg: "order Created",
                    orderId: order.id,
                    amount: totalAmount * 100,
                    key_id: process.env.RAZORPAY_KEY_ID,
                    product_name: req.body.name,
                    description: "Test Transaction"
                })
            }
        })

    } catch (error) {
        console.log('error occurred while creating an order', error);
        return res.status(500).json({ message: "internal server error" });
    }
}


// veryfying the payment made through the Razorpay payment gateway
const verifyPayment = async (req, res) => {
    try {
        console.log('veryfing the payment made through the Razorpay payment gateway');
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        console.log('req.body', req.body);
        const data = `${razorpay_order_id}|${razorpay_payment_id}`;
        console.log('data:', data);
        const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(data).digest('hex');
        console.log('generated_signature:', generated_signature);
        console.log('received_signature:', razorpay_signature);
        if (generated_signature === razorpay_signature) {
            console.log('signature verification was successful');
            res.status(200).json({ success: true, message: "payment is successful", razorpay_order_id });
        } else {
            console.log('signature verification failed');
            res.status(400).json({ success: false, message: "payment verification failed" });
        }
    } catch (error) {
        console.log("error in fund verification", error);
        res.render('user/error');
    }
}


// adding funds to wallet using razorpay
const addFund = async (req, res) => {
    try {
        console.log('adding funds to the wallet by razorpay');
        const instance = new Razorpay({
            key_id: key_id,
            key_secret: key_secret,
        });

        const amount = parseInt(req.body.amount);
        console.log('amount:', amount);

        const options = {
            amount: amount * 100,
            currency: "INR",
        };

        instance.orders.create(options, (error, order) => {
            if (error) {
                console.log('error occured in order creation', error);
                return res.status(500).json({ message: "something went wrong" })
            } else {
                console.log('order has been created successfully');
                res.status(200).send({
                    success: true,
                    msg: "order created",
                    orderId: order.id,
                    amount: amount * 100,
                    key_id: key_id,
                    product_name: "Add funds",
                    description: "Test Transaction"
                })
            }
        })
    } catch (error) {
        console.log('error happened in fund adding to wallet', error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}


// veryfying the funds adding to the wallet
const fundVerification = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const data = `${razorpay_order_id}|${razorpay_payment_id}`;
        const generated_signature = crypto
            .createHmac('sha256', key_secret)
            .update(data)
            .digest('hex');
        if (generated_signature === razorpay_signature) {
            res.status(200).json({ success: true, message: "Payment is successful", razorpay_payment_id });
        } else {
            console.log("Signature verification failed");
            res.status(400).json({ success: false, message: "Payment verification failed" })
        }
    } catch (error) {
        console.log('error in fund verification', error);
        res.render('user/error');
    }
}

module.exports = { addFund, fundVerification, createOrder, verifyPayment }