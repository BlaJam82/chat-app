import * as state from "./state.js";
import { renderRooms } from "./renderRooms.js";
import { capitalizeWords } from "./domUtils.js";

export const socket = io();

/**
 * Dynamically populate the category dropdown with current grouped room data.
 */
function updateCategoryDropdown(groupedRooms) {
  const categorySelect = document.getElementById("roomCategory");
  if (!categorySelect) return;

  categorySelect.innerHTML = '<option value="All">All Categories</option>';

  Object.entries(groupedRooms).forEach(([category, rooms]) => {
    if (rooms.length > 0) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = capitalizeWords(category);
      categorySelect.appendChild(option);
    }
  });
}

// Initial room fetch (start with joined rooms)
socket.emit("getRooms", { showAll: false });

/**
 * Handles incoming room data and updates UI + state.
 */
socket.on("activeRooms", (data) => {
  console.log("🔥 Raw activeRooms payload:", data);

  const {
    groupedRooms,
    visibleCategories: visCats,
    lastMessages: lastMsgs,
    showAll = false,
  } = data;

  updateCategoryDropdown(groupedRooms);

  state.updateState({
    groupedRooms,
    lastMessages: lastMsgs,
    visibleCategories: visCats,
    showAll,
  });

  renderRooms(
    state.allGroupedRooms,
    state.lastMessages,
    showAll ? null : state.enrolledRooms
  );
});

/**
 * Handle incoming admin messages
 */
socket.on("message", (data) => {
  const adminMessage = document.getElementById("adminMessage");
  if (data.sender === "Admin" && adminMessage) {
    adminMessage.textContent = data.text;
  }
});
