const express = require('express');

const router = express.Router();

const BLL = require('../models/userBLL');







router.get("/:email", async (req, res) => {
    const email = req.params.email
    const user = await BLL.getUsersEmail(email)

    return res.json(user)
})
router.get("/getById/:id", async (req, res) => {
    const email = req.params.id
    const user = await BLL.getUsersId(email)

    return res.json(user)
})


router.get("/pass/:password", async (req, res) => {


    const user = await BLL.getUserspass(req.params.password)

    return res.json(user)
})



router.get("/" , async (req, res) => {
    console.log('GET ALL');
    const users = await BLL.getAllUsers();
    return res.json(users);
}); 



router.delete("/delete/:id", async (req,res) => {
    try {
        const id = req.params.id
        const status = await BLL.deleteUser(id)
        return res.json({msg: status})
    }catch(e) {
        return res.status(500).json({success: false, msg: e.message })
    }
   

})



router.post("/", async (req,res) => {
    try {
        const user = req.body
        const status = await BLL.createUser(user)
        return res.json({msg: status})
    }catch(e) {
        return res.status(500).json({success: false, msg: e.message })
    }
   
})


router.put("/:email", async (req,res) => {
    try {
        
        const email = req.params.email
        const user = req.body
        const status = await BLL.updateUser(id, user)
        return res.json({msg: status})
    }catch(e) {
        return res.status(500).json({success: false, msg: e.message })
    }
   

})
module.exports = router;