const razorpay = require('razorpay');
const crypto = require('crypto');
const order = require('../../model/orderModel');
const couponModel = require('../../model/couponModel');
const cartModel = require('../../model/cartModel');
require('dotenv').config();


const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

// // creating an order instance 
// const createOrder = async (req, res) => {
//     try {
//         let { orderId } = req.body;
//         const userId = req.session.userId;
//         let cartTotal = await cartModel.findOne({ userId: userId }).populate({
//             path:'item.product'
//         });
//         console.log('cartTotal:', cartTotal);

//         let totalAmount = cartTotal.reduce((acc, curr) => {
//             return acc + curr.price;
//         }, 0);
//         if (req.session.coupon) {
//             const coupon = await couponModel.findOne({ _id: req.session.coupon });
            
//         }
//     }
// }


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
    }
}









module.exports = { addFund, fundVerification }