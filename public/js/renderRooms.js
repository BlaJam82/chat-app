import { capitalizeWords } from "./domUtils.js";
import {
  enrolledRooms,
  visibleCategories,
  allGroupedRooms,
  lastMessages,
} from "./state.js";
import { confirmModal } from "./modalManager.js";
import { socket } from "./socketSetup.js"; // Make sure this is above `handleRoomClick`

const roomList = document.getElementById("roomList");
const adminMessage = document.getElementById("adminMessage");

export function renderRooms(
  grouped = allGroupedRooms,
  lastMsgs = lastMessages,
  filterRooms = null,
  searchQuery = ""
) {
  if (!roomList) return;
  roomList.innerHTML = "";

  if (!grouped || Object.keys(grouped).length === 0) {
    adminMessage.textContent = "No active rooms yet. Create one!";
    return;
  }

  adminMessage.textContent = "Active Rooms:";

  const sortedCategories = Object.keys(grouped).sort();

  sortedCategories.forEach((category) => {
    const visibleRooms = getVisibleRooms(
      grouped[category],
      filterRooms,
      searchQuery
    );

    if (visibleRooms.length === 0) return; // ✅ SKIP category if no visible rooms

    // ✅ Only pass category + rooms, not an object with one category key
    const categoryContainer = buildCategoryContainer(
      category,
      visibleRooms,
      lastMsgs
    );

    roomList.appendChild(categoryContainer);
  });
}

function buildCategoryContainer(category, visibleRooms, lastMsgs) {
  const isVisible = visibleCategories?.[category] !== false;

  const container = document.createElement("div");
  container.classList.add("category-container");

  const header = buildCategoryHeader(category);
  container.appendChild(header);

  const roomListEl = document.createElement("ul");
  roomListEl.classList.add("room-sublist");
  if (!isVisible) roomListEl.style.display = "none";

  visibleRooms.sort().forEach((room) => {
    const li = buildRoomItem(room, lastMsgs);
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
      renderRooms(); // uses current state
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

function buildRoomItem(room, lastMsgs) {
  const li = document.createElement("li");
  li.classList.add("room-item");

  li.addEventListener("click", (e) => handleRoomClick(e, room));

  const link = document.createElement("a");
  link.href = "#";
  link.textContent = capitalizeWords(room);
  link.classList.add("room-link", "two-line-truncate");

  const isJoined = enrolledRooms.includes(room);
  if (!isJoined) link.classList.add("not-joined");

  const lastMessageSpan = document.createElement("span");
  const lastTimeSpan = document.createElement("span");
  lastMessageSpan.classList.add("last-message", "two-line-truncate");
  lastTimeSpan.classList.add("last-time");
  if (!isJoined) lastTimeSpan.classList.add("not-joined-margin");

  const msg = lastMsgs[room];
  if (msg && msg.text && msg.sender) {
    const preview =
      msg.text.length > 40 ? msg.text.slice(0, 40) + "…" : msg.text;
    lastMessageSpan.textContent = `${msg.sender}: ${preview}`;

    const d = new Date(msg.createdAt);
    lastTimeSpan.textContent = `${d.toLocaleDateString("en-US", {
      year: "2-digit",
      month: "numeric",
      day: "numeric",
    })} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else {
    lastMessageSpan.textContent = "Be the first to leave a message";
    lastTimeSpan.textContent = "";
  }

  li.appendChild(link);
  li.appendChild(lastMessageSpan);
  li.appendChild(lastTimeSpan);

  if (isJoined) {
    const leaveBtn = document.createElement("button");
    leaveBtn.textContent = "❌";
    leaveBtn.classList.add("leave-btn");

    leaveBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const confirmed = await confirmModal(
        "Are you sure you want to leave this room?"
      );
      if (!confirmed) return;

      await fetch("/user/room/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: room }),
      });

      socket.emit("getRooms");
    });

    li.appendChild(leaveBtn);
  }

  return li;
}

// Handler exported for other modules
export async function handleRoomClick(e, room) {
  e.preventDefault();
  const isEnrolled = enrolledRooms.includes(room.toLowerCase());

  if (isEnrolled) {
    window.location.href = `/chat/${encodeURIComponent(room)}`;
  } else {
    const confirmJoin = await confirmModal(
      "You’re not enrolled in this room. Would you like to join it?"
    );
    if (!confirmJoin) return;

    try {
      const res = await fetch("/user/room/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: room }),
      });

      const data = await res.json();
      if (data.success) {
        enrolledRooms.push(room);
        window.location.href = `/chat/${encodeURIComponent(room)}`;
      }
    } catch (err) {
      console.error("Failed to join room:", err);
    }
  }
}
