/**
 * Shared DOM and math helpers.
 */

/**
 * Return an element by id or fail loudly when required markup is missing.
 *
 * @param {Document} root Document to query.
 * @param {string} id Element id without the leading `#`.
 * @returns {HTMLElement} Matching element.
 * @throws {Error} When the element is not present.
 */
export function requireElement(root, id) {
  const element = root.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }
  return element;
}

/**
 * Calculate scroll progress for a document.
 *
 * @param {number} scrollHeight Total document height in pixels.
 * @param {number} innerHeight Viewport height in pixels.
 * @param {number} scrollY Current vertical scroll offset in pixels.
 * @returns {number} Ratio of scroll progress. Returns `0` when the page is not scrollable.
 */
export function progressRatio(scrollHeight, innerHeight, scrollY) {
  const max = scrollHeight - innerHeight;
  return max > 0 ? scrollY / max : 0;
}
