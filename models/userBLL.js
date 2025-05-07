const { error } = require('console');
const User = require('./userModel');

const getAllUsers = async () => {
    const users = await User.find({});
    return users;
}

const getUsersEmail = async (email1) => {
    const user = await User.findOne({email: email1 })
    return user;
}


const getUsersId = async (eid) => {
    const user = await User.findOne({id: eid })
    return user;
}
const deleteUser = async (id) => {
    await User.findByIdAndDelete(id)
    return "Delete"
}


const getUserspass = async (password1) => {
    const user = await User.findOne({password: password1});
    return user;
}

const createUser = async (user) => { 
    const newUser = new User(user); // {user: {name, age} }
    console.log(newUser);
    await newUser.save();  // {name, age, _id}
    return "Created";
}
const updateUser = async (email, user) => {
    await User.findByIdAndUpdate(email, user)
    return "Updated"
}

module.exports = {deleteUser,getUsersId,getAllUsers,getUsersEmail,createUser,getUserspass,updateUser}