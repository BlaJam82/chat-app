import { renderRooms } from "./renderRooms.js";
import { allGroupedRooms, lastMessages, enrolledRooms } from "./state.js";
import { socket } from "./socketSetup.js"; // Needed for socket.emit below

export function setupCategoryUI() {
  const categorySelect = document.getElementById("roomCategory");
  if (!categorySelect) return;

  let showingAll = false;

  categorySelect.addEventListener("change", () => {
    const selected = categorySelect.value;
    const filtered =
      selected === "All"
        ? allGroupedRooms
        : { [selected]: allGroupedRooms[selected] };

    renderRooms(filtered, lastMessages, showingAll ? null : enrolledRooms);

    setTimeout(() => {
      document.querySelectorAll(".room-sublist").forEach((ul) => {
        ul.classList.toggle("expanded", selected !== "All");
      });
    }, 0);
  });

  // Show rooms button & back button UI setup
  const roomList = document.getElementById("roomList");
  const roomForm = document.getElementById("roomForm");
  const backToRoomsIndex = document.querySelector(".back-to-rooms-index");
  const showRoomsBtn = document.getElementById("showRooms");
  const roomHeaderContainer = document.querySelector(".room-header-container");

  function showRoomList() {
    roomList.style.display = "flex";
    roomList.style.height = "100vh";
    roomForm.style.display = "none";
    backToRoomsIndex.style.display = "block";
    showRoomsBtn.style.display = "none";
    roomHeaderContainer?.classList.add("active");
  }

  showRoomsBtn?.addEventListener("click", () => {
    renderRooms(allGroupedRooms, lastMessages, enrolledRooms); // ✅ FIXED
    showRoomList();
    history.pushState({ showRooms: true }, "", "#rooms");
  });

  window.addEventListener("popstate", (event) => {
    if (event.state?.showRooms) {
      showRoomList();
    } else {
      roomList.style.display = "none";
      roomForm.style.display = "block";
      backToRoomsIndex.style.display = "none";
      showRoomsBtn.style.display = "block";

      if (roomHeaderContainer?.classList.contains("active")) {
        roomHeaderContainer.classList.remove("active");
      }
    }
  });

  // Flash message timeout
  document.addEventListener("DOMContentLoaded", () => {
    const flashMessage = document.getElementById("flash-message");
    if (flashMessage) {
      setTimeout(() => {
        flashMessage.style.display = "none";
      }, 3500);
    }

    if (location.hash === "#rooms") {
      renderRooms(allGroupedRooms, lastMessages, enrolledRooms); // ✅ FIXED
      showRoomList();
    }

    if (!document.getElementById("joinedRoomsHeading")) {
      const container = document.createElement("div");
      container.classList.add("room-header-container");

      const heading = document.createElement("h2");
      heading.id = "joinedRoomsHeading";
      heading.textContent = "Joined Rooms";

      const showAllToggle = document.createElement("button");
      showAllToggle.textContent = "Show All Rooms";
      showAllToggle.classList.add("show-all-btn");

      showAllToggle.addEventListener("click", () => {
        showingAll = !showingAll;

        // Only update UI labels here
        showAllToggle.textContent = showingAll
          ? "Show Joined Rooms"
          : "Show All Rooms";

        heading.textContent = showingAll ? "All Rooms" : "Joined Rooms";

        // Ask server for updated data
        socket.emit("getRooms", { showAll: showingAll });
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

      categorySelect.parentNode.insertBefore(container, categorySelect);
      container.appendChild(heading);
      container.appendChild(showAllToggle);
      container.appendChild(searchInput);
      container.appendChild(categorySelect);
    }
  });
}
