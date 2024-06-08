const adminModel = require('../../model/userModel');
const catModel = require('../../model/catagoryModel');
const productModel = require('../../model/productModel');



// rendering catagory page

const catagory = async (req, res) => {
    try {
        console.log('entered the main catagory page.............');
        const updateSucess = req.flash('updateSuccess');
        const catSuccess = req.flash('catSuccess');
        const catagories = await catModel.find({});
        res.render('admin/catagory', { catagory: catagories, updateSucess, catSuccess });
    } catch (error) {
        console.log('Error while loading the catagory page..');
        res.render('admin/servererror');
    }
}

// rendering catagory adding page
const Add_category = async (req, res) => {
    try {
        console.log('entering the catagories page..........');
        const catError = req.flash('catError');
        res.render('admin/Addcategories', { catError });
        console.log('entering theeeeeeeeeeee catagories page..........');

    } catch (error) {
        console.log('error while loading category page, ', error);
        // res.render('admin/servererror');
    }
}


// adding category by admin

const addCatagoryPost = async (req, res) => {
    console.log('Entered categocccccccccccccry adding page------------->');

    try {
        console.log('Entered category adding page------------->');
        console.log(req.body);
        const catagoryName = req.body.name;
        const catDescription = req.body.description;

        // Check if the category already exists (case-insensitive)
        const catExisting = await catModel.findOne({ name: { $regex: new RegExp('^' + catagoryName + '$', 'i') } });
        console.log('Existing category:', catExisting);

        if (catExisting) {
            console.log('Category is already existing.');
            req.flash('catError', 'Category is already existing');
            return res.redirect('/admin/Addcategories');
        } else {
            console.log('Adding new category.');
            await catModel.create({ name: catName, description: catDescription });
            console.log('Category added successfully:', { name: catName, description: catDescription });
            req.flash('catSuccess', 'Category added successfully');
            return res.redirect('/admin/catagories');
        }
    } catch (err) {
        console.error('Error happened while adding a category:', err);
        res.render('admin/servererror');
    }
};

// unlisting the catagory added
const unlist = async (req, res) => {
    try {
        const id = req.params.id;
        const category = await catModel.findById(id);
        category.status = !category.status;
        await category.save();
        res.redirect('/admin/catagories')
    } catch (error) {
        console.log('error while unlisting the catagory');
        res.render('admin/serverror');
    }
}

// rendering the update category page
const updateCatagory = async (req, res) => {
    try {
        console.log('entered the catagory updating page...')
        const id = req.params.id;
        const catagory = await catModel.findById(id);
        const catError = req.flash('catError');
        res.render('admin/updatecatagory', { catagory, catError });
    } catch (error) {
        console.log('error while updating the catagory....');
        res.render('admin/servererror');
    }
}

// updating the alreay existing catagory
const updateCatagoryPost = async (req, res) => {
    try {
        console.log('entering the catagory updating post page.......');
        const id = req.params.id;
        const catagory = await catModel.findById(id);
        const catagoryName = req.body.name;
        const isModifiedCatagory = catagoryName !== catagory;

        if (isModifiedCatagory) {
            const catExisting = await catModel.findOne({ name: { $regex: new RegExp('^' + catagoryName + '$', 'i') } });
            if (catExisting) {
                console.log('category is already existing...');
                req.flash('catError', 'catagory already existing');
                return res.redirect('/admin/updatecatagory/' + id);
            }
        }
        catagory.description = req.body.description;
        catagory.name = catagoryName;
        await catagory.save();
        console.log(catagory);
        req.flash('updateSuccess', 'catagory updated successfully')
        res.redirect('/admin/catagories');
    } catch (error) {
        console.log('error happened while updating a existing catagory', error);
        res.render('admin/servererror');
    }
}


module.exports = { Add_category, addCatagoryPost, catagory, unlist, updateCatagory, updateCatagoryPost };