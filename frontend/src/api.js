const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ||
  `${window.location.protocol}//${window.location.hostname}:5000`;
const BASE_URL = `${API_ORIGIN}/api`;
const detailsCache = new Map();
async function handle(response) {
  if (!response.ok) {
    let message = "Something went wrong talking to the server.";
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {
      // ignore parse errors, keep default message
    }
    throw new Error(message);
  }
  return response.json();
}

export const api = {
  list(status) {
    const query =
      status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
    return fetch(`${BASE_URL}/items${query}`).then(handle);
  },

  create(item) {
    return fetch(`${BASE_URL}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    }).then(handle);
  },

  update(id, changes) {
    return fetch(`${BASE_URL}/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    }).then(handle);
  },

  remove(id) {
    return fetch(`${BASE_URL}/items/${id}`, { method: "DELETE" }).then(handle);
  },

  searchTitles(query) {
    return fetch(
      `${BASE_URL}/search-titles?q=${encodeURIComponent(query)}`,
    ).then(handle);
  },

  getTitleDetails(tmdbId, mediaType) {
    const key = `${tmdbId}:${mediaType || "movie"}`;
    if (detailsCache.has(key)) {
      return Promise.resolve(detailsCache.get(key));
    }
    return fetch(
      `${BASE_URL}/title-details/${tmdbId}?media_type=${encodeURIComponent(mediaType || "movie")}`,
    )
      .then(handle)
      .then((data) => {
        detailsCache.set(key, data);
        return data;
      });
  },

  discover(section, genres = "", window = "", page = 1) {
    const params = new URLSearchParams({ section, page: String(page) });
    if (genres) params.set("genres", genres);
    if (window) params.set("window", window);
    return fetch(`${BASE_URL}/discover?${params}`).then(handle);
  },

  getProfile() {
    return fetch(`${BASE_URL}/profile`).then(handle);
  },

  getProfileTalent() {
    return fetch(`${BASE_URL}/profile/talent`).then(handle);
  },

  updateProfile(changes) {
    return fetch(`${BASE_URL}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    }).then(handle);
  },

  getTvSeasons(tmdbId) {
    return fetch(`${BASE_URL}/tv/${tmdbId}/seasons`).then(handle);
  },

  getSeasonEpisodes(tmdbId, seasonNumber) {
    return fetch(`${BASE_URL}/tv/${tmdbId}/season/${seasonNumber}`).then(
      handle,
    );
  },

  getEpisodeLogs(itemId) {
    return fetch(`${BASE_URL}/items/${itemId}/episodes`).then(handle);
  },

  getEpisodeReviews() {
    return fetch(`${BASE_URL}/episode-reviews`).then(handle);
  },

  logEpisode(itemId, seasonNumber, episodeNumber, data) {
    return fetch(
      `${BASE_URL}/items/${itemId}/episodes/${seasonNumber}/${episodeNumber}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    ).then(handle);
  },

  deleteEpisodeLog(itemId, seasonNumber, episodeNumber) {
    return fetch(
      `${BASE_URL}/items/${itemId}/episodes/${seasonNumber}/${episodeNumber}`,
      {
        method: "DELETE",
      },
    ).then(handle);
  },
};
