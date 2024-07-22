const adminModel = require('../../model/userModel');
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
        console.log(error);
    }
}

// adminloginpost
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
        return res.redirect('/admin/adminpanel');
    } catch (error) {
        console.log('error while logging in the admin', error);
        res.render('admin/servererror');
    }
}

// rendering the adminpanel page......
const adminpanel = async (req, res) => {
    try {
        console.log('rendering the adminpanel from the admin side');
        res.render("admin/adminpanel")
    } catch (error) {
        console.log('error while rendering the admin panel', error);
    }
}

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

module.exports = { adlogin, adloginpost, adminpanel, users, checkUserStatus, adLogOut };