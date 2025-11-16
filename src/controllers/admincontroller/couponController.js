const couponModel = require('../../model/couponModel');


// rendering the couponlisting page from the admin side
const coupons = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    try {
        console.log('rendering the coupon listing page from the admin side');
        const couponExists = req.flash('couponExists');
        const success = req.flash('success');
        const error = req.flash('error');

        const totalCoupons = await couponModel.countDocuments({});
        const fetchedCoupons = await couponModel.find({})
            .skip(skip)
            .limit(limit)
            .sort({ _id: -1 });

        const totalPages = Math.ceil(totalCoupons / limit);
        const pagesToShow = 5;
        let startPage = Math.max(1, page - Math.floor(pagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + pagesToShow - 1);
        if (endPage - startPage < pagesToShow - 1) {
            startPage = Math.max(1, endPage - pagesToShow + 1);
        }
        res.render('admin/coupons', {
            coupons: fetchedCoupons,
            couponExists,
            success,
            error,
            currentPage: page,
            startPage: startPage,
            endPage: endPage,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            activePage: 'coupons',
            limit
        })
    }
    catch (error) {
        console.log('Error while rendering the coupon listing page');
        res.render('admin/servererror');
    }
}

// rendering the new coupons adding page from the admin side
const addCoupon = async (req, res) => {
    try {
        console.log('rendering the coupon adding page');
        const couponExists = req.flash('couponExists');
        res.render('admin/addcoupon', { couponExists });
    } catch (error) {
        console.log('error while rendering the coupon adding page', error);
        req.render('admin/servererror');
    }
}

// creating a new coupon for the orders 
const newCoupon = async (req, res) => {
    try {
        console.log('entered into the new coupon adding function from the admin side');
        const { couponCode, couponType, minimumPrice, discount, maxRedeem, expiry } = req.body;

        const couponExists = await couponModel.findOne({ couponCode: couponCode });

        if (couponExists) {
            req.flash('couponExists', 'This coupon alreay exists');
            return res.redirect('/admin/coupons');
        }

        const newCoupon = new couponModel({
            couponCode,
            type: couponType,
            minimumPrice: Number(minimumPrice),
            discount: Number(discount),
            maxRedeem: Number(maxRedeem),
            expiry
        });

        await newCoupon.save();
        res.redirect('/admin/coupons');
    } catch (error) {
        console.error('Error adding the coupon:', error);
        res.render('admin/servererror');
    }
}

// listing and unlisting the added coupon from the admin side
const unlistCoupon = async (req, res) => {
    try {
        console.log('unlisting the added coupon from the admin side');
        const id = req.params.id;
        const coupon = await couponModel.findOne({ _id: id });
        coupon.status = !coupon.status;
        await coupon.save();
        res.redirect('/admin/coupons');
    } catch (error) {
        console.log('error occured while unlisting then added coupon');
        res.render('admin/servererror');
    }
}

// rendering the coupon editing page from the page
const updateCouponPage = async (req, res) => {
    try {
        console.log('rendering the edit coupon page from the admin side');
        const id = req.params.id;
        const coupon = await couponModel.findOne({ _id: id });
        res.render('admin/updatecoupon', { coupon })
    } catch (error) {
        console.log('error while rendering the updatecoupon page form the admin side', error);
        res.render('admin/servererror');
    }
}


// updating the already existing coupons
const updateCoupon = async (req, res) => {
    try {
        console.log('updating the existing coupon from the admin side');
        const { couponId, couponCode, couponType, minimumPrice, discount, maxRedeem, expiry } = req.body;

        const existingCoupon = await couponModel.findById(couponId);
        if (!existingCoupon) {
            req.flash('error', 'coupon not found');
            return res.redirect('/admin/coupons');
        }

        if (couponCode !== existingCoupon.couponCode) {
            const couponExists = await couponModel.findOne({ couponCode: couponCode });
            if (couponExists) {
                req.flash('couponExists', 'This coupon alreay exists');
                return res.redirect('/admin/coupons');
            }
        }

        const updatedCoupon = await couponModel.findByIdAndUpdate(
            couponId,
            {
                $set: {
                    couponCode: couponCode,
                    type: couponType,
                    minimumPrice: Number(minimumPrice),
                    discount: Number(discount),
                    maxRedeem: Number(maxRedeem),
                    expiry: new Date(expiry)
                }
            });
        if (updatedCoupon) {
            req.flash('success', 'Coupon updated successfully');
        } else {
            req.flash('error', 'Failed to update coupon');
        }
        res.redirect('/admin/coupons');

    } catch (error) {
        console.log('error while updating the existing coupon', error);
        res.render('admin/servererror');
    }
}


module.exports = {
    coupons,
    addCoupon,
    newCoupon,
    unlistCoupon,
    updateCouponPage,
    updateCoupon
}