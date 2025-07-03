// sockets/socketController.js
const { setupJoinRoom } = require("./handlers/joinRoomHandler");
const { setupChatMessage } = require("./handlers/chatMessageHandler");
const { setupEditMessage } = require("./handlers/editMessageHandler");
const { setupDeleteMessage } = require("./handlers/deleteMessageHandler");
const { setupGetRooms } = require("./handlers/getRoomsHandler");
const { setupDisconnecting } = require("./handlers/disconnectingHandler");

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log(
      "🔗 Socket connected:",
      socket.id,
      socket.request?.session?.user?.firstName
    );

    setupJoinRoom(io, socket);
    setupChatMessage(io, socket);
    setupEditMessage(io, socket);
    setupDeleteMessage(io, socket);
    setupGetRooms(io, socket);
    setupDisconnecting(io, socket);
  });
};
