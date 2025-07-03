const bcrypt = require("bcrypt");
const User = require("../models/User");

exports.getLogin = (req, res) => {
  res.render("login", { error: null });
};

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.render("login", { error: "Invalid email or password." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.render("login", { error: "Invalid email or password." });

    let dirty = false;

    if (!(user.enrolledRooms instanceof Map)) {
      user.enrolledRooms = new Map(Object.entries(user.enrolledRooms || {}));
      dirty = true;
    }

    if (!(user.visibleCategories instanceof Map)) {
      user.visibleCategories = new Map(
        Object.entries(user.visibleCategories || {})
      );
      dirty = true;
    }

    if (dirty) await user.save();

    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      email: user.email,
    };

    // ✅ Redirect only after session is saved
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.render("login", {
          error: "Session error. Please try again.",
        });
      }

      console.log("✅ Session saved:", req.session.user);
      return res.redirect("/index");
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.render("login", {
      error: "Internal server error. Please try again.",
    });
  }
};

exports.getSignup = (req, res) => {
  res.render("signup", { error: null });
};

exports.postSignup = async (req, res) => {
  const { firstName, email, password, repeatPassword } = req.body;

  if (!firstName || !email || !password || !repeatPassword) {
    return res.render("signup", { error: "All fields are required." });
  }

  if (password !== repeatPassword) {
    return res.render("signup", { error: "Passwords do not match." });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render("signup", { error: "Email is already registered." });
    }

    const newUser = new User({ firstName, email, password });
    await newUser.save();

    req.session.user = {
      id: newUser._id.toString(),
      firstName: newUser.firstName,
      email: newUser.email,
    };

    // ✅ Wait for session to save before redirecting
    req.session.save((err) => {
      if (err) {
        console.error("❌ Session save error:", err);
        return res.render("signup", {
          error: "Internal server error. Please try again.",
        });
      }

      console.log("✅ Signup session saved:", req.session.user);
      res.redirect("/index");
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.render("signup", { error: "Internal server error. Please try again." });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.redirect("/");
  });
};
