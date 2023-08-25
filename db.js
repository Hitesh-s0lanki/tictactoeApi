require('dotenv').config()

const mongoose = require('mongoose')

const connectDB = () =>{
    const url = process.env.Mongo_Url

    mongoose.connect(url)
    .then(()=>{
        console.log("Connected to database safely")
    }).catch((err) => console.log(err))
}

module.exports = connectDB