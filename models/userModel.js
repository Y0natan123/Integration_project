const mongoose = require('mongoose');
const { boolean } = require('webidl-conversions');


const UserSchema = mongoose.Schema({
   cellphone: {require:true, type: String},
    email: {require:true, type: String},
    password: {require:true, type: String},
    admin : {require:false, type: Boolean, default: false}
},{versionKey: false});


const model = mongoose.model("user",UserSchema);
module.exports = model; 