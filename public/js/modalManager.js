// modalManager.js
let currentEditMessageId = null;
let currentDeleteMessageId = null;

const modalOverlay = document.getElementById("modalOverlay");
const editModal = document.getElementById("editModal");
const deleteModal = document.getElementById("deleteModal");
const editInput = document.getElementById("editInput");

// Open edit modal and wire up confirm button
export function openEditModal(messageId, socket) {
  currentEditMessageId = messageId;

  const messageDiv = document.getElementById(messageId);
  const oldText =
    messageDiv
      ?.querySelector(".message-text")
      ?.textContent.replace(" (edited)", "")
      .split(": ")
      .slice(1)
      .join(": ") || "";

  editInput.value = oldText;
  modalOverlay.style.display = "block";
  editModal.style.display = "block";
  editInput.focus();

  const confirmBtn = document.getElementById("editConfirmBtn");
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const newText = editInput.value.trim();
      if (newText && currentEditMessageId) {
        socket.emit("editMessage", {
          messageId: currentEditMessageId,
          newText,
        });
      }
      closeModals();
    };
  }
}

// Open delete modal and wire up confirm button
export function openDeleteModal(messageId, socket) {
  currentDeleteMessageId = messageId;
  modalOverlay.style.display = "block";
  deleteModal.style.display = "block";

  const confirmBtn = document.getElementById("deleteConfirmBtn");
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      if (currentDeleteMessageId) {
        socket.emit("deleteMessage", {
          messageId: currentDeleteMessageId,
        });
      }
      closeModals();
    };
  }
}

// Hide both modals and clear state
export function closeModals() {
  modalOverlay.style.display = "none";
  editModal.style.display = "none";
  deleteModal.style.display = "none";
  currentEditMessageId = null;
  currentDeleteMessageId = null;
}

// Cancel button handlers (once)
document
  .getElementById("editCancelBtn")
  ?.addEventListener("click", closeModals);
document
  .getElementById("deleteCancelBtn")
  ?.addEventListener("click", closeModals);

export function confirmModal(message) {
  return new Promise((resolve) => {
    const modalOverlay = document.getElementById("modalOverlay");
    const confirmModal = document.getElementById("confirmModal");
    const confirmText = document.getElementById("confirmText");
    const confirmYes = document.getElementById("confirmYesBtn");
    const confirmNo = document.getElementById("confirmNoBtn");

    if (!modalOverlay || !confirmModal || !confirmText) return resolve(false);

    confirmText.textContent = message;

    // ✅ Show overlay AND modal box
    modalOverlay.style.display = "block";
    confirmModal.style.display = "block";

    const cleanup = () => {
      modalOverlay.style.display = "none";
      confirmModal.style.display = "none";
      confirmYes.onclick = null;
      confirmNo.onclick = null;
    };

    confirmYes.onclick = () => {
      cleanup();
      resolve(true);
    };

    confirmNo.onclick = () => {
      cleanup();
      resolve(false);
    };
  });
}
