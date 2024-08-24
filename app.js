const express = require('express');
const dbConnect = require('./config/dbConnect');
const session = require('express-session');
require('dotenv').config();
const path = require('path');
const os = require('os');
const nocache = require('nocache');
const userRouter = require('./routes/users');
const adminRouter = require('./routes/admin');
const flash = require('express-flash');
const multer = require('multer');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const { adAuth } = require('./middlewares/adminAuth');


const PORT = process.env.PORT || 5000;

// Connect to the database
dbConnect().catch(err => {
  console.error('Database connection error:', err);
  process.exit(1);
});

const app = express();

// Middleware setup
app.use(session({
  secret: 'ababababba',
  resave: false,
  saveUninitialized: true
}));

app.use(cookieParser());

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

app.use(nocache());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// serve static files from the downloads folder in the home directory
app.use(express.static(path.join(os.homedir(), 'Downloads')));

// setting up the multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    return cb(null, Date.now() + '-' + file.originalname + ".jpeg")
  }
})

const upload = multer({ storage: storage });

app.post('/uploads', upload.array('files'), (req, res) => {
  console.log(req.body);
  console.log(req.files);
})

app.use('/uploads', express.static('uploads'));

// setting flash
app.use(flash());

//user session validating
app.use((req, res, next) => {
  res.locals.session = req.session
  next()
})

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// User routes & admin routes
app.use('/', userRouter);
app.use('/admin', adminRouter);


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});