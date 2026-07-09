export function readStoredJson(key, fallback = null) {
  const rawValue = localStorage.getItem(key);

  if (!rawValue || rawValue === 'undefined') {
    return fallback;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    localStorage.removeItem(key);
    return fallback;
  }
}
