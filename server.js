// Updated server.js with session sharing, persistent rooms, and message history
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const sharedsession = require("express-socket.io-session");
const MongoStore = require("connect-mongo");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");

const User = require("./models/User");
const Room = require("./models/Room");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;

const mongoURI = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.otyt6.mongodb.net/${process.env.MONGODB_DATABASE_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set("view engine", "ejs");

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "keyboard cat",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: mongoURI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 },
});

// 1. Use session middleware with Express
app.use(sessionMiddleware);

// 2. Use the same session middleware in Socket.IO with a wrapper
io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});

// ----------- Routes -----------

// Login page
app.get("/", (req, res) => {
  res.render("login", { error: null });
});

// Login POST
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.render("login", { error: "Invalid email or password." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.render("login", { error: "Invalid email or password." });

    // --- Convert old object data to Maps if necessary ---
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

    if (dirty) await user.save(); // Save only if we updated the format

    // --- Set session ---
    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      email: user.email,
    };

    res.redirect("/index");
  } catch (error) {
    console.error("Login error:", error);
    res.render("login", { error: "Internal server error. Please try again." });
  }
});

// Signup page
app.get("/signup", (req, res) => {
  res.render("signup", { error: null });
});

// Signup POST
app.post("/signup", async (req, res) => {
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
      id: newUser._id,
      firstName: newUser.firstName,
      email: newUser.email,
    };

    res.redirect("/index");
  } catch (error) {
    console.error("Signup error:", error);
    res.render("signup", { error: "Internal server error. Please try again." });
  }
});

// Index page
app.get("/index", async (req, res) => {
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
});

// Toggle room enrollment
app.post("/user/room/toggle", async (req, res) => {
  const { roomName } = req.body;
  console.log(roomName);
  const userId = req.session.user?.id;

  try {
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });

    // 🔁 Convert plain object to Map if needed
    if (!(user.enrolledRooms instanceof Map)) {
      user.enrolledRooms = new Map(Object.entries(user.enrolledRooms || {}));
    }

    // ✅ Toggle enrollment
    const current = user.enrolledRooms.get(roomName) || false;
    user.enrolledRooms.set(roomName, !current);

    // 🧪 Log for debugging
    console.log("Saving enrolledRooms:", [...user.enrolledRooms.entries()]);

    await user.save();

    res.json({ success: true, enrolled: !current });
  } catch (err) {
    console.error("Toggle room error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Toggle category visibility
app.post("/user/category/toggle", async (req, res) => {
  const { categoryName } = req.body;
  const userId = req.session.user?.id; // Use `.id` from session

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // 🛠 Ensure visibleCategories is a Map
    if (!user.visibleCategories || !(user.visibleCategories instanceof Map)) {
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
});

// Chat room
app.get("/chat/:room", async (req, res) => {
  const roomName = req.params.room.toLowerCase();
  const user = req.session.user;
  if (!user) return res.redirect("/");

  const room = await Room.findOne({ name: roomName });
  if (!room) return res.redirect("/index");

  res.render("chat", {
    room: roomName,
    category: room.category,
    user,
  });
});

// Log out user and redirect
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    res.redirect("/"); // Redirect to login or home page
  });
});

// Socket.IO logic
io.on("connection", (socket) => {
  console.log(`🟢 User connected: ${socket.id.slice(0, 5)}`);
  console.log("🧠 Session user:", socket.request?.session?.user);

  socket.on(
    "joinRoom",
    async ({ room, sender, category = "General", create = false }) => {
      const rawRoom = room.trim().toLowerCase();
      const rawCategory = category.trim().toLowerCase();

      try {
        const existingRoom = await Room.findOne({ name: rawRoom });

        // ✅ If this is a creation attempt and the room already exists, abort and inform client
        if (create && existingRoom) {
          return socket.emit("roomExists", {
            room: rawRoom,
            message: "Room already exists. Please choose a different name.",
          });
        }

        if (!create && !existingRoom) {
          return socket.emit("roomDoesNotExist", {
            room: rawRoom,
            message: "That room does not exist.",
          });
        }

        // Join the room regardless of who created it
        socket.join(rawRoom);
        socket.userName = sender;

        // ✅ If it doesn't exist yet, create it now
        if (!existingRoom) {
          const newRoom = new Room({
            name: rawRoom,
            category: rawCategory,
          });
          await newRoom.save();
        }

        const userId = socket.request?.session?.user?.id;
        if (!userId) return;

        const user = await User.findById(userId);
        if (!user) return;

        user.enrolledRooms.set(rawRoom, true);
        user.visibleCategories.set(rawCategory, true);
        await user.save();

        const history = await Message.find({ room: rawRoom })
          .sort({ timestamp: 1 })
          .limit(25);

        history.forEach((msg) => {
          socket.emit("chatMessage", {
            _id: msg._id,
            sender: msg.sender,
            text: msg.text + (msg.edited ? " (edited)" : ""),
            createdAt: msg.createdAt,
          });
        });

        socket.to(rawRoom).emit("message", {
          sender: "Admin",
          text: `${sender} has joined the chat`,
        });

        socket.emit("message", {
          sender: "Admin",
          text: `Welcome to the chat, ${sender}!`,
        });
      } catch (err) {
        console.error("Room join error:", err);
      }
    }
  );

  socket.on("chatMessage", async ({ room, sender, text }) => {
    try {
      const message = new Message({ room, sender, senderId: socket.id, text });
      await message.save();

      io.to(room).emit("chatMessage", {
        _id: message._id,
        sender: message.sender,
        text: message.text,
        createdAt: message.createdAt,
      });
    } catch (err) {
      console.error("Message save error:", err);
    }
  });

  socket.on("editMessage", async ({ messageId, newText }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      message.text = newText;
      message.edited = true;
      await message.save();

      io.to(message.room).emit("messageEdited", { messageId, newText });
    } catch (err) {
      console.error("Edit error:", err);
    }
  });

  socket.on("deleteMessage", async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      await message.deleteOne();

      io.to(message.room).emit("messageDeleted", { messageId });
    } catch (err) {
      console.error("Delete error:", err);
    }
  });

  socket.on("getRooms", async ({ showAll = false } = {}) => {
    try {
      const userId = socket.request?.session?.user?.id;
      if (!userId) {
        return socket.emit("activeRooms", {
          groupedRooms: {},
          visibleCategories: {},
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return socket.emit("activeRooms", {
          groupedRooms: {},
          visibleCategories: {},
        });
      }

      const enrolledRoomNames = [...user.enrolledRooms.entries()]
        .filter(([_, isEnrolled]) => isEnrolled)
        .map(([roomName]) => roomName);

      // 🟡 Use all rooms if showAll is true
      const rooms = showAll
        ? await Room.find() // 🧠 all rooms from MongoDB
        : await Room.find({ name: { $in: enrolledRoomNames } });

      const groupedRooms = {};
      const lastMessages = {};

      for (const room of rooms) {
        if (!groupedRooms[room.category]) groupedRooms[room.category] = [];
        groupedRooms[room.category].push(room.name);

        const lastMsg = await Message.findOne({ room: room.name })
          .sort({ createdAt: -1 })
          .limit(1)
          .lean();

        if (lastMsg) {
          lastMessages[room.name] = {
            text: lastMsg.text,
            sender: lastMsg.sender,
            createdAt: lastMsg.createdAt,
            edited: lastMsg.edited || false,
          };
        }
      }

      const visibleCategories = Object.fromEntries(
        user.visibleCategories || []
      );

      socket.emit("activeRooms", {
        groupedRooms,
        visibleCategories,
        lastMessages,
      });

      console.log(
        showAll ? "🔍 All rooms sent to client" : "👤 Enrolled rooms sent:",
        groupedRooms
      );
    } catch (err) {
      console.error("Error fetching rooms:", err);
      socket.emit("activeRooms", { groupedRooms: {}, visibleCategories: {} });
    }
  });

  socket.on("disconnecting", () => {
    const name = socket.userName || "A user";
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        socket.to(room).emit("message", {
          sender: "Admin",
          text: `${name} has left the chat`,
        });
      }
    });
  });
});

server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
