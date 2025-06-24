const socket = io();

const roomForm = document.getElementById("roomForm");
const roomList = document.getElementById("roomList");
const adminMessage = document.getElementById("adminMessage");
const backToRoomsIndex = document.querySelector(".back-to-rooms-index");
const showRoomsBtn = document.getElementById("showRooms");

let allGroupedRooms = {};
let lastMessages = {};

let showAllRooms = false;

// Capitalize the first letter of each word
function capitalizeWords(str) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Emit initial request
socket.emit("getRooms", { showAll: showAllRooms });

socket.on("activeRooms", (data) => {
  console.log("🔥 Raw activeRooms payload:", data);
  const {
    groupedRooms,
    visibleCategories: visCats,
    lastMessages: lastMsgs,
  } = data;

  // Extra log for just last messages
  console.log("🕵️ Last Messages:", lastMsgs);

  allGroupedRooms = groupedRooms;
  lastMessages = lastMsgs; // ✅ assign globally

  Object.assign(visibleCategories, visCats);
  updateCategoryDropdown(allGroupedRooms);
  renderRooms(allGroupedRooms, lastMessages);
});

// Updates Category dropdown - if user deletes all rooms in a category the dropdown will have that category removed
function updateCategoryDropdown(groupedRooms) {
  const categorySelect = document.getElementById("roomCategory");
  if (!categorySelect) return;

  // Clear current options except "All"
  categorySelect.innerHTML = '<option value="All">All Categories</option>';

  // Add categories only with rooms
  Object.entries(groupedRooms).forEach(([category, rooms]) => {
    if (rooms.length > 0) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    }
  });
}

function renderRooms(
  grouped,
  lastMessages = {},
  filterRooms = null,
  searchQuery = ""
) {
  console.log("👀 Rendering grouped rooms:", grouped);
  roomList.innerHTML = "";

  if (!grouped || Object.keys(grouped).length === 0) {
    adminMessage.textContent = "No active rooms yet. Create one!";
    return;
  }

  adminMessage.textContent = "Active Rooms:";
  const sortedCategories = Object.keys(grouped).sort();

  sortedCategories.forEach((category) => {
    const categoryContainer = buildCategoryContainer(
      category,
      grouped,
      lastMessages,
      filterRooms,
      searchQuery
    );
    roomList.appendChild(categoryContainer);
  });
}

function buildCategoryContainer(
  category,
  grouped,
  lastMessages,
  filterRooms,
  searchQuery
) {
  const isVisible = visibleCategories?.[category] !== false;

  const container = document.createElement("div");
  container.classList.add("category-container");

  const header = buildCategoryHeader(category);
  container.appendChild(header);

  const roomListEl = document.createElement("ul");
  roomListEl.classList.add("room-sublist");
  if (!isVisible) roomListEl.style.display = "none";

  const visibleRooms = getVisibleRooms(
    grouped[category],
    filterRooms,
    searchQuery
  );

  visibleRooms.sort().forEach((room) => {
    const li = buildRoomItem(room, lastMessages);
    roomListEl.appendChild(li);
  });

  container.appendChild(roomListEl);
  return container;
}

function buildCategoryHeader(category) {
  const header = document.createElement("div");
  header.classList.add("category-header");

  const text = document.createElement("span");
  text.textContent = capitalizeWords(category);

  const icon = document.createElement("i");
  const isVisible = visibleCategories?.[category] !== false;
  icon.classList.add(
    "fas",
    "toggle-icon",
    isVisible ? "fa-chevron-down" : "fa-chevron-up"
  );

  icon.addEventListener("click", (e) => {
    e.preventDefault();
    toggleCategory(category);
  });

  header.appendChild(text);
  header.appendChild(icon);
  return header;
}

function toggleCategory(category) {
  fetch("/user/category/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoryName: category }),
  })
    .then((res) => res.json())
    .then((data) => {
      visibleCategories[category] = data.visible;
      renderRooms(allGroupedRooms, lastMessages);
    })
    .catch((err) => console.error("Error toggling category:", err));
}

function getVisibleRooms(rooms, filterRooms, searchQuery) {
  return rooms.filter((room) => {
    const joined = filterRooms ? filterRooms.includes(room) : true;
    const matchesSearch = room.toLowerCase().includes(searchQuery);
    return joined && matchesSearch;
  });
}

function buildRoomItem(room, lastMessages) {
  const li = document.createElement("li");
  li.classList.add("room-item");

  const link = document.createElement("a");
  link.href = "#";
  link.textContent = capitalizeWords(room);
  link.classList.add("room-link");
  if (!enrolledRooms.includes(room)) link.classList.add("not-joined");

  link.addEventListener("click", (e) => handleRoomClick(e, room));

  const lastMessageSpan = document.createElement("span");
  const lastTimeSpan = document.createElement("span");
  lastMessageSpan.classList.add("last-message");
  lastTimeSpan.classList.add("last-time");

  const msg = lastMessages[room];
  if (msg && msg.text && msg.sender) {
    const preview =
      msg.text.length > 40 ? msg.text.slice(0, 40) + "…" : msg.text;
    lastMessageSpan.textContent = `${msg.sender}: ${preview}`;

    const d = new Date(msg.createdAt);
    lastTimeSpan.textContent = `${d.toLocaleDateString()} ${d.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    )}`;
  } else {
    lastMessageSpan.textContent = "Be the first to leave a message";
    lastTimeSpan.textContent = "";
  }

  const leaveBtn = document.createElement("button");
  leaveBtn.textContent = "❌";
  leaveBtn.classList.add("leave-btn");

  leaveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to leave this room?")) return;

    fetch("/user/room/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName: room }),
    }).then(() => socket.emit("getRooms"));
  });

  li.appendChild(link);
  li.appendChild(lastMessageSpan);
  li.appendChild(lastTimeSpan);
  li.appendChild(leaveBtn);

  return li;
}

function handleRoomClick(e, room) {
  e.preventDefault();
  const isEnrolled = enrolledRooms.includes(room.toLowerCase());

  if (isEnrolled) {
    window.location.href = `/chat/${encodeURIComponent(room)}`;
  } else {
    const confirmJoin = confirm(
      "You’re not enrolled in this room. Would you like to join it?"
    );
    if (!confirmJoin) return;

    fetch("/user/room/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName: room }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          enrolledRooms.push(room); // Update local cache
          window.location.href = `/chat/${encodeURIComponent(room)}`;
        }
      })
      .catch((err) => console.error("Failed to join room:", err));
  }
}

if (roomForm) {
  setupRoomForm();
  setupCategoryDropdown();
  setupRoomToggleButton();
  setupFlashMessage();
  socket.on("message", handleAdminMessage);
}

function setupRoomForm() {
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

    if (!room) return;

    socket.emit("joinRoom", {
      room,
      sender: firstName,
      category,
      create: true,
    });

    socket.once("roomExists", (data) => {
      const confirmJoin = confirm(
        `"${capitalizeWords(data.room)}" already exists.\nJoin it instead?`
      );

      if (confirmJoin) {
        socket.emit("joinRoom", {
          room: data.room,
          sender: firstName,
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
  });
}

function setupCategoryDropdown() {
  const categorySelect = document.getElementById("roomCategory");
  let hasBlurred = false;
  if (!categorySelect) return;

  categorySelect.addEventListener("change", () => {
    const selected = categorySelect.value;
    const filtered =
      selected === "All"
        ? allGroupedRooms
        : { [selected]: allGroupedRooms[selected] };

    renderRooms(filtered, lastMessages);

    setTimeout(() => {
      document.querySelectorAll(".room-sublist").forEach((ul) => {
        ul.classList.toggle("expanded", selected !== "All");
      });
    }, 0);
  });

  categorySelect.addEventListener("click", () => {
    const selected = categorySelect.value;
    if (selected === "All" && !hasBlurred) {
      renderRooms(allGroupedRooms, lastMessages);
      categorySelect.blur();
      hasBlurred = true;
    }
  });
}

function setupRoomToggleButton() {
  showRoomsBtn.addEventListener("click", () => {
    renderRooms(allGroupedRooms, lastMessages);
    showRoomList();
  });

  document.addEventListener("DOMContentLoaded", () => {
    const categorySelect = document.getElementById("roomCategory");
    if (!categorySelect || document.getElementById("joinedRoomsHeading"))
      return;

    const container = document.createElement("div");
    container.classList.add("room-header-container");

    const heading = document.createElement("h2");
    heading.id = "joinedRoomsHeading";
    heading.textContent = "Joined Rooms";

    const showAllToggle = document.createElement("button");
    showAllToggle.classList.add("show-all-btn");
    showAllToggle.textContent = "Show All Rooms";

    let showingAll = false;
    showAllToggle.addEventListener("click", () => {
      showingAll = !showingAll;
      showAllRooms = showingAll;

      socket.emit("getRooms", { showAll: showAllRooms });

      heading.textContent = showingAll ? "All Rooms" : "Joined Rooms";
      showAllToggle.textContent = showingAll
        ? "Show Joined Rooms"
        : "Show All Rooms";

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

    container.appendChild(heading);
    container.appendChild(showAllToggle);
    container.appendChild(searchInput);
    container.appendChild(categorySelect);

    categorySelect.parentNode.insertBefore(container, categorySelect);
  });
}

function showRoomList() {
  roomList.style.display = "flex";
  roomList.style.height = "100vh";
  roomForm.style.display = "none";
  backToRoomsIndex.style.display = "block";
  showRoomsBtn.style.display = "none";
  document.querySelector(".room-header-container")?.classList.add("active");
}

function setupFlashMessage() {
  const flashMessage = document.getElementById("flash-message");
  if (flashMessage) {
    setTimeout(() => {
      flashMessage.style.display = "none";
    }, 3500);
  }
}

function handleAdminMessage(data) {
  if (data.sender === "Admin" && adminMessage) {
    adminMessage.textContent = data.text;
  }
}
