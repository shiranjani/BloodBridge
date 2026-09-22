// Frontend API base URL. In development, React proxy sends "/api" calls to the Express server.
const API_BASE = process.env.REACT_APP_API_BASE || "/api";

// Common fetch helper. It sends JSON requests and converts backend errors into readable messages.
export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;

    try {
      const data = JSON.parse(text);
      message = data.error || data.message || text;
    } catch {
      message = text || "Request failed";
    }

    throw new Error(message);
  }

  return response.json();
}
