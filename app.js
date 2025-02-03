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


// Set the port for the server, using the environment variable if available, otherwise default to 3000
const PORT = process.env.PORT || 3000;

// Connect to the database
dbConnect().catch((err) => {
  console.log("Database connection error:", err);
  process.exit(1);
});

// Create Express application instance
const app = express();

// Middleware setup
app.use(
  session({
    secret: "ababababba",
    resave: false,
    saveUninitialized: true,
  })
);

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

app.use(nocache());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use("/public", express.static(path.join(__dirname, "src", "public")));

// serve static files from the downloads folder in the home directory
app.use(express.static(path.join(os.homedir(), "Downloads")));

app.use("/uploads", express.static(path.join(__dirname, "src", "uploads")));

// setting up the multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, path.join(__dirname, "src", "uploads"));
  },
  filename: function (req, file, cb) {
    return cb(null, Date.now() + "-" + file.originalname + ".jpeg");
  },
});

const upload = multer({ storage: storage });

app.post("/uploads", upload.array("files"), (req, res) => {
  console.log("req.body:", req.body);
  console.log("req.files:", req.files);
});


// setting flash
app.use(flash());

//user session validating
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

// User routes & admin routes
app.use("/", userRouter);
app.use("/admin", adminRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
