// handlers/chatMessageHandler.js
const Message = require("../../models/Message");

function setupChatMessage(io, socket) {
  socket.on("chatMessage", async ({ room, sender, text }) => {
    try {
      const message = new Message({
        room,
        sender,
        senderId: socket.id,
        text,
      });
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
}

module.exports = { setupChatMessage };
