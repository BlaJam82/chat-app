// handlers/disconnectingHandler.js

function setupDisconnecting(io, socket) {
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
}

module.exports = { setupDisconnecting };
