const Room = require("../../models/Room");
const User = require("../../models/User");
const Message = require("../../models/Message");

function setupJoinRoom(io, socket) {
  socket.on(
    "joinRoom",
    async ({ room, sender, category = "General", create = false }) => {
      const rawRoom = room.trim().toLowerCase();
      const rawCategory = category.trim().toLowerCase();

      try {
        const existingRoom = await Room.findOne({ name: rawRoom });

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

        socket.join(rawRoom);
        socket.userName = sender;

        if (!existingRoom) {
          await new Room({ name: rawRoom, category: rawCategory }).save();
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
}

module.exports = { setupJoinRoom };
