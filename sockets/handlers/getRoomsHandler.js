// handlers/getRoomsHandler.js
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
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return socket.emit("activeRooms", {
          groupedRooms: {},
          visibleCategories: {},
          lastMessages: {},
        });
      }

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
        if (!groupedRooms[room.category]) groupedRooms[room.category] = [];
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
      });

      console.log(
        showAll ? "🔍 All rooms sent to client" : "👤 Enrolled rooms sent:",
        groupedRooms
      );
    } catch (err) {
      console.error("❌ Error fetching rooms:", err);
      socket.emit("activeRooms", {
        groupedRooms: {},
        visibleCategories: {},
        lastMessages: {},
      });
    }
  });
}

module.exports = { setupGetRooms };
