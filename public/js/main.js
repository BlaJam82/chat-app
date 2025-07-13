// public/js/main.js
import { setupRoomForm } from "./roomHandlers.js";
import { setupCategoryUI } from "./categoryUI.js";
import { renderRooms } from "./renderRooms.js";
import { allGroupedRooms, lastMessages } from "./state.js";
import { socket } from "./socketSetup.js";
import { initRoomHeader } from "./roomHeaderUI.js";

// Utility to show the room list view
export function showRoomList() {
  const roomList = document.getElementById("roomList");
  const roomForm = document.getElementById("roomForm");
  const backToRoomsIndex = document.querySelector(".back-to-rooms-index");
  const showRoomsBtn = document.getElementById("showRooms");

  roomList.style.display = "flex";
  roomList.style.height = "100vh";
  roomList.style.marginTop = "0";
  roomList.style.marginBottom = "0";

  roomForm.style.display = "none";
  backToRoomsIndex.style.display = "block";
  showRoomsBtn.style.display = "none";

  document.querySelector(".room-header-container")?.classList.add("active");

  // Optional: reset scroll position so no "jump"
  roomList.scrollTop = 0;
}

document.addEventListener("DOMContentLoaded", () => {
  setupRoomForm();
  setupCategoryUI();
  initRoomHeader(allGroupedRooms, lastMessages);
  renderRooms(allGroupedRooms, lastMessages);

  // ✅ Flash message fading out
  const flashMessage = document.getElementById("flash-message");
  if (flashMessage) {
    setTimeout(() => {
      flashMessage.style.display = "none";
    }, 3500);
  }

  // ✅ Show rooms view if URL contains #rooms
  if (window.location.hash === "#rooms") {
    renderRooms(allGroupedRooms, lastMessages);
    showRoomList();
  }

  // ✅ Socket: Update admin message text
  const adminMessage = document.getElementById("adminMessage");
  socket.on("message", (data) => {
    if (data.sender === "Admin" && adminMessage) {
      adminMessage.textContent = data.text;
    }
  });

  // ✅ Manual showRoomsBtn handler (optional)
  const showRoomsBtn = document.getElementById("showRooms");
  if (showRoomsBtn) {
    showRoomsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.hash = "#rooms"; // persist in URL
      showRoomList();
    });
  }
});

window.addEventListener("hashchange", () => {
  const roomHeader = document.querySelector(".room-header-container");

  if (window.location.hash === "#rooms") {
    showRoomList(); // reapply UI state
    roomHeader?.classList.add("active");
  } else {
    roomHeader?.classList.remove("active");
  }
});
