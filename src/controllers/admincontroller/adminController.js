const adminModel = require('../../model/userModel');
const userModel = require('../../model/userModel');
const catModel = require('../../model/catagoryModel');
const orderModel = require('../../model/orderModel');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const path = require('path');
const flash = require('express-flash');


// rendering admin login page....
const adlogin = async (req, res) => {
    try {
        let passwordError = req.flash('passwordError');
        let emailError = req.flash('emailError');
        res.render('admin/adminlogin', { passwordError, emailError });
    } catch (error) {
        console.log('error occured while rendering the admin login page', error);
        res.render('admin/servererror');
    }
}

// veryfying the admin login credentials
const adloginpost = async (req, res) => {
    try {
        console.log('enteing to the admin login page')
        const password = req.body.password;
        const email = req.body.email;
        const admin = await adminModel.findOne({ email: email });
        if (!admin) {
            req.flash('emailError', 'Invalid email address');
            return res.redirect('/admin');
        }
        if (admin.isAdmin !== true) {
            req.flash('emailError', 'This email is not registered as an admin');
            return res.redirect('/admin');
        }
        if (!(await bcrypt.compare(password, admin.password))) {
            req.flash('passwordError', 'Incorrect password');
            return res.redirect('/admin');
        }

        req.session.isAdAuth = true;
        return res.redirect('/admin/dashboard');
    } catch (error) {
        console.log('error while logging in the admin', error);
        res.render('admin/servererror');
    }
}

// rendering the admin dashboard page......
const dashboard = async (req, res) => {
    try {
        console.log('rendering the admin dashboard page');
        const userCount = await userModel.countDocuments({});
        console.log('userCount:', userCount);
        const categoryCount = await catModel.countDocuments({});
        console.log('categoryCount:', categoryCount);

        // setting start of year for filtering orders
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        console.log('startofYear:', startOfYear);

        // aggregating the order data
        const monthlyOrderData = await orderModel.aggregate([
            // match orders from the start of the year
            { $match: { createdAt: { $gte: startOfYear } } },
            // unwind ordered items
            { $unwind: "$orderedItem" },
            // filter out specific order statuses
            { $match: { "orderedItem.productStatus": { $nin: ["cancelled", "returned", "pending", "shipped"] } } },
            // Group by order,month and year
            {
                $group: {
                    _id: {
                        orderId: "$_id",
                        month: { $month: "$createdAt" },
                        year: { $year: "$createdAt" }
                    },
                    orderAmount: { $first: "$orderAmount" },
                    couponDiscount: { $first: "$couponDiscount" }
                }
            },
            // Group by month and year, calculate totals
            {
                $group: {
                    _id: {
                        month: "$_id.month",
                        year: "$_id.year"
                    },
                    monthlyTotal: { $sum: "$orderAmount" },
                    monthlyCouponDiscount: { $sum: "$couponDiscount" },
                    orderCount: { $sum: 1 }
                }
            },
            // Sort by year and month
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        console.log('monthlyOrderData:', monthlyOrderData);

        // initialize arrays for the monthly data
        let orderCounts = new Array(12).fill(0);
        console.log('orderCounts:', orderCounts);
        let totalAmounts = new Array(12).fill(0);
        console.log('totalAmounts:', totalAmounts);
        let couponDiscounts = new Array(12).fill(0);
        console.log('couponDiscounts:', couponDiscounts);

        // populate arrays with aggregated data
        monthlyOrderData.forEach(data => {
            const monthIndex = data._id.month - 1;
            orderCounts[monthIndex] = data.orderCount;
            totalAmounts[monthIndex] = data.monthlyTotal;
            couponDiscounts[monthIndex] = data.monthlyCouponDiscount;
        });

        // calculate totals
        const totalAmount = totalAmounts.reduce((acc, curr) => acc + curr, 0);
        console.log('totalAmount:', totalAmount);
        const totalCouponDiscount = couponDiscounts.reduce((acc, curr) => acc + curr, 0);
        console.log('totalCouponDiscount:', totalCouponDiscount);
        const totalOrderCount = orderCounts.reduce((acc, curr) => acc + curr, 0);
        console.log('totalOrderCount:', totalOrderCount);

        const bestProducts = await orderModel.aggregate([
            {
                $unwind: "$orderedItem"
            },
            {
                $lookup: {
                    from: "productdetails",
                    localField: "orderedItem.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            {
                $addFields: {
                    productName: { $arrayElemAt: ["$productDetails.name", 0] } 
                }
            },
            {
                $group: {
                    _id: "$productName", 
                    count: { $sum: "$orderedItem.quantity" }
                }
            },
            {
                $sort: {
                    count: -1
                }
            }
        ]);

        console.log('bestProducts:', bestProducts);

        const topCategories = await orderModel.aggregate([
            {
                $unwind: "$orderedItem"
            },
            {
                $lookup: {
                    from: "productdetails",
                    localField: "orderedItem.productId",
                    foreignField: "_id",
                    as: "product_details"
                }
            },
            {
                $unwind: "$product_details"
            },
            {
                $group: {
                    _id: "$product_details.category",
                    totalQuantity: { $sum: "$orderedItem.quantity" }
                }
            },
            {
                $sort: { totalQuantity: -1 }
            },
            {
                $limit: 3
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "category_details"
                }
            },
            {
                $unwind: "$category_details"
            },
            {
                $project: {
                    _id: 0,
                    category: "$category_details.name",
                    totalQuantity: 1
                }
            }
        ]);

        console.log('topCategories:', topCategories);

        // rendering the dashboard view with data
        res.render("admin/dashboard", {
            userCount,
            categoryCount,
            totalAmount,
            totalCouponDiscount,
            totalOrderCount,
            totalAmounts,
            couponDiscounts,
            bestProducts,
            topCategories,
            orderCounts,
        });
    } catch (error) {
        console.log('error while rendering the admin dashboard', error);
        res.render('admin/servererror');
    }
};

// listing the users from the admin side....
const users = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    try {
        const user = await adminModel.find({ isAdmin: false }).sort({ _id: -1 }).limit(limit).skip(skip);
        const totalUsers = await adminModel.countDocuments({});
        console.log(totalUsers);
        const totalpages = Math.ceil(totalUsers / limit);
        const locals = {
            users: user,
            currentPage: page,
            totalPages: totalpages,
            hasNextPage: page < totalpages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalpages,
            activePage: 'users',
            limit: limit
        };
        res.render('admin/users', { locals });
    } catch (error) {
        console.log('error while loading the user listing page', error);
        res.render('admin/servererror');
    }
}

// user listing (block & unblocking)
const checkUserStatus = async (req, res) => {
    try {
        console.log('reaching user blocking area.........');
        const id = req.params.id;
        const user = await adminModel.findById(id);
        const newValue = !user.status;
        // req.session.isAuth = false;
        await adminModel.updateOne({ _id: id }, { $set: { status: newValue } });
        res.redirect('/admin/users');
    } catch (error) {
        console.log('error happend while listing', error);
        res.render('admin/servererror');
    }
}

// admin logout
const adLogOut = async (req, res) => {
    try {
        req.session.isAdAuth = false;
        res.redirect('/admin');
    } catch (error) {
        console.log('error while logging out the admin');
        res.render('admin/servererror');
    }
}

module.exports = {
    adlogin,
    adloginpost,
    dashboard,
    users,
    checkUserStatus,
    adLogOut
};