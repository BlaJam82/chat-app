// handlers/editMessageHandler.js
const Message = require("../../models/Message");

function setupEditMessage(io, socket) {
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
}

module.exports = { setupEditMessage };
