// handlers/deleteMessageHandler.js
const Message = require("../../models/Message");

function setupDeleteMessage(io, socket) {
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
}

module.exports = { setupDeleteMessage };
