const adminModel = require('../../model/userModel');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const path = require('path');
const flash = require('express-flash');


// rendering admin login page....
const adlogin = async (req, res) => {
    try {
        res.render('admin/adminlogin', { passwordError: ' ' });
    } catch (error) {
        console.log(error);    
    }
}

// adminloginpost
const adloginpost = async (req, res) => {
    try {
        console.log(req.body);
        const password = req.body.password;
        const email = req.body.email;
        const user = await adminModel.findOne({ email: email });
        if (user.isAdmin == true && await bcrypt.compare(password, user.password)) {

            req.session.isAdAuth = true;
            // console.log('if ------->>');
            res.redirect('/admin/adminpanel');
            // console.log('if ------->>');
        }
    } catch (error) {
        console.log(error);
        res.render('admin/servererror');
    }
}


const admin_panel = async (req, res) => {
    try {
        // console.log('reached admin panel ----------->>');
        res.render("admin/adminpanel")
    } catch (error) {
        console.log('error admin panel ----------->   ', error);
    }
} 


const users = async (req, res) => {
    try {
        console.log('user listing page from admin side-------------->> ');
        const user = await adminModel.find({ isAdmin: false });
        res.render('admin/users', { users: user })
    } catch (error) {
        console.log('error while loading the user page');
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
        console.log('error happend while listing');
        res.render('admin/servererror');
    }
}


module.exports = { adlogin, adloginpost, admin_panel, users, checkUserStatus};