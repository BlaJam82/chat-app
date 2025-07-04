const Room = require("../../models/Room");
const Message = require("../../models/Message");
const User = require("../../models/User");

function setupGetRooms(io, socket) {
  console.log("🔍 Socket session user:", socket.request?.session?.user);

  socket.on("getRooms", async ({ showAll = false } = {}) => {
    try {
      const userId = socket.request?.session?.user?.id;
      if (!userId) {
        return socket.emit("activeRooms", {
          groupedRooms: {},
          visibleCategories: {},
          lastMessages: {},
          showAll,
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return socket.emit("activeRooms", {
          groupedRooms: {},
          visibleCategories: {},
          lastMessages: {},
          showAll,
        });
      }

      // Ensure Maps
      if (!(user.enrolledRooms instanceof Map)) {
        user.enrolledRooms = new Map(Object.entries(user.enrolledRooms || {}));
      }
      if (!(user.visibleCategories instanceof Map)) {
        user.visibleCategories = new Map(
          Object.entries(user.visibleCategories || {})
        );
      }

      const enrolledRoomNames = [...user.enrolledRooms.entries()]
        .filter(([_, isEnrolled]) => isEnrolled)
        .map(([roomName]) => roomName);

      const rooms = showAll
        ? await Room.find()
        : await Room.find({ name: { $in: enrolledRoomNames } });

      const groupedRooms = {};
      const lastMessages = {};

      for (const room of rooms) {
        if (!groupedRooms[room.category]) {
          groupedRooms[room.category] = [];
        }
        groupedRooms[room.category].push(room.name);

        const lastMsg = await Message.findOne({ room: room.name })
          .sort({ createdAt: -1 })
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
        showAll, // Important for client to track current state
      });

      console.log(
        showAll ? "📡 Sent ALL rooms" : "📡 Sent JOINED rooms",
        Object.keys(groupedRooms)
      );
    } catch (err) {
      console.error("❌ Error in getRooms:", err);
      socket.emit("activeRooms", {
        groupedRooms: {},
        visibleCategories: {},
        lastMessages: {},
        showAll,
      });
    }
  });
}

module.exports = { setupGetRooms };
