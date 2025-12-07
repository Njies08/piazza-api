//import express library
const express = require('express');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const postRoutes = require ('./routes/posts.routes');

const app = express();

//Parse the Json bodies
app.use(express.json());

// Connects to the MongoDB
connectDB();

//  Defines a simple route to test the API
app.get('/', (req, res) => {
    res.json({ message: 'Pizza API is running'});
});


app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

//exports the app module
module.exports = app;





