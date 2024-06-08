const userModel = require('../model/userModel');

const logged = async (req, res, next) => {
    try {
        const user = await userModel.findOne({ _id: req.session.userId })
        if (req.session.isAuth && user && user.status === true) {
            next();
        } else {
            req.session.isAuth = false;
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

module.exports = { ifLogged, logged };