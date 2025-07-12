const API_KEY = "";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const ORIGINAL_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";

// Function to fetch data from TMDb
async function fetchMedia(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}?api_key=${API_KEY}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.results || data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}

// --- Highlight Active Navigation Link
function highlightActiveNav() {
  const navLinks = document.querySelectorAll("nav ul li a");
  const currentPath = window.location.pathname.split("/").pop();

  navLinks.forEach((link) => {
    // Remove active classes from all links first
    link.classList.remove("text-red-500", "border-b-2", "border-red-500");
    link.classList.add("hover:text-red-500"); // Ensure hover effect remains

    const linkPath = link.href.split("/").pop();

    // Check for active link (handles root URL accessing index.html)
    if (
      currentPath === linkPath ||
      (currentPath === "" && linkPath === "index.html")
    ) {
      link.classList.add("text-red-500", "border-b-2", "border-red-500");
      link.classList.remove("hover:text-red-500"); // Remove hover for the active one
    }
  });
}

// Function to create a movie/TV show card HTML
function createMediaCard(media) {
  const posterPath = media.poster_path
    ? `${IMAGE_BASE_URL}${media.poster_path}`
    : "https://via.placeholder.com/200x300?text=No+Image";
  const title = media.title || media.name; // 'title' for movies, 'name' for TV shows
  const voteAverage = media.vote_average
    ? media.vote_average.toFixed(1)
    : "N/A"; // Shows the rating like 8.5 / 10 If no rating, it shows 'N/A'.
  const mediaType =
    media.media_type ||
    (window.location.pathname.includes("series.html") ||
    window.location.pathname.includes("tvshows.html")
      ? "tv"
      : "movie");

  return `
        <div class="bg-gray-800 rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-300 cursor-pointer" data-id="${media.id}" data-type="${mediaType}">
            <img src="${posterPath}" alt="${title}" class="w-full h-72 object-cover">
            <div class="p-4">
                <h3 class="text-lg font-semibold truncate hover:text-red-500">${title}</h3>
                <p class="text-sm text-gray-400 mt-2">Rating: ${voteAverage} / 10</p>
            </div>
        </div>
    `;
}

// This function renders a list of movie/TV show cards inside a specific container on your page.
function displayMedia(mediaItems, containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = ""; // removes previous content (so it doesn't stack new results on top).
    // Loops through each movie or TV show object in the list Calls createMediaCard() to get the HTML Appends it to the container's innerHTML
    mediaItems.forEach((item) => {
      container.innerHTML += createMediaCard(item);
    });
  }
}

// Main function to load content
async function loadInitialContent() {
  const path = window.location.pathname;
  let mediaType = "movie"; // Default media type
  let trendingEndpoint = "";
  let popularEndpoint = "";
  let heroEndpoint = ""; // Endpoint for the featured hero item
  let trendingGridId = "";
  let popularGridId = "";
  let heroTitle = "";

  // Determine content based on the current page
  if (path.includes(indexed.html) || path === "/") {
    mediaType = "movie";
    trendingEndpoint = "/trending/movie/week";
    popularEndpoint = "/movie/popular";
    heroEndpoint = "/movie/now_playing";
    trendingGridId = "trending-movies-grid";
    popularGridId = "popular-movies-grid";
    heroTitle = "Featured Movie";
    document.title = "My Movie Hub - Movies";
  } else if (path.includes("series.html")) {
    mediaType = "tv";
    trendingEndpoint = "/trending/tv/week";
    popularEndpoint = "/tv/popular";
    heroEndpoint = "/tv/top_rated";
    trendingGridId = "trending-tv-grid";
    popularGridId = "popular-tv-grid";
    heroTitle = "Featured Series";
    document.title = "My Movie Hub - Series";
  } else if (path.includes("tvshows.html")) {
    mediaType = "tv";
    trendingEndpoint = "/tv/airing_today";
    popularEndpoint = "/tv/on_the_air";
    heroEndpoint = "/tv/popular";
    trendingGridId = "airing-today-tv-grid";
    popularGridId = "top-rated-tv-grid";
    heroTitle = "Featured TV Show";
    document.title = "My Movie Hub - TV Shows";
  }

  /// Load trending content
  const trendingMedia = await fetchMedia(trendingEndpoint);
  displayMedia(trendingMedia, trendingGridId);

  // Load popular content
  const popularMedia = await fetchMedia(popularEndpoint);
  displayMedia(popularMedia, popularGridId);

  // Update Hero section
  const heroSection = document.getElementById("hero-section");
  if (heroSection) {
    const heroData = await fetchMedia(heroEndpoint);
    if (heroData.length > 0) {
      const heroItem = heroData[0];
      heroSection.style.backgroundImage = `url(${ORIGINAL_IMAGE_BASE_URL}${heroItem.backdrop_path})`;
      heroSection.querySelector("h2").textContent =
        heroItem.title || heroItem.name;
      heroSection.querySelector("p").textContent = heroItem.overview
        ? heroItem.overview.substring(0, 150) + "..."
        : "No overview available.";

      // Add data attributes to the hero section for detail view/trailer button
      heroSection.dataset.id = heroItem.id;
      heroSection.dataset.type = mediaType; // Use the determined mediaType for the hero
    }
  }
}
