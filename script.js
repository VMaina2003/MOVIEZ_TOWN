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
  if (path.includes('index.html') || path === "/") {
    mediaType = "movie";
    trendingEndpoint = "/trending/movie/week";
    popularEndpoint = "/movie/popular";
    heroEndpoint = "/movie/now_playing";
    trendingGridId = "trending-movies-grid";
    popularGridId = "popular-movies-grid";
    heroTitle = "Featured Movie";
    document.title = "My Movie' Hub - Movies";
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

/// --- Search Functionality ---
const searchInput = document.getElementById('search-input');
let searchTimeout;

searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    searchTimeout = setTimeout(async () => {
        const mainContent = document.querySelector('main');
        let searchResultsSection = document.getElementById('search-results-section');
        const header = document.querySelector('header'); // Get header to keep it visible

        if (query.length > 2) {
            const searchResults = await fetchMedia(`/search/multi?query=${encodeURIComponent(query)}`);

            // Create search results section if it doesn't exist
            if (!searchResultsSection) {
                searchResultsSection = document.createElement('section');
                searchResultsSection.id = 'search-results-section';
                searchResultsSection.classList.add('mb-8', 'container', 'mx-auto', 'py-8');
                searchResultsSection.innerHTML = `
                    <h2 class="text-3xl font-bold mb-6 text-center">Search Results for "${query}"</h2>
                    <div id="search-results-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    </div>
                `;
                // Insert search results section right after the header
                header.insertAdjacentElement('afterend', searchResultsSection);
            } else {
                 searchResultsSection.querySelector('h2').textContent = `Search Results for "${query}"`;
            }

            // Hide existing main content sections
            document.querySelectorAll('main section').forEach(section => section.classList.add('hidden'));

            // Display search results
            displayMedia(searchResults, 'search-results-grid');

        } else if (query.length === 0) {
            // If search input is cleared, remove search results section and reload initial content
            if (searchResultsSection) {
                searchResultsSection.remove();
            }
            document.querySelectorAll('main section').forEach(section => section.classList.remove('hidden')); // Show all sections again
            loadInitialContent(); // Reload initial content
        }
    }, 500);
});

// media details & comments

// 1) Event listener for Clicks.
document.addEventListener('click', async (event) => {
    const mediaCard = event.target.closest('[data-id][data-type]'); 
    const watchTrailerButton = event.target.closest('hero-section button'); 

    let id, type;

    if (mediaCard) {
        id = mediaCard.dataset.id;
        type = mediaCard.dataset.type;
        await showMediaDetails(id, type);
    } else if (watchTrailerButton) {
        const heroSection = document.getElementById('hero-section');
        id = heroSection.dataset.id;
        type = heroSection.dataset.type;

        if (id && type) {
            await showMediaDetails(id, type);
        } else {
            console.warn("Hero section data-id or data-type not set for trailer button.");
        }
    }
});

// 2.) showMediaDetails(id, type) Function
async function showMediaDetails(id, type);{
    const detailSection = document.getElementById('movie-detail-section');
    const mainContent = document.querySelector('main');

    if (!detailSection) {
        console.error("Movie detail section not found. Please add <section id='movie-detail-section'> to your HTML.");
        return;
    }

    // Hide main content and search results section if visible
    mainContent.classList.add('hidden');
    const searchResultsSection = document.getElementById('search-results-section');
    if (searchResultsSection) searchResultsSection.classList.add('hidden');
    detailSection.classList.remove('hidden');

     //3.) Initial loading state within the detail modal content area
    detailSection.querySelector('#detail-content').innerHTML = `
        <p class="text-center text-lg text-red-500">Loading details...</p>
        <div class="flex justify-center items-center mt-4">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
    `;

    try {
        const mediaDetails = await fetchMedia(`/${type}/${id}`);
        const videosData = await fetch(`${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}&language=en-US`);
        const videos = await videosData.json();

        let seasonsHtml = '';
        if (type === 'tv' && mediaDetails.seasons && mediaDetails.seasons.length > 0) {
            seasonsHtml = `
                <h3 class="text-2xl font-bold mt-8 mb-4">Seasons & Episodes</h3>
                <div class="flex flex-col gap-4">
            `;
            mediaDetails.seasons.forEach(season => {
                if (season.season_number === 0 && season.episode_count === 0) return; // Skip "Specials" season if it has no episodes listed

                seasonsHtml += `
                    <div class="bg-gray-700 p-4 rounded-lg shadow-md cursor-pointer toggle-season" data-season-id="${season.id}" data-season-number="${season.season_number}" data-tv-id="${id}" >
                        <div class="flex items-center justify-between">
                            <h4 class="text-xl font-semibold">${season.name} (${season.episode_count || 'N/A'} Episodes)</h4>
                            <span class="text-xl">+</span>
                        </div>
                        <div class="season-episodes hidden mt-4 pl-4 border-l border-gray-600">
                            <p class="text-gray-400">Click to load episodes...</p>
                        </div>
                    </div>
                `;
            });
            seasonsHtml += `</div>`;
        }

        const comments = getCommentsForMedia(id);

        const trailer = videos.results ? videos.results.find(video => video.type === 'Trailer' && video.site === 'YouTube') : null;


        //4>) Correct YouTube embed URL format
        const trailerEmbedUrl = trailer ? `https://www.youtube.com/embed/${trailer.key}` : ''; // Corrected for https and embed path

        const detailContentHtml = `
            <div class="flex flex-col md:flex-row gap-8 items-start">
                <img src="${IMAGE_BASE_URL}${mediaDetails.poster_path}" alt="${mediaDetails.title || mediaDetails.name}" class="w-full md:w-64 h-auto md:h-96 object-cover rounded-lg shadow-lg flex-shrink-0">
                <div class="flex-grow">
                    <h2 class="text-4xl font-bold mb-4">${mediaDetails.title || mediaDetails.name}</h2>
                    <p class="text-gray-300 text-lg mb-4">${mediaDetails.overview || 'No overview available.'}</p>
                    <p class="text-md text-gray-400 mb-2"><strong>Release Date:</strong> ${mediaDetails.release_date || mediaDetails.first_air_date || 'N/A'}</p>
                    <p class="text-md text-gray-400 mb-4"><strong>Rating:</strong> ${mediaDetails.vote_average ? mediaDetails.vote_average.toFixed(1) : 'N/A'} / 10 (${mediaDetails.vote_count || 0} votes)</p>
                    <p class="text-md text-gray-400 mb-4"><strong>Genres:</strong> ${mediaDetails.genres ? mediaDetails.genres.map(g => g.name).join(', ') : 'N/A'}</p>
                    ${type === 'tv' ? `<p class="text-md text-gray-400 mb-4"><strong>Number of Seasons:</strong> ${mediaDetails.number_of_seasons || 'N/A'}</p>` : ''}

                    ${trailerEmbedUrl ? `
                        <h3 class="text-2xl font-bold mt-6 mb-4">Trailer</h3>
                        <div class="relative" style="padding-bottom: 56.25%; height: 0; overflow: hidden;">
                            <iframe class="absolute top-0 left-0 w-full h-full rounded-lg" src="${trailerEmbedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                        </div>
                    ` : '<p class="text-gray-500 mt-6">No trailer available.</p>'}
                </div>
            </div>

            ${seasonsHtml} <h3 class="text-2xl font-bold mt-8 mb-4">Comments</h3>
            <div id="comments-section" class="mb-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                ${comments.length > 0 ? comments.map(comment => `<p class="bg-gray-700 p-3 rounded-md mb-2">${comment}</p>`).join('') : '<p class="text-gray-500">No comments yet. Be the first to comment!</p>'}
            </div>
            <textarea id="comment-input" class="w-full bg-gray-700 text-white rounded-md p-3 mb-2 focus:outline-none focus:ring-2 focus:ring-red-500" rows="3" placeholder="Add a comment..."></textarea>
            <button id="add-comment-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Add Comment</button>
        `;
        detailSection.querySelector('#detail-content').innerHTML = detailContentHtml;

        //5.) Attach event listeners for season toggles
        if (type === 'tv') {
            document.querySelectorAll('.toggle-season').forEach(seasonDiv => {
                seasonDiv.addEventListener('click', async (e) => {
                    const targetDiv = e.currentTarget;
                    const episodesContainer = targetDiv.querySelector('.season-episodes');
                    const seasonNumber = targetDiv.dataset.seasonNumber;
                    const tvId = targetDiv.dataset.tvId;
                    const toggleIcon = targetDiv.querySelector('span');

                    if (episodesContainer.classList.contains('hidden')) {

                        //6.)Load episodes if not already loaded
                         if (!episodesContainer.dataset.loaded) {
                            episodesContainer.innerHTML = `<p class="text-gray-400">Loading episodes...</p>`;
                            const episodesData = await fetchMedia(`/${type}/${tvId}/season/${seasonNumber}`);
                            if (episodesData && episodesData.episodes && episodesData.episodes.length > 0) {
                                episodesContainer.innerHTML = episodesData.episodes.map(episode => `
                                    <div class="flex items-start gap-2 mb-2 p-2 bg-gray-600 rounded-md">
                                        <img src="${episode.still_path ? `${IMAGE_BASE_URL}${episode.still_path}` : 'https://via.placeholder.com/150x84?text=No+Image'}" alt="Episode Still" class="w-24 h-auto rounded-md flex-shrink-0">
                                        <div>
                                            <p class="text-md font-semibold">E${episode.episode_number}: ${episode.name}</p>
                                            <p class="text-sm text-gray-300">${episode.overview ? episode.overview.substring(0, 100) + '...' : 'No overview.'}</p>
                                            <p class="text-xs text-gray-400">Air Date: ${episode.air_date || 'N/A'}</p>
                                        </div>
                                    </div>
                                `).join('');
                                episodesContainer.dataset.loaded = 'true'; // Mark as loaded
                            } else {
                                episodesContainer.innerHTML = `<p class="text-gray-400">No episodes found for this season.</p>`;
                            }
                        }
                        episodesContainer.classList.remove('hidden');
                        toggleIcon.textContent = '-'; // Change icon to collapse
                    } else {
                        episodesContainer.classList.add('hidden');
                        toggleIcon.textContent = '+'; // Change icon to expand
                    }
                });
            });
        }
        //7.) Attach event listeners for close button and add comment button
        document.getElementById('close-detail-btn').addEventListener('click', () => {
            detailSection.classList.add('hidden');
            mainContent.classList.remove('hidden');
            const searchResultsSection = document.getElementById('search-results-section');
            if (searchResultsSection && !searchResultsSection.classList.contains('hidden')) {
                 searchResultsSection.classList.remove('hidden');
            } else {
                document.querySelectorAll('main section').forEach(section => section.classList.remove('hidden'));
            }
        });

        document.getElementById('add-comment-btn').addEventListener('click', () => {
            const commentText = document.getElementById('comment-input').value.trim();
            if (commentText) {
                addCommentToMedia(id, commentText);
                showMediaDetails(id, type); // Reload details to show new comment
            }
        });

    } catch (error) {
        console.error("Error fetching media details:", error);
        detailSection.querySelector('#detail-content').innerHTML = `
            <p class="text-center text-red-500">Failed to load media details.</p>
            <button id="close-detail-btn" class="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-3xl font-bold">×</button>
        `;

        //8.) Ensure close button works even on error
        document.getElementById('close-detail-btn').addEventListener('click', () => {
            detailSection.classList.add('hidden');
            mainContent.classList.remove('hidden');
            const searchResultsSection = document.getElementById('search-results-section');
            if (searchResultsSection && !searchResultsSection.classList.contains('hidden')) {
                 searchResultsSection.classList.remove('hidden');
            } else {
                document.querySelectorAll('main section').forEach(section => section.classList.remove('hidden'));
            }
        });
    }
}

// --- Comments using Local Storage ---
function getCommentsForMedia(mediaId) {
    const allComments = JSON.parse(localStorage.getItem('mediaComments')) || {};
    return allComments[mediaId] || [];
}

function addCommentToMedia(mediaId, commentText) {
    const allComments = JSON.parse(localStorage.getItem('mediaComments')) || {};
    if (!allComments[mediaId]) {
        allComments[mediaId] = [];
    }
    allComments[mediaId].push(commentText);
    localStorage.setItem('mediaComments', JSON.stringify(allComments));
}


// Ensure the content loads and nav highlights when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    loadInitialContent();
    highlightActiveNav();
});