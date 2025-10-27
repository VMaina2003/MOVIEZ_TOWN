/**
 * js/main.js
 *
 * Main controller for Moviez Town
 * -------------------------------------------------------
 * Connects API, State, and UI layers.
 * Handles:
 *   - Page initialization (detects current page)
 *   - Fetch + display (trending, popular, hero)
 *   - Infinite scroll (safe)
 *   - Search (debounced)
 *   - Filters
 * -------------------------------------------------------
 */

import {
  fetchMedia,
  searchMulti,
  fetchDetails,
  fetchVideos,
  fetchSeasonDetails,
  getImageUrl,
  ORIGINAL_IMAGE_BASE_URL,
  normalizeResults,
} from "./api.js";

import {
  state,
  resetPageTrackers,
  getCurrentPage,
  incrementPage,
  setLoading,
  setPageEndpoints,
  setSearchQuery,
  setActiveFilter,
  setSelectedMedia,
  logState,
} from "./state.js";

import {
  highlightActiveNav,
  displayMediaGrid,
  updateHeroSection,
  showMediaDetailsModal,
  clearSection,
  showLoadingSpinner,
  hideLoadingSpinner,
  showErrorMessage,
  showSearchResults,
} from "./ui.js";

/* ======================================================
   APP INITIALIZATION
   ====================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  highlightActiveNav();

  // Determine which page is open
  const path = window.location.pathname;
  let pageName = "index";
  if (path.includes("series.html")) pageName = "series";
  else if (path.includes("tvshows.html")) pageName = "tvshows";

  // Configure endpoints for current page
  setPageEndpoints(pageName);
  resetPageTrackers();
  logState("🔄 Initial State");

  // Load the initial content
  await loadInitialContent();

  // Attach UI event listeners
  setupScrollListener();
  setupSearchListener();
  setupFilterListener();
});

/* ======================================================
   INITIAL CONTENT LOAD
   ====================================================== */

async function loadInitialContent() {
  try {
    setLoading(true);
    showLoadingSpinner();

    const { trending, popular, hero } = state.currentEndpoints;

    // Fetch hero section content
    const heroData = await fetchMedia(hero);
    const heroItem = normalizeResults(heroData)[0];
    updateHeroSection(heroItem, ORIGINAL_IMAGE_BASE_URL);

    // Fetch trending and popular sections
    const trendingData = await fetchMedia(trending, getCurrentPage(trending));
    const popularData = await fetchMedia(popular, getCurrentPage(popular));

    displayMediaGrid(normalizeResults(trendingData), "trending-grid");
    displayMediaGrid(normalizeResults(popularData), "popular-grid");
  } catch (err) {
    console.error("Error loading initial content:", err);
    showErrorMessage("Failed to load content. Please refresh.");
  } finally {
    hideLoadingSpinner();
    setLoading(false);
  }
}

/* ======================================================
   INFINITE SCROLL (SAFE)
   ====================================================== */

function setupScrollListener() {
  window.addEventListener("scroll", async () => {
    if (state.isLoading || state.searchQuery) return; // Avoid overlap or search conflict

    const nearBottom =
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 600;

    if (nearBottom && state.hasMore) {
      setLoading(true);

      const { trending, popular } = state.currentEndpoints;
      incrementPage(trending);
      incrementPage(popular);

      const nextTrending = await fetchMedia(trending, getCurrentPage(trending));
      const nextPopular = await fetchMedia(popular, getCurrentPage(popular));

      displayMediaGrid(normalizeResults(nextTrending), "trending-grid", true);
      displayMediaGrid(normalizeResults(nextPopular), "popular-grid", true);

      setLoading(false);
    }
  });
}

/* ======================================================
   SEARCH FUNCTIONALITY (DEBOUNCED)
   ====================================================== */

let searchTimer;

function setupSearchListener() {
  const input = document.getElementById("search-input");
  if (!input) return;

  input.addEventListener("input", async (e) => {
    clearTimeout(searchTimer);
    const query = e.target.value.trim();

    setSearchQuery(query);
    if (query.length < 2) {
      // If cleared, reset sections
      clearSection("search-results");
      document.querySelectorAll("main section:not(#search-section)")
        .forEach((section) => section.classList.remove("hidden"));
      return;
    }

    searchTimer = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await searchMulti(query);
        const results = normalizeResults(data).filter((item) => {
          if (state.activeFilter === "all") return true;
          return item.media_type === state.activeFilter;
        });
        showSearchResults(results, query);
      } catch (err) {
        console.error("Search error:", err);
        showErrorMessage("Search failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 500); // Debounce delay
  });
}

/* ======================================================
   FILTERS (MOVIE / TV / ALL)
   ====================================================== */

function setupFilterListener() {
  const filterButtons = document.querySelectorAll("[data-filter]");
  if (!filterButtons) return;

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.filter;
      setActiveFilter(type);
      document
        .querySelectorAll("[data-filter]")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // If currently searching, reapply filter immediately
      if (state.searchQuery) {
        const evt = new Event("input");
        document.getElementById("search-input").dispatchEvent(evt);
      }
    });
  });
}

/* ======================================================
   MEDIA DETAILS MODAL (SHOW DETAILS)
   ====================================================== */

document.addEventListener("click", async (e) => {
  const mediaCard = e.target.closest("[data-id][data-type]");
  if (!mediaCard) return;

  const id = mediaCard.dataset.id;
  const type = mediaCard.dataset.type;
  setSelectedMedia(id, type);

  try {
    setLoading(true);
    const details = await fetchDetails(type, id);
    const videos = await fetchVideos(type, id);

    const trailer =
      videos?.results?.find(
        (v) => v.type === "Trailer" && v.site === "YouTube"
      ) || null;

    const trailerEmbed = trailer
      ? `https://www.youtube.com/embed/${trailer.key}`
      : null;

    let seasons = [];
    if (type === "tv" && details.seasons) {
      for (const s of details.seasons) {
        const seasonData = await fetchSeasonDetails(id, s.season_number);
        seasons.push(seasonData);
      }
    }

    showMediaDetailsModal(details, trailerEmbed, seasons);
  } catch (err) {
    console.error("Details modal error:", err);
    showErrorMessage("Failed to load media details.");
  } finally {
    setLoading(false);
  }
});
