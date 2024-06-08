const adAuth = async (req, res, next) => {
    try {
        if (req.session.isAdAuth) {
            next()
        } else {
            res.redirect('/admin')
        }
    } catch (error) {
        console.log('oops...page didnt found');
        res.render('admin/servererror');
    }
}

module.exports = {adAuth};