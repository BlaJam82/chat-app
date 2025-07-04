import { renderRooms } from "./renderRooms.js";
import { socket } from "./socketSetup.js";
import { enrolledRooms, visibleCategories } from "./state.js";

window.showAllRooms = window.showAllRooms || false;

export function initRoomHeader(allGroupedRooms, lastMessages) {
  const categorySelect = document.getElementById("roomCategory");
  if (!categorySelect) return;

  // Prevent duplicate setup
  if (document.getElementById("joinedRoomsHeading")) return;

  const container = document.createElement("div");
  container.classList.add("room-header-container");

  const heading = document.createElement("h2");
  heading.id = "joinedRoomsHeading";
  heading.textContent = "Joined Rooms";

  const showAllToggle = document.createElement("button");
  showAllToggle.textContent = "Show All Rooms";
  showAllToggle.classList.add("show-all-btn");

  let showingAll = false;

  showAllToggle.addEventListener("click", () => {
    showingAll = !showingAll;
    window.showAllRooms = showingAll;

    socket.emit("getRooms", { showAll: showingAll });

    showAllToggle.textContent = showingAll
      ? "Show Joined Rooms"
      : "Show All Rooms";

    heading.textContent = showingAll ? "All Rooms" : "Joined Rooms";

    renderRooms(
      allGroupedRooms,
      lastMessages,
      showingAll ? null : enrolledRooms
    );
  });

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search rooms...";
  searchInput.classList.add("room-search");

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    renderRooms(
      allGroupedRooms,
      lastMessages,
      showingAll ? null : enrolledRooms,
      query
    );
  });

  // Add everything before category dropdown
  categorySelect.parentNode.insertBefore(container, categorySelect);
  container.appendChild(heading);
  container.appendChild(showAllToggle);
  container.appendChild(searchInput);
  container.appendChild(categorySelect);
}
