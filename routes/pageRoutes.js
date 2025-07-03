const express = require("express");
const router = express.Router();
const pageController = require("../controllers/pageController");

router.get("/index", pageController.getIndex);
router.get("/chat/:room", pageController.getChatRoom);

module.exports = router;
