export function visibleTourTarget(selector) {
  return Array.from(document.querySelectorAll(selector)).find(element => element.getClientRects().length > 0);
}
