/**
 * js/ui.js
 * ------------------------------------------------------
 * Handles all UI rendering and DOM manipulation.
 * Keeps logic & data separate from visuals.
 * ------------------------------------------------------
 * Uses Tailwind CSS for responsive, mobile-first design.
 */

import { getImageUrl } from "./api.js";

/* ======================================================
   NAVIGATION HIGHLIGHT
   ====================================================== */

export function highlightActiveNav() {
  const navLinks = document.querySelectorAll("nav ul li a");
  const currentPath = window.location.pathname.split("/").pop();

  navLinks.forEach((link) => {
    const linkPath = link.href.split("/").pop();
    const isActive =
      currentPath === linkPath || (currentPath === "" && linkPath === "index.html");

    link.classList.toggle("text-red-500", isActive);
    link.classList.toggle("border-b-2", isActive);
    link.classList.toggle("border-red-500", isActive);
  });
}

/* ======================================================
   HERO SECTION
   ====================================================== */

export function updateHeroSection(media, ORIGINAL_IMAGE_BASE_URL) {
  const hero = document.getElementById("hero-section");
  if (!hero || !media) return;

  hero.style.backgroundImage = `url(${ORIGINAL_IMAGE_BASE_URL}${media.backdrop_path})`;
  hero.style.backgroundSize = "cover";
  hero.style.backgroundPosition = "center";

  hero.innerHTML = `
    <div class="bg-black/60 flex flex-col justify-center items-start h-full p-6 sm:p-12">
      <h2 class="text-2xl sm:text-4xl font-bold mb-3">${media.title || media.name}</h2>
      <p class="text-sm sm:text-base text-gray-200 max-w-xl mb-4">
        ${media.overview ? media.overview.substring(0, 150) + "..." : "No description available."}
      </p>
      <button class="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md watch-trailer-btn transition-all duration-200">
        Watch Trailer
      </button>
    </div>
  `;
}

/* ======================================================
   MOVIE / TV GRID RENDERING
   ====================================================== */

export function displayMediaGrid(items, containerId, append = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const cardsHtml = items.map(createMediaCard).join("");

  if (append) container.insertAdjacentHTML("beforeend", cardsHtml);
  else container.innerHTML = cardsHtml;
}

function createMediaCard(media) {
  const poster = getImageUrl(media.poster_path, "w500");
  const title = media.title || media.name;
  const rating = media.vote_average ? media.vote_average.toFixed(1) : "N/A";
  const type = media.media_type || "movie";

  return `
    <div data-id="${media.id}" data-type="${type}"
      class="bg-gray-800 rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-300 cursor-pointer">
      <img src="${poster}" alt="${title}" class="w-full h-72 sm:h-80 object-cover">
      <div class="p-3 sm:p-4">
        <h3 class="text-sm sm:text-base font-semibold hover:text-red-500">${title}</h3>
        <p class="text-xs sm:text-sm text-gray-400 mt-1">⭐ ${rating}/10</p>
      </div>
    </div>
  `;
}

/* ======================================================
   SEARCH RESULTS RENDERING
   ====================================================== */

export function showSearchResults(results, query) {
  const main = document.querySelector("main");
  let searchSection = document.getElementById("search-section");

  if (!searchSection) {
    searchSection = document.createElement("section");
    searchSection.id = "search-section";
    main.prepend(searchSection);
  }

  if (!results || results.length === 0) {
    searchSection.innerHTML = `
      <div class="text-center text-gray-400 py-10">
        <p>No results found for "<strong>${query}</strong>"</p>
      </div>
    `;
    return;
  }

  searchSection.innerHTML = `
    <h2 class="text-2xl sm:text-3xl font-bold text-center mb-6">
      Search Results for "${query}"
    </h2>
    <div id="search-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
      ${results.map(createMediaCard).join("")}
    </div>
  `;

  // Hide main content sections (trending, popular)
  document
    .querySelectorAll("main section:not(#search-section)")
    .forEach((sec) => sec.classList.add("hidden"));
}

/* ======================================================
   MEDIA DETAILS MODAL
   ====================================================== */

export function showMediaDetailsModal(details, trailerEmbed, seasons = []) {
  let modal = document.getElementById("media-detail-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "media-detail-modal";
    modal.className =
      "fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4";
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="bg-gray-900 rounded-lg w-full max-w-4xl overflow-y-auto max-h-[90vh] shadow-lg">
      <div class="flex justify-between items-center p-4 border-b border-gray-700">
        <h3 class="text-xl font-bold">${details.title || details.name}</h3>
        <button id="close-modal" class="text-gray-300 hover:text-red-500 text-2xl">&times;</button>
      </div>

      <div class="p-6">
        <div class="flex flex-col md:flex-row gap-6 mb-6">
          <img src="${getImageUrl(details.poster_path)}" 
            alt="${details.title || details.name}" 
            class="w-full md:w-60 h-auto rounded-md shadow-md">

          <div>
            <p class="text-gray-300 mb-2">${details.overview || "No overview available."}</p>
            <p class="text-sm text-gray-400 mb-1">
              <strong>Rating:</strong> ${details.vote_average?.toFixed(1) || "N/A"} / 10
            </p>
            <p class="text-sm text-gray-400 mb-1">
              <strong>Release Date:</strong> ${details.release_date || details.first_air_date || "N/A"}
            </p>
            <p class="text-sm text-gray-400 mb-1">
              <strong>Genres:</strong> ${details.genres?.map((g) => g.name).join(", ") || "N/A"}
            </p>
          </div>
        </div>

        ${
          trailerEmbed
            ? `
          <h4 class="text-lg font-bold mb-2">Trailer</h4>
          <div class="relative w-full pb-[56.25%] mb-6">
            <iframe src="${trailerEmbed}" class="absolute top-0 left-0 w-full h-full rounded-md"
              frameborder="0" allowfullscreen></iframe>
          </div>
          `
            : `<p class="text-gray-500 mb-6">No trailer available.</p>`
        }

        ${
          seasons.length > 0
            ? `
          <h4 class="text-lg font-bold mb-3">Seasons & Episodes</h4>
          <div class="space-y-3">
            ${seasons
              .map(
                (s) => `
              <div class="bg-gray-800 p-3 rounded-md">
                <p class="font-semibold">${s.name || "Season " + s.season_number}</p>
                <p class="text-gray-400 text-sm">${s.episodes?.length || 0} episodes</p>
              </div>
            `
              )
              .join("")}
          </div>
          `
            : ""
        }
      </div>
    </div>
  `;

  // Close button
  modal.querySelector("#close-modal").addEventListener("click", () => {
    modal.remove();
  });
}

/* ======================================================
   HELPERS
   ====================================================== */

export function clearSection(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = "";
}

export function showLoadingSpinner() {
  const existing = document.getElementById("loading-spinner");
  if (existing) return;

  const spinner = document.createElement("div");
  spinner.id = "loading-spinner";
  spinner.className =
    "fixed bottom-6 right-6 bg-gray-900 text-white rounded-full p-3 shadow-lg z-50";
  spinner.innerHTML = `
    <svg class="animate-spin h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z"></path>
    </svg>
  `;
  document.body.appendChild(spinner);
}

export function hideLoadingSpinner() {
  const spinner = document.getElementById("loading-spinner");
  if (spinner) spinner.remove();
}

export function showErrorMessage(message) {
  const container = document.createElement("div");
  container.className =
    "fixed top-5 right-5 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg z-50";
  container.textContent = message;
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 3000);
}
