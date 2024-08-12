const userModel = require('../model/userModel');

const logged = async (req, res, next) => {
    try {
        const user = await userModel.findOne({ _id: req.session.userId })
        if (req.session.isAuth && user && user.status === true) {
            next();
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        console.log(error);
        res.render('user/error');
    }
}

const ifLogged = async (req, res, next) => {
    try {
        if (req.session.isAuth) {
            res.redirect('/')
        } else {
            next();
        }
    } catch (error) {
        console.log(error);
        res.render('user/error');
    }
}

const forgot = async (req, res, next) => {
    try {
        if (req.session.forgot) {
            next()
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.log(error);
        res.render('user/error');
    }
}

const signed = async (req, res, next) => {
    try {
        if (req.session.signup || req.session.forgot) {
            next();
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.log(error);
        res.render('user/error');
    }
}

// const checkoutValid = async (req, res, next) => {
//     try {
//         if (req.session.checkout) {
//             next();
//         } else {
//             res.redirect('/login');
//         }
//     } catch (error) {
//         console.log(error);
//         res.render('user/error');
//     }
// }

module.exports = { ifLogged, logged, forgot, signed };