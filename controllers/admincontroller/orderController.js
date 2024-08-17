const userModel = require('../../model/userModel');
const productModel = require('../../model/productModel');
const orderModel = require('../../model/orderModel');


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
const returnrequest = async (req, res) => {
    try {
        console.log('rendering the order return request page');

    }
}


module.exports = { orders, singleOrder, updateStatus }