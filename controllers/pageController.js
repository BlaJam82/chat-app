const User = require("../models/User");
const Room = require("../models/Room");

exports.getIndex = async (req, res) => {
  const userSession = req.session.user;
  if (!userSession) return res.redirect("/");

  try {
    const user = await User.findById(userSession.id); // Always fresh user data
    if (!user) return res.redirect("/");

    // Ensure Maps are properly instantiated
    if (!(user.visibleCategories instanceof Map)) {
      user.visibleCategories = new Map(
        Object.entries(user.visibleCategories || {})
      );
    }
    if (!(user.enrolledRooms instanceof Map)) {
      user.enrolledRooms = new Map(Object.entries(user.enrolledRooms || {}));
    }

    const allCategories = await Room.distinct("category");

    const visibleCategories = allCategories.filter(
      (cat) =>
        !user.visibleCategories.has(cat) || user.visibleCategories.get(cat)
    );

    // Filter enrolled rooms for those with value true
    const enrolledRoomsTrue = [...user.enrolledRooms.entries()]
      .filter(([roomName, isEnrolled]) => isEnrolled)
      .map(([roomName]) => roomName);

    console.log("Visible Categories:", visibleCategories);
    console.log("Enrolled Rooms (true):", enrolledRoomsTrue);
    console.log(
      "User visibleCategories (object):",
      Object.fromEntries(user.visibleCategories || [])
    );

    function capitalizeWords(str) {
      return str
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    res.render("index", {
      user,
      categories: visibleCategories,
      allCategories,
      enrolledRooms: enrolledRoomsTrue,
      visibleCategories: Object.fromEntries(user.visibleCategories || []),
    });
  } catch (err) {
    console.error("Error loading index:", err);
    res.render("index", {
      user: userSession,
      categories: [],
      allCategories: [],
      enrolledRooms: [],
      visibleCategories: {},
    });
  }
};

exports.getChatRoom = async (req, res) => {
  const roomName = req.params.room.toLowerCase();
  const user = req.session.user;
  if (!user) return res.redirect("/");

  const Room = require("../models/Room");
  const room = await Room.findOne({ name: roomName });
  if (!room) return res.redirect("/index");

  res.render("chat", {
    room: roomName,
    category: room.category,
    user,
  });
};
