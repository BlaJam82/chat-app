const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.post("/room/toggle", userController.toggleRoom);
router.post("/category/toggle", userController.toggleCategory);

module.exports = router;
