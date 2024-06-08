const express = require('express');
const dbConnect = require('./config/dbConnect');
const session = require('express-session');
const dotenv = require('dotenv').config();
const path = require('path');
const nocache = require('nocache');
const userRouter = require('./routes/users');
const adminRouter = require('./routes/admin');
const flash = require('express-flash');


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

app.use(nocache());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// setting flash
app.use(flash());

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// User routes & admin routes
app.use('/', userRouter);
app.use('/admin', adminRouter);

// Default route
app.get('/', (req, res) => {
  res.send('Hello from server side');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
