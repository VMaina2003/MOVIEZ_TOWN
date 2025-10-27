/**
 * js/state.js
 *
 * Global app state management for Moviez Town
 * --------------------------------------------------------
 * Responsible for storing and updating the in-memory state:
 *  - Current endpoints (trending, popular, etc.)
 *  - Pagination trackers
 *  - Search query & filters
 *  - Loading / view state
 * --------------------------------------------------------
 */

export const state = {
  // Which content is currently being viewed
  currentPage: "index", // or 'series', 'tvshows'
  
  // Endpoints currently being used for data fetches
  currentEndpoints: {
    trending: "",
    popular: "",
    hero: "",
  },

  // Tracks which page (page=1, page=2...) is loaded for endless scroll
  pageTrackers: {
    trending: {
      movie: 1,
      tv: 1,
      airingToday: 1,
    },
    popular: {
      movie: 1,
      tv: 1,
      onTheAir: 1,
    },
    search: 1,
  },

  // Flags to control fetching and scroll behavior
  isLoading: false,
  hasMore: true,

  // Search & filter
  searchQuery: "",
  activeFilter: "all", // 'movie' | 'tv' | 'all'

  // Currently selected media item
  selectedMedia: {
    id: null,
    type: null,
  },
};

/* ======================================================
   STATE MUTATION HELPERS
   ====================================================== */

/**
 * Reset all pagination counters (used when changing pages or filters)
 */
export function resetPageTrackers() {
  Object.keys(state.pageTrackers).forEach((key) => {
    const group = state.pageTrackers[key];
    if (typeof group === "object") {
      Object.keys(group).forEach((subKey) => {
        group[subKey] = 1;
      });
    } else {
      state.pageTrackers[key] = 1;
    }
  });
}

/**
 * Get the current page number for a specific endpoint
 */
export function getCurrentPage(endpoint) {
  if (endpoint.includes("/trending/movie/week")) return state.pageTrackers.trending.movie;
  if (endpoint.includes("/movie/popular")) return state.pageTrackers.popular.movie;
  if (endpoint.includes("/trending/tv/week")) return state.pageTrackers.trending.tv;
  if (endpoint.includes("/tv/popular")) return state.pageTrackers.popular.tv;
  if (endpoint.includes("/tv/airing_today")) return state.pageTrackers.trending.airingToday;
  if (endpoint.includes("/tv/on_the_air")) return state.pageTrackers.popular.onTheAir;
  if (endpoint.includes("/search/multi")) return state.pageTrackers.search;
  return 1;
}

/**
 * Increment pagination for a specific endpoint safely
 */
export function incrementPage(endpoint) {
  if (endpoint.includes("/trending/movie/week")) state.pageTrackers.trending.movie++;
  else if (endpoint.includes("/movie/popular")) state.pageTrackers.popular.movie++;
  else if (endpoint.includes("/trending/tv/week")) state.pageTrackers.trending.tv++;
  else if (endpoint.includes("/tv/popular")) state.pageTrackers.popular.tv++;
  else if (endpoint.includes("/tv/airing_today")) state.pageTrackers.trending.airingToday++;
  else if (endpoint.includes("/tv/on_the_air")) state.pageTrackers.popular.onTheAir++;
  else if (endpoint.includes("/search/multi")) state.pageTrackers.search++;
}

/**
 * Change the active filter (used in filter dropdown or buttons)
 */
export function setActiveFilter(type = "all") {
  state.activeFilter = type;
}

/**
 * Update search query and reset search page
 */
export function setSearchQuery(query = "") {
  state.searchQuery = query.trim();
  state.pageTrackers.search = 1;
}

/**
 * Mark loading state (used to prevent duplicate infinite scroll fetches)
 */
export function setLoading(isLoading = true) {
  state.isLoading = isLoading;
}

/**
 * Set current page (index, series, tvshows)
 */
export function setCurrentPage(pageName) {
  state.currentPage = pageName;
}

/**
 * Set currently selected media for detail view
 */
export function setSelectedMedia(id, type) {
  state.selectedMedia.id = id;
  state.selectedMedia.type = type;
}

/**
 * Update endpoints based on the current page
 */
export function setPageEndpoints(pageName) {
  setCurrentPage(pageName);

  if (pageName === "index") {
    state.currentEndpoints.trending = "/trending/movie/week";
    state.currentEndpoints.popular = "/movie/popular";
    state.currentEndpoints.hero = "/movie/now_playing";
  } else if (pageName === "series") {
    state.currentEndpoints.trending = "/trending/tv/week";
    state.currentEndpoints.popular = "/tv/popular";
    state.currentEndpoints.hero = "/tv/top_rated";
  } else if (pageName === "tvshows") {
    state.currentEndpoints.trending = "/tv/airing_today";
    state.currentEndpoints.popular = "/tv/on_the_air";
    state.currentEndpoints.hero = "/tv/popular";
  }
}

/* ======================================================
   STATE DEBUGGING UTILITIES
   ====================================================== */

/**
 * Debug helper to log current state snapshot
 */
export function logState(label = "STATE SNAPSHOT") {
  console.groupCollapsed(` ${label}`);
  console.table(state);
  console.groupEnd();
}
