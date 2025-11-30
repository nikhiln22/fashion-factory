const catModel = require("../../model/catagoryModel");

// rendering the caregory listing from the admin side
const catagory = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const skip = (page - 1) * limit;

  const search = req.query.search ? req.query.search.trim() : "";

  const filter = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  try {
    const updateSucess = req.flash("updateSuccess");
    const catSuccess = req.flash("catSuccess");

    const catagories = await catModel
      .find(filter)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    const count = await catModel.countDocuments(filter);
    const totalpages = Math.ceil(count / limit);

    res.render("admin/catagory", {
      catagory: catagories,
      updateSucess,
      catSuccess,
      currentPage: page,
      totalPages: totalpages,
      hasNextPage: page < totalpages,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: totalpages,
      activePage: "category",
      search,
    });
  } catch (error) {
    console.log("Error while loading the catagory page..", error);
    res.render("admin/servererror");
  }
};

// rendering catagory adding page
const addCategory = async (req, res) => {
  try {
    console.log("entering the catagories page..........");
    const catError = req.flash("catError");
    res.render("admin/Addcategories", { catError });
    console.log("entering theeeeeeeeeeee catagories page..........");
  } catch (error) {
    console.log("error while loading category page, ", error);
    res.render("admin/servererror");
  }
};

// adding category by admin
const addCatagoryPost = async (req, res) => {
  try {
    console.log("Entered category adding page------------->");
    const catagoryName = req.body.name;
    const catDescription = req.body.description;
    const discount = req.body.discount;

    const catExisting = await catModel.findOne({
      name: { $regex: new RegExp("^" + catagoryName + "$", "i") },
    });
    console.log("Existing category:", catExisting);

    if (catExisting) {
      console.log("Category is already existing.");
      req.flash("catError", "Category is already existing");
      return res.redirect("/admin/Addcategories");
    } else {
      console.log("Adding new category.");
      await catModel.create({
        name: catagoryName,
        description: catDescription,
        discount: discount,
      });
      console.log("Category added successfully:", {
        name: catagoryName,
        description: catDescription,
        discount: discount,
      });
      req.flash("catSuccess", "Category added successfully");
      return res.redirect("/admin/catagories");
    }
  } catch (err) {
    console.error("Error happened while adding a category:", err);
    res.render("admin/servererror");
  }
};

// unlisting the catagory added
const unlist = async (req, res) => {
  try {
    console.log("entering the catagory listing/unlisting page");
    const id = req.params.id;
    const category = await catModel.findById(id);
    console.log("category Id:", id);
    category.status = !category.status;
    await category.save();
    res.redirect("/admin/catagories");
  } catch (error) {
    console.log("error while unlisting the catagory:", error);
    res.render("admin/serverror");
  }
};

// rendering the update category page
const updateCatagory = async (req, res) => {
  try {
    console.log("entered the catagory updating page...");
    const id = req.params.id;
    const catagory = await catModel.findById(id);
    const catError = req.flash("catError");
    res.render("admin/updatecatagory", { catagory, catError });
  } catch (error) {
    console.log("error while updating the catagory....");
    res.render("admin/servererror");
  }
};

// updating the alreay existing catagory
const updateCatagoryPost = async (req, res) => {
  try {
    console.log("entering the catagory updating post page.......");
    const id = req.params.id;
    const catagory = await catModel.findById(id);
    const catagoryName = req.body.name;
    const isModifiedCatagory = catagoryName !== catagory;

    if (isModifiedCatagory) {
      const catExisting = await catModel.findOne({
        name: { $regex: new RegExp("^" + catagoryName + "$", "i") },
      });
      if (catExisting) {
        console.log("category is already existing...");
        req.flash("catError", "catagory already existing");
        return res.redirect("/admin/updatecatagory/" + id);
      }
    }
    catagory.description = req.body.description;
    catagory.discount = req.body.discount;
    catagory.name = catagoryName;
    await catagory.save();
    const catagoryDiscount = catagory.discount;
    product.forEach(async (element) => {
      if (catagoryDiscount > element.discount) {
        element.discount = catagoryDiscount;
      }
      element.discountPrice =
        element.price - element.price * (element.discount / 100);
      await element.save();
    });
    console.log(catagoryDiscount);
    req.flash("updateSuccess", "catagory updated successfully");
    res.redirect("/admin/catagories");
  } catch (error) {
    console.log("error happened while updating a existing catagory", error);
    res.render("admin/servererror");
  }
};

module.exports = {
  addCategory,
  addCatagoryPost,
  catagory,
  unlist,
  updateCatagory,
  updateCatagoryPost,
};
