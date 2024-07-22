const offerModel = require('../../model/offerModel');
const catModel = require('../../model/catagoryModel');
const productModel = require('../../model/productModel');


// rendering the offers displaying page for the admin

const offer = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    try {
        console.log('displaying the offers page from the admin side');
        const offers = await offerModel.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);


        const totalOffers = await offerModel.countDocuments({});
        const totalPages = Math.ceil(totalOffers / limit);

        res.render('admin/offers', {
            offers,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            activePage: 'offer'
        });
    } catch (error) {
        console.log('error displaying the offer page');
        res.render('admin/servererror');
    }
}

// choosing an offertype for applying offer
const offerType = async (req, res) => {
    try {
        console.log('entering to the function where we choose which is the offertype');
        const { offerType } = req.body;
        console.log('req.body:', req.body);
        if (offerType === "category") {
            const categoryDetails = await catModel.find({});
            console.log('categoryDetails:', categoryDetails)
            res.status(200).json({ categoryDetails })
        } else if (offerType === "product") {
            const productDetails = await productModel.find({});
            console.log("productDetails:", productDetails);
            res.status(200).json({ productDetails });
        }
    } catch (error) {
        console.log('error occured while choosing offertype', error);
        res.status(500).json({ success: false });
    }
}

// adding a new offer to a catagory or particular product

const addOffer = async (req, res) => {
    try {
        console.log('Entered into the new offer adding page from the admin');
        const { offerName, discountRate, startDate, endDate, offerType, selectedValues } = req.body;

        console.log('req.body:', req.body);

        if (!offerName || !offerName.trim()) {
            return res.status(400).json({ success: false, message: "Please enter an offer name" });
        }

        if (discountRate === undefined || discountRate < 0 || discountRate > 100) {
            return res.status(400).json({ success: false, message: "Please enter a valid discount amount" });
        }

        if (!startDate) {
            return res.status(400).json({ success: false, message: "Please enter a start date" });
        }

        if (!endDate) {
            return res.status(400).json({ success: false, message: "Please enter an end date" });
        }

        if (!offerType || offerType === "choose") {
            return res.status(400).json({ success: false, message: "Please select a valid offer type" });
        }

        let offerData;
        if (offerType === "product") {
            offerData = new offerModel({
                offerName,
                discount: discountRate,
                startDate,
                endDate,
                offerType,
                productId: selectedValues
            })
            await offerData.save();

        } else if (offerType === "category") {
            offerData = new offerModel({
                offerName,
                discount: discountRate,
                startDate,
                endDate,
                offerType,
                categoryId: selectedValues
            });
            await offerData.save();
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error while adding an offer for the category or product', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};



// const addOffer = async (req, res) => {
//     try {
//         console.log('entered into offer deciding function');
//         const { offerName, discountRate, startDate, endDate, offerType, selectedValues } = req.body;
//         console.log('req.body:', req.body);
//         // Validate the request body
//         if (!offerName || !discountRate || !startDate || !endDate || !offerType || !selectedValues) {
//             return res.status(400).json({ message: 'All fields are required' });
//         }

//         // Additional validation checks can be added here (e.g., check if dates are valid)

//         // Create a new offer object
//         const newOffer = new offerModel({
//             offerName,
//             discount:discountRate,
//             startDate,
//             endDate,
//             offerType,
//             selectedValues
//         });

//         // Save the new offer to the database
//         await newOffer.save();

//         // Send a success response
//         return res.status(201).json({ message: 'Offer added successfully', offer: newOffer });
//     } catch (error) {
//         console.error(error);

//         // Check if headers have already been sent
//         if (!res.headersSent) {
//             return res.status(500).json({ message: 'Internal server error', error });
//         }
//     }
// };


// rendering the offer editing page


const editOfferPage = async (req, res) => {
    try {
        console.log('rendering the offer editing page from the admin side');
        const { id } = req.query;
        const offerData = await offerModel.findOne({ _id: id });
        console.log('offerData:', offerData);
        if (offerData.productId.length > 0) {
            const productData = await productModel.find({})
            res.render('admin/editoffer', { offerData, Details: productData, activePage: 'offer' })
        } else if (offerData.categoryId.length > 0) {
            const catagoryData = await catModel.find({});
            res.render('admin/editoffer', { offerData, Details: catagoryData, activePage: 'offer' })
        } else {
            res.status(400).render('admin/servererror');
        }
    } catch (error) {
        console.log('error occured while rendering the offer editing page', error);
        res.status(500).render('admin/servererror');
    }
}

// providing an existing offers associated with an particular product for other products
const offerProdIdSave = async (req, res) => {
    try {
        console.log('entering to the offerproductId saving function from offer controller');
        const { offerId, selectedProductIds } = req.body;
        console.log('req.body:', req.body);
        if (selectedProductIds.length) {
            await offerModel.updateOne({ _id: offerId }, { $set: { productId: selectedProductIds } });
        }
        res.json({ success: true });
    } catch (error) {
        console.log('error happened while saving the productId', error);
        res.status(500).json({ success: false });
    }
}

// providing an existing offers associated with an particular catagory for other categories
const offercatIdSave = async (req, res) => {
    try {
        console.log('entering to the offercategoryId saving function from offer controller');
        const { offerId, selectedCategoryIds } = req.body;
        console.log('req.body:', req.body);
        if (selectedCategoryIds.length) {
            await offerModel.updateOne({ _id: offerId }, { $Set: { categoryId: selectedCategoryIds } });
        }
        res.json({ success: true });
    } catch (error) {
        console.log('error happened while saving the productId', error);
        res.status(500).json({ success: false });
    }
}

// editing the existing offer given for an product or category
const editoffer = async (req, res) => {
    try {
        console.log('entering the edit production from the offer controller');
        const { offerName, discount, startDate, endDate, offerId } = req.body;
        console.log('offerName:', offerName);
        console.log('discount:', discount);
        console.log('startDate:', startDate);
        console.log('endDate:', endDate);
        console.log('offerId:', offerId);

        const nameExist = await offerModel.find({
            offerName: offerName.trim(),
            _id: { $ne: offerId }
        });

        console.log('nameExist:', nameExist);

        if (nameExist.length != 0) {
            return res.json({ success: false, message: 'This name already exists' });
        }
        if (!offerName || !offerName.trim() === '') {
            return res.json({ success: false, message: 'Please select a name' });
        }
        if (!discount || !discount < 0 || !discount > 100) {
            return res.json({ success: false, message: 'please enter a valid discount Amount' });
        }
        if (!startDate || !endDate) {
            return res.json({ success: false, message: 'start and End date is needed' });
        }
        await offerModel.updateOne({ _id: offerId }, { $set: { offerName: offerName, discount: discount, startDate: startDate, endDate: endDate } });
        res.json({ success: true })
    } catch (error) {
        console.log('error occured while updating the existing offer', error);
    }
}

// deleting an selected offer
const deleteOffer = async (req, res) => {
    try {
        console.log('entering into deleting the selected offer from the admin side');
        const { id } = req.body;
        console.log('req.body:', id);
        await offerModel.deleteOne({ _id: id });
        res.status(200).json({ success: true });
    } catch (error) {
        console.log('error happened while deleting the selected product', error);
        res.status(500).json({ success: false });
    }
}



module.exports = { offer, addOffer, offerType, editOfferPage, offerProdIdSave, offercatIdSave, editoffer, deleteOffer }