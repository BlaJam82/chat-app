// public/js/roomHandlers.js
import { socket } from "./socketSetup.js";
import { capitalizeWords } from "./domUtils.js";
import { handleRoomClick } from "./renderRooms.js";
import { confirmModal } from "./modalManager.js";

export function setupRoomForm() {
  const roomForm = document.getElementById("roomForm");
  if (!roomForm) return;

  roomForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const roomInput = roomForm.elements["room"];
    const room = roomInput.value.trim();
    const categorySelect = document.getElementById("roomCategory");
    const customCategoryInput = document.getElementById("customCategory");

    let category = categorySelect ? categorySelect.value : "General";
    if (customCategoryInput && customCategoryInput.value.trim()) {
      category = customCategoryInput.value.trim();
    }

    if (room) {
      socket.emit("joinRoom", {
        room,
        sender: window.firstName,
        category,
        create: true,
      });

      socket.once("roomExists", async (data) => {
        const userConfirmed = await confirmModal(
          `"${capitalizeWords(
            data.room
          )}" already exists. Would you like to join it instead?`
        );

        if (userConfirmed) {
          socket.emit("joinRoom", {
            room: data.room,
            sender: window.firstName,
            category,
            create: false,
          });
        }
      });

      socket.once("message", (data) => {
        if (data.sender === "Admin" && data.text.includes("Welcome")) {
          const encodedRoom = encodeURIComponent(room);
          window.location.href = `/chat/${encodedRoom}`;
        }
      });
    }
  });
}
