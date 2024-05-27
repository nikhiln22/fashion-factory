const express = require('express');
const dbConnect = require('./config/dbConnect');
const app = express();
const dotenv = require('dotenv').config()
const path = require('path');
const PORT = process.env.PORT || 5000;
dbConnect();

app.set()

app.use('/public',express.static(path.join(__dirname,'public')))

app.use('/', (req, res) => {
  res.send('hello from server side');
});

app.listen(PORT, () => {
  console.log(`Server is running at port http://localhost:${PORT}`);
});