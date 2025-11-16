const express = require("express");
const dbConnect = require("./src/config/dbConnect");
const session = require("express-session");
require("dotenv").config();
const path = require("path");
const os = require("os");
const nocache = require("nocache");
const userRouter = require("./src/routes/users");
const adminRouter = require("./src/routes/admin");
const flash = require("express-flash");
const multer = require("multer");
const passport = require("passport");

const PORT = process.env.PORT || 3000;

dbConnect().catch((err) => {
  console.log("Database connection error:", err);
  process.exit(1);
});

const app = express();

app.use(
  session({
    secret: "ababababba",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(nocache());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/public", express.static("public"));

app.use(express.static(path.join(os.homedir(), "Downloads")));

app.use("/uploads", express.static("uploads"));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname + ".jpeg");
  },
});

const upload = multer({ storage: storage });

app.post("/uploads", upload.array("files"), (req, res) => {
  console.log("req.body:", req.body);
  console.log("req.files:", req.files);
});


app.use(flash());

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

app.use("/", userRouter);
app.use("/admin", adminRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
