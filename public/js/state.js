// Shared state variables
export let allGroupedRooms = {};
export let lastMessages = {};
export let visibleCategories = {};
export let enrolledRooms = window.enrolledRooms || [];
export let showAllRooms = false;

/**
 * Safely updates shared state by replacing data instead of merging.
 * @param {Object} stateUpdate - Contains any subset of groupedRooms, lastMessages, visibleCategories, showAll.
 */
export function updateState({
  groupedRooms,
  lastMessages: lastMsgs,
  visibleCategories: visCats,
  showAll = false,
}) {
  if (groupedRooms) allGroupedRooms = groupedRooms;
  if (lastMsgs) lastMessages = lastMsgs;
  if (visCats) visibleCategories = visCats;
  showAllRooms = showAll;
}
