const userModel = require('../../model/userModel');
const productModel = require('../../model/productModel');
const orderModel = require('../../model/orderModel');
const walletModel = require('../../model/WalletModel');


// rendering the order listing page in the admin side
const orders = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    try {
        console.log('rendering the order listing page from the admin side');
        const orders = await orderModel.find({})
            .populate('userId')
            .populate('orderedItem')
            .sort({ _id: -1 })
            .limit(limit)
            .skip(skip)

        console.log('orders:', orders);

        const formattedOrders = orders.map(order => {
            const date = new Date(order.createdAt);
            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            return {
                ...order.toObject(),
                formattedCreatedAt: formattedDate,
            };
        });

        const count = await orderModel.countDocuments({});
        const totalPages = Math.ceil(count / limit);
        res.render('admin/orders', {
            orderDetails: formattedOrders,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            activePage: 'orders',
            limit
        });
    } catch (error) {
        console.log('Error while displaying the orders listing page from the admin side');
        res.render('admin/servererror');
    }
}


// single order view rendering from the admin side
const singleOrder = async (req, res) => {
    try {
        console.log('rendering the single order view from the admin side');
        const orderId = req.query.orderId.replace(/\s+/g, '');
        const orderDetails = await orderModel.findOne({ _id: orderId })
            .populate('userId')
            .populate({ path: 'orderedItem.productId' })
        console.log('orderDetails:', orderDetails);
        res.render('admin/singleorder', { orderDetails, activePage: 'orders' })
    } catch (error) {
        console.log('error in single product', error);
    }
}

// updating the product status
const updateStatus = async (req, res) => {
    try {
        console.log('updating the status from the admin side');
        console.log('body object:', req.body);
        const { selectedOrderStatus, orderId, productId } = req.body

        const orderStatus = await orderModel.updateOne({ _id: orderId }, { $set: { 'orderedItem.$[item].productStatus': selectedOrderStatus } }, { arrayFilters: [{ "item.productId": productId }] })

        console.log('order status:', orderStatus);

        res.status(200).json({ success: true })

    } catch (error) {
        res.status(302).json({ success: false })
        console.log('error in update status');
    }
}

// rendering the order return request page from the admin side
const returnRequest = async (req, res) => {
    try {
        console.log('rendering the order return request page');

        // fetching the orders with atleast one product having the "return initiated" status
        const returnRequests = await orderModel.aggregate([
            { $unwind: "$orderedItem" },
            { $match: { "orderedItem.productStatus": "return initiated" } },
            {
                $lookup: {
                    from: "productdetails",
                    localField: "orderedItem.productId",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $group: {
                    _id: "$_id",
                    userId: { $first: "$userId" },
                    orderNumber: { $first: "$_id" },
                    orderDate: { $first: "$createdAt" },
                    totalAmount: { $first: "$orderAmount" },
                    deliveryAddress: { $first: "$deliveryAddress" },
                    items: {
                        $push: {
                            productId: "$orderedItem.productId",
                            productName: "$productInfo.name",
                            quantity: "$orderedItem.quantity",
                            size: "$orderedItem.size",
                            price: "$orderedItem.productPrice",
                            totalPrice: "$orderedItem.totalProductPrice",
                            returnReason: "$orderedItem.returnReason"
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "userdetails",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: "$userDetails" },
            {
                $project: {
                    _id: 1,
                    orderDate: 1,
                    orderNumber: 1,
                    totalAmount: 1,
                    items: 1,
                    deliveryAddress: 1,
                    customerName: "$userDetails.username",
                    customerEmail: "$userDetails.email",
                    customerPhone: "$userDetails.phone"
                }
            }
        ]);
        console.log('Return Requests:', returnRequests);
        res.render('admin/returnrequest', { returnRequests });
    } catch (error) {
        console.log('Error occured while rendering return request page', error);
        res.render('admin/servererror');
    }
}

// approving the return request by admin
const approveReturn = async (req, res) => {
    try {
        console.log('approving the return request from the user');
        const { orderId } = req.params;
        console.log('orderId:', orderId);

        const order = await orderModel.findById(orderId);
        console.log('order:', order);

        if (!order) {
            return res.status(404).send('order not found');
        }

        const returnedItem = order.orderedItem.find(item => item.productStatus === "return initiated");
        if (!returnedItem) {
            return res.status(400).send("No return item found in this order");
        }

        // update product stock
        const product = await productModel.findById(returnedItem.productId);
        console.log('product:', product);

        if (!product) {
            return res.status(404).send('Product not found');
        }

        const sizeIndex = product.stock.findIndex(stock => stock.size === returnedItem.size);
        console.log('sizeIndex:', sizeIndex);

        if (sizeIndex !== -1) {
            product.stock[sizeIndex].quantity += returnedItem.quantity;
            product.totalStock += returnedItem.quantity;
            await product.save();
        }

        // calculate the refund amount
        let refundAmount = returnedItem.totalProductPrice;
        if (order.couponDiscount) {
            const discountPerItem = order.couponDiscount / order.orderedItem.length;
            refundAmount -= discountPerItem;
        }

        // process refund to the user's wallet
        await walletModel.findOneAndUpdate(
            { userId: order.userId },
            {
                $inc: { balance: refundAmount },
                $push: {
                    transaction: {
                        amount: refundAmount,
                        transactionsMethod: "Refund",
                        orderId: order._id
                    }
                }
            },
            { upsert: true, new: true }
        );

        // update order status
        returnedItem.productStatus = "returned";
        await order.save();

        res.redirect('/admin/returnrequests');
    } catch (error) {
        console.log('Error occured while approving the return', error);
        res.render('admin/servererror');
    }
}

// rejecting the return request by the user
const rejectReturn = async (req, res) => {
    try {
        console.log('rejecting the return request from the user');
        const { orderId } = req.params;
        console.log('orderId:', orderId);

        const order = await orderModel.findById(orderId);
        console.log('order:', order);

        if (!order) {
            return res.status(404).send('order not found');
        }

        const returnedItemIndex = order.orderedItem.findIndex(item => item.productStatus === "return initiated");
        if (returnedItemIndex === -1) {
            return res.status(400).send('No return initiated item found in this order');
        }

        // update the product status
        order.orderedItem[returnedItemIndex].productStatus = "return rejected";
        order.orderedItem[returnedItemIndex].returnReason = "This product cannot be returned";
        await order.save();

        res.redirect('/admin/returnrequests');
    } catch (error) {
        console.log('Error occured while rejectecing the return request', error);
        res.render('admin/servererror');
    }
}



module.exports = {
    orders,
    singleOrder,
    updateStatus,
    returnRequest,
    approveReturn,
    rejectReturn
}