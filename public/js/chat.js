const socket = io();
import { openEditModal, openDeleteModal, closeModals } from "./modalManager.js";

// DOM Elements
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatBox = document.getElementById("chatBox");

// Room and user info
const roomName = typeof room !== "undefined" ? room : "";
let currentUserId = typeof sender !== "undefined" ? sender : "";

// --- Format timestamp nicely ---
function formatTime(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "Invalid Time";

  const year = String(d.getFullYear()).slice(-2);
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;

  return `${month}/${day}/${year} - ${hours}:${minutes} ${ampm}`;
}

// --- Socket.IO events ---

socket.on("connect", () => {
  if (!currentUserId) {
    currentUserId = socket.id.slice(0, 5);
  }
  socket.emit("joinRoom", {
    room: roomName,
    sender: currentUserId,
  });
});

socket.on("message", (data) => {
  const isMine = data.sender === currentUserId;
  const messageClass =
    data.sender === "Admin"
      ? "admin-message"
      : isMine
      ? "my-message"
      : "user-message";

  const msgText =
    data.sender === "Admin" ? data.text : `${data.sender}: ${data.text}`;

  const timestamp = data.createdAt ? new Date(data.createdAt) : new Date();
  addMessage(msgText, messageClass, "", false, timestamp);
});

socket.on("chatMessage", ({ sender, text, _id, createdAt }) => {
  const isMine = sender === currentUserId;
  const messageClass = isMine ? "my-message" : "user-message";

  addMessage(
    `${sender}: ${text}`,
    messageClass,
    _id,
    isMine,
    new Date(createdAt)
  );
});

socket.on("messageEdited", ({ messageId, newText }) => {
  const messageDiv = document.getElementById(messageId);
  if (messageDiv) {
    const content = messageDiv.querySelector(".message-text");
    if (content) {
      const parts = content.textContent.split(":");
      const sender = parts[0];
      content.textContent = `${sender.trim()}: ${newText} (edited)`;
    }
  }
});

socket.on("messageDeleted", ({ messageId }) => {
  const messageDiv = document.getElementById(messageId);
  if (messageDiv) messageDiv.remove();
});

// --- Form submit handler ---

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  socket.emit("chatMessage", {
    room: roomName,
    sender: currentUserId,
    text: message,
  });

  chatInput.value = "";
});

// --- Add message to chatbox ---

function addMessage(
  text,
  cssClass = "",
  id = "",
  canEdit = false,
  timestamp = new Date()
) {
  const div = document.createElement("div");
  div.className = `chat-message ${cssClass}`;
  if (id) div.id = id;

  const timeString = formatTime(timestamp);

  div.innerHTML = `
    <div class="message-content">
      <span class="message-text">${text}</span>
      <span class="timestamp">${timeString}</span>
    </div>
  `;

  if (canEdit && id) {
    div.addEventListener("click", (e) => {
      e.stopPropagation();
      showPopup(e.currentTarget, id);
    });
  }

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// --- Context menu for editing/deleting ---

function showPopup(messageElement, messageId) {
  removePopup();

  const rect = messageElement.getBoundingClientRect();
  const popup = document.createElement("div");
  popup.className = "message-popup";

  Object.assign(popup.style, {
    position: "absolute",
    top: `${rect.top + window.scrollY + 20}px`,
    left: `${rect.left + 10}px`,
    background: "#fff",
    border: "1px solid #ccc",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    padding: "6px",
    borderRadius: "6px",
    zIndex: "999",
    display: "block",
  });

  // Create Edit Button
  const editBtn = document.createElement("button");
  editBtn.textContent = "✏️ Edit";
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openEditModal(messageId, socket);
    removePopup();
  });

  // Create Delete Button
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "🗑️ Delete";
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openDeleteModal(messageId, socket);
    removePopup();
  });

  popup.appendChild(editBtn);
  popup.appendChild(deleteBtn);

  document.body.appendChild(popup);
}

function removePopup() {
  const existing = document.querySelector(".message-popup");
  if (existing) existing.remove();
}

export { showPopup, removePopup };

// --- Click outside to close popup ---

document.addEventListener("click", function (e) {
  if (
    !e.target.closest(".options-button") &&
    !e.target.closest(".message-popup") &&
    !e.target.closest(".modal") && // adjust if needed
    !e.target.closest("#modalOverlay")
  ) {
    removePopup();
    closeModals(); // <—— now will hide modals too
    return;
  }

  if (e.target.classList.contains("options-button")) {
    const messageId = e.target.dataset.messageId;
    showPopup(e.target, messageId);
  }
});
