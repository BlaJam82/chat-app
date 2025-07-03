const User = require("../models/User");

exports.toggleRoom = async (req, res) => {
  const { roomName } = req.body;
  const userId = req.session.user?.id;
  try {
    const user = await User.findById(userId);
    if (!(user.enrolledRooms instanceof Map)) {
      user.enrolledRooms = new Map(Object.entries(user.enrolledRooms || {}));
    }
    const current = user.enrolledRooms.get(roomName) || false;
    user.enrolledRooms.set(roomName, !current);
    await user.save();
    res.json({ success: true, enrolled: !current });
  } catch (err) {
    console.error("Toggle room error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.toggleCategory = async (req, res) => {
  const { categoryName } = req.body;
  const userId = req.session.user?.id;
  try {
    const user = await User.findById(userId);
    if (!(user.visibleCategories instanceof Map)) {
      user.visibleCategories = new Map(
        Object.entries(user.visibleCategories || {})
      );
    }
    const current = user.visibleCategories.get(categoryName) || false;
    user.visibleCategories.set(categoryName, !current);
    await user.save();
    res.json({ success: true, visible: !current });
  } catch (err) {
    console.error("Toggle category error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
