// TMDB API Configuration

import dotenv from 'dotenv';
dotenv.config();
const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL;
const ORIGINAL_IMAGE_BASE_URL= process.env.ORIGINAL_IMAGE_BASE_URL;

// --- Function to fetch data from TMDb ---
async function fetchMedia(endpoint, page = 1) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}?api_key=${API_KEY}&page=${page}`);
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

// Endless Scroll State Variables
const pageTrackers = {
    trending: { movie: 1, tv: 1, airingToday: 1 },
    popular: { movie: 1, tv: 1, onTheAir: 1 },
    search: 1
};
let isLoading = false;
let currentTrendingEndpoint = "";
let currentPopularEndpoint = "";
let currentTrendingGridId = "";
let currentPopularGridId = "";
let currentSearchQuery = "";



// --- Highlight Active Navigation Link ---
function highlightActiveNav() {
    const navLinks = document.querySelectorAll("nav ul li a");
    const currentPath = window.location.pathname.split("/").pop();

    navLinks.forEach((link) => {
        link.classList.remove("text-red-500", "border-b-2", "border-red-500");
        link.classList.add("hover:text-red-500");

        const linkPath = link.href.split("/").pop();

        if (
            currentPath === linkPath ||
            (currentPath === "" && linkPath === "index.html")
        ) {
            link.classList.add("text-red-500", "border-b-2", "border-red-500");
            link.classList.remove("hover:text-red-500");
        }
    });
}

// --- Function to create a movie/TV show card HTML ---
function createMediaCard(media) {
    const posterPath = media.poster_path ?
        `${IMAGE_BASE_URL}${media.poster_path}` :
        "https://via.placeholder.com/200x300?text=No+Image";
    const title = media.title || media.name;
    const voteAverage = media.vote_average ?
        media.vote_average.toFixed(1) :
        "N/A";
    const mediaType =
        media.media_type ||
        (window.location.pathname.includes("series.html") ||
            window.location.pathname.includes("tvshows.html") ?
            "tv" :
            "movie");

    return `
        <div class="bg-gray-800 rounded-lg  sm:grid-cols-3  shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-300 cursor-pointer" data-id="${media.id}" data-type="${mediaType} sm: grid-cols-3">
            <img src="${posterPath}" alt="${title}" class="w-full h- object-cover">
            <div class="p-4">
                <h3 class="text-lg font-semibold hover:text-red-500">${title}</h3>
                <p class="text-sm text-gray-400 mt-2">Rating: ${voteAverage} / 10</p>
            </div>
        </div>
    `;
}

// --- This function renders a list of movie/TV show cards inside a specific container on your page. ---
function displayMedia(mediaItems, containerId, append = false) {
    const container = document.getElementById(containerId);
    if (container) {
        if (!append) {
            container.innerHTML = "";
        }
        mediaItems.forEach((item) => {
            container.innerHTML += createMediaCard(item);
        });
    }
}

// --- Helper functions for Endless Scroll page tracking ---
function getCurrentPage(endpoint) {
    if (endpoint.includes("/trending/movie/week")) return pageTrackers.trending.movie;
    if (endpoint.includes("/movie/popular")) return pageTrackers.popular.movie;
    if (endpoint.includes("/trending/tv/week")) return pageTrackers.trending.tv;
    if (endpoint.includes("/tv/popular")) return pageTrackers.popular.tv;
    if (endpoint.includes("/tv/airing_today")) return pageTrackers.trending.airingToday;
    if (endpoint.includes("/tv/on_the_air")) return pageTrackers.popular.onTheAir;
    if (endpoint.includes("/search/multi")) return pageTrackers.search;
    return 1;
}

function incrementPage(endpoint) {
    if (endpoint.includes("/trending/movie/week")) pageTrackers.trending.movie++;
    else if (endpoint.includes("/movie/popular")) pageTrackers.popular.movie++;
    else if (endpoint.includes("/trending/tv/week")) pageTrackers.trending.tv++;
    else if (endpoint.includes("/tv/popular")) pageTrackers.popular.tv++;
    else if (endpoint.includes("/tv/airing_today")) pageTrackers.trending.airingToday++;
    else if (endpoint.includes("/tv/on_the_air")) pageTrackers.popular.onTheAir++;
    else if (endpoint.includes("/search/multi")) pageTrackers.search++;
}

// --- Main function to load initial content based on the current page ---
async function loadInitialContent() {
    const path = window.location.pathname;
    let mediaType = "movie";
    let heroEndpoint = "";

    Object.keys(pageTrackers).forEach(key => {
        if (typeof pageTrackers[key] === 'object') {
            Object.keys(pageTrackers[key]).forEach(subKey => {
                pageTrackers[key][subKey] = 1;
            });
        } else {
            pageTrackers[key] = 1;
        }
    });

    // Determine content based on the current page and manage section visibility
    // Get all relevant content sections
    const allContentSections = [
        document.getElementById('trending-movies-section'),
        document.getElementById('popular-movies-section'),
        document.getElementById('trending-tv-section'),
        document.getElementById('popular-tv-section'),
        document.getElementById('airing-today-tv-section') // Specific to tvshows.html
    ];

    // Hide all of them first
    allContentSections.forEach(section => section && section.classList.add('hidden'));


    if (path.includes('index.html') || path === "/") {
        mediaType = "movie";
        currentTrendingEndpoint = "/trending/movie/week";
        currentPopularEndpoint = "/movie/popular";
        heroEndpoint = "/movie/now_playing";
        currentTrendingGridId = "trending-movies-grid";
        currentPopularGridId = "popular-movies-grid";
        document.title = "My Movie Hub - Movies";

        document.getElementById('trending-movies-section')?.classList.remove('hidden');
        document.getElementById('popular-movies-section')?.classList.remove('hidden');

    } else if (path.includes("series.html")) {
        mediaType = "tv";
        currentTrendingEndpoint = "/trending/tv/week";
        currentPopularEndpoint = "/tv/popular";
        heroEndpoint = "/tv/top_rated";
        currentTrendingGridId = "trending-tv-grid";
        currentPopularGridId = "popular-tv-grid";
        document.title = "My Movie Hub - Series";

        document.getElementById('trending-tv-section')?.classList.remove('hidden');
        document.getElementById('popular-tv-section')?.classList.remove('hidden');

    } else if (path.includes("tvshows.html")) {
        mediaType = "tv";
        currentTrendingEndpoint = "/tv/airing_today";
        currentPopularEndpoint = "/tv/on_the_air";
        heroEndpoint = "/tv/popular";
        currentTrendingGridId = "airing-today-tv-grid";
        currentPopularGridId = "popular-tv-grid";
        document.title = "My Movie Hub - TV Shows";

        document.getElementById('airing-today-tv-section')?.classList.remove('hidden');
        document.getElementById('popular-tv-section')?.classList.remove('hidden');
    }

    const trendingMedia = await fetchMedia(currentTrendingEndpoint, getCurrentPage(currentTrendingEndpoint));
    displayMedia(trendingMedia, currentTrendingGridId);

    const popularMedia = await fetchMedia(currentPopularEndpoint, getCurrentPage(currentPopularEndpoint));
    displayMedia(popularMedia, currentPopularGridId);

    const heroSection = document.getElementById("hero-section");
    if (heroSection) {
        const heroData = await fetchMedia(heroEndpoint);
        if (heroData.length > 0) {
            const heroItem = heroData[0];
            heroSection.style.backgroundImage = `url(${ORIGINAL_IMAGE_BASE_URL}${heroItem.backdrop_path})`;
            heroSection.querySelector("h2").textContent = heroItem.title || heroItem.name;
            heroSection.querySelector("p").textContent = heroItem.overview ?
                heroItem.overview.substring(0, 150) + "..." :
                "No overview available.";

            heroSection.dataset.id = heroItem.id;
            heroSection.dataset.type = mediaType;
        }
    }
}

// --- Endless Scroll Event Listener ---
window.addEventListener("scroll", async () => {
    if (isLoading || currentSearchQuery) return;

    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        isLoading = true;

        incrementPage(currentTrendingEndpoint);
        const moreTrending = await fetchMedia(currentTrendingEndpoint, getCurrentPage(currentTrendingEndpoint));
        displayMedia(moreTrending, currentTrendingGridId, true);

        incrementPage(currentPopularEndpoint);
        const morePopular = await fetchMedia(currentPopularEndpoint, getCurrentPage(currentPopularEndpoint));
        displayMedia(morePopular, currentPopularGridId, true);

        isLoading = false;
    }
});

/// --- Search Functionality ---
const searchInput = document.getElementById('search-input');
let searchTimeout;

searchInput.addEventListener('input', async (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.valuegit();
    currentSearchQuery = query;

    const mainContentSections = document.querySelectorAll('main section:not(#search-results-section)');
    let searchResultsSection = document.getElementById('search-results-section');
    const main = document.querySelector('main');

    if (query.length > 2) {
        searchTimeout = setTimeout(async () => {
            const searchResults = await fetchMedia(`https://api.themoviedb.org/3/search/keyword/api_key=${API_KEY}&query=${encodeURIComponent(query)}`);

            // Ensure searchResultsSection exists and is visible
            if (!searchResultsSection) {
                searchResultsSection = document.createElement('section');
                searchResultsSection.id = 'search-results-section';
                searchResultsSection.classList.add('mb-8', 'container', 'mx-auto', 'py-8');
                if (main) {
                    // Prepend it to main, or adjust as per your desired layout
                    const firstMainChild = main.firstElementChild;
                    if (firstMainChild) {
                        main.insertBefore(searchResultsSection, firstMainChild);
                    } else {
                        main.appendChild(searchResultsSection);
                    }
                }
            }
            searchResultsSection.classList.remove('hidden');

            // Add the search title and grid container directly to the searchResultsSection
            // ONLY if they don't already exist or if you need to clear old results
            let searchResultsGrid = document.getElementById('search-results-grid');
            if (!searchResultsGrid) {
                searchResultsSection.innerHTML = `
                    <h2 class="text-3xl font-bold mb-6 text-center">Search Results for "${query}"</h2>
                    <div id="search-results-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    </div>
                `;
                searchResultsGrid = document.getElementById('search-results-grid'); // Get reference after creation
            } else {
                // Update title and clear grid for new search
                searchResultsSection.querySelector('h2').textContent = `Search Results for "${query}"`;
                searchResultsGrid.innerHTML = ''; // Clear previous results
            }

            mainContentSections.forEach(section => section.classList.add('hidden'));

            // Now display media into the correctly referenced grid
            displayMedia(searchResults, 'search-results-grid');

        }, 500);
    } else if (query.length === 0) {
        if (searchResultsSection) {
            searchResultsSection.classList.add('hidden');
            searchResultsSection.innerHTML = '';
        }
        mainContentSections.forEach(section => section.classList.remove('hidden'));
        loadInitialContent();
    }
});

// --- Media Details & Comments ---
document.addEventListener('click', async (event) => {
    const mediaCard = event.target.closest('[data-id][data-type]');
    const watchTrailerButton = event.target.closest('#hero-section .watch-trailer-btn');

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

async function showMediaDetails(id, type) {
    const detailSection = document.getElementById('movie-detail-section');
    const mainContent = document.querySelector('main');
    const searchResultsSection = document.getElementById('search-results-section');

    if (!detailSection) {
        console.error("Movie detail section not found. Please add <section id='movie-detail-section'> to your HTML.");
        return;
    }

    const detailContentContainer = detailSection.querySelector('#detail-content');

    // Hide main content and search results section
    mainContent.classList.add('hidden');
    if (searchResultsSection) searchResultsSection.classList.add('hidden');
    detailSection.classList.remove('hidden'); // Show the modal overlay

    // Set initial loading state and center it
    detailContentContainer.innerHTML = `
        <p class="text-center text-lg text-red-500">Loading details...</p>
        <div class="flex justify-center items-center mt-4">
            <div class=" rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
    `;
    // These classes are for centering the loading message within the flex-grow container
    detailContentContainer.classList.add('flex', 'justify-center', 'items-center', 'h-full');


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
                if (season.season_number === 0 && season.episode_count === 0) return;

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
        // Correct YouTube embed URL: Note the corrected domain and template literal syntax
        const trailerEmbedUrl = trailer ? `https://www.youtube.com/embed/${trailer.key}` : '';

        const detailContentHtml = `
            <div class="flex flex-col md:flex-row gap-8 items-start mb-8">
                <img src="${mediaDetails.poster_path ? `${IMAGE_BASE_URL}${mediaDetails.poster_path}` : "https://via.placeholder.com/200x300?text=No+Image"}"
                     alt="${mediaDetails.title || mediaDetails.name}"
                     class="w-full md:w-64 h-auto md:h-96 object-cover rounded-lg shadow-lg flex-shrink-0">
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
                            <iframe class="absolute top-0 left-0 w-full h-full rounded-lg"
                                    src="${trailerEmbedUrl}"
                                    frameborder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen>
                            </iframe>
                        </div>
                    ` : '<p class="text-gray-500 mt-6">No trailer available.</p>'}
                </div>
            </div>

            ${seasonsHtml}

            <h3 class="text-2xl font-bold mt-8 mb-4">Comments</h3>
            <div id="comments-section" class="mb-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                ${comments.length > 0 ? comments.map(comment => `<p class="bg-gray-700 p-3 rounded-md mb-2">${comment}</p>`).join('') : '<p class="text-gray-500">No comments yet. Be the first to comment!</p>'}
            </div>
            <textarea id="comment-input" class="w-full bg-gray-700 text-white rounded-md p-3 mb-2 focus:outline-none focus:ring-2 focus:ring-red-500" rows="3" placeholder="Add a comment..."></textarea>
            <button id="add-comment-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Add Comment</button>
        `;

        // Clear initial loading state classes
        detailContentContainer.classList.remove('flex', 'justify-center', 'items-center', 'h-full', 'overflow-hidden');

        // Populate and add scroll classes
        detailContentContainer.innerHTML = detailContentHtml;
        detailContentContainer.classList.add('overflow-y-auto', 'custom-scrollbar', 'p-8');
        // Setting flex-grow: 1 ensures it fills available vertical space, and combined with overflow-y-auto, enables scrolling.
        detailContentContainer.style.flex = '1';


        // Attach event listeners for season toggles (only if it's a TV show)
        if (type === 'tv') {
            document.querySelectorAll('.toggle-season').forEach(seasonDiv => {
                seasonDiv.addEventListener('click', async (e) => {
                    const targetDiv = e.currentTarget;
                    const episodesContainer = targetDiv.querySelector('.season-episodes');
                    const seasonNumber = targetDiv.dataset.seasonNumber;
                    const tvId = targetDiv.dataset.tvId;
                    const toggleIcon = targetDiv.querySelector('span');

                    if (episodesContainer.classList.contains('hidden')) {
                        if (!episodesContainer.dataset.loaded) {
                            episodesContainer.innerHTML = `<p class="text-gray-400">Loading episodes...</p>`;
                            const episodesData = await fetchMedia(`/${type}/${tvId}/season/${seasonNumber}`);
                            if (episodesData && episodesData.episodes && episodesData.episodes.length > 0) {
                                episodesContainer.innerHTML = episodesData.episodes.map(episode => `
                                    <div class="flex items-start gap-2 mb-2 p-2 bg-gray-600 rounded-md">
                                        <img src="${episode.still_path ? `${IMAGE_BASE_URL}${episode.still_path}` : 'https://via.placeholder.com/150x84?text=No+Image'}"
                                             alt="Episode Still"
                                             class="w-24 h-auto rounded-md flex-shrink-0">
                                        <div>
                                            <p class="text-md font-semibold">E${episode.episode_number}: ${episode.name}</p>
                                            <p class="text-sm text-gray-300">${episode.overview ? episode.overview.substring(0, 100) + '...' : 'No overview.'}</p>
                                            <p class="text-xs text-gray-400">Air Date: ${episode.air_date || 'N/A'}</p>
                                        </div>
                                    </div>
                                `).join('');
                                episodesContainer.dataset.loaded = 'true';
                            } else {
                                episodesContainer.innerHTML = `<p class="text-gray-400">No episodes found for this season.</p>`;
                            }
                        }
                        episodesContainer.classList.remove('hidden');
                        toggleIcon.textContent = '-';
                    } else {
                        episodesContainer.classList.add('hidden');
                        toggleIcon.textContent = '+';
                    }
                });
            });
        }

        // Attach event listeners for close button and add comment button
        document.getElementById('close-detail-btn').addEventListener('click', () => {
            detailSection.classList.add('hidden');

            // Remove scroll and flex classes from detailContentContainer when closing
            detailContentContainer.classList.remove('overflow-y-auto', 'custom-scrollbar', 'p-8');
            detailContentContainer.classList.add('overflow-hidden'); // Restore initial hidden overflow
            detailContentContainer.style.flex = ''; // Remove explicit flex style

            if (searchResultsSection && !searchResultsSection.classList.contains('hidden')) {
                searchResultsSection.classList.remove('hidden');
            } else {
                document.querySelectorAll('main section:not(#search-results-section)').forEach(section => section.classList.remove('hidden'));
            }
            mainContent.classList.remove('hidden');
        });

        document.getElementById('add-comment-btn').addEventListener('click', () => {
            const commentInput = document.getElementById('comment-input');
            const commentText = commentInput.value.trim();
            if (commentText) {
                addCommentToMedia(id, commentText);
                commentInput.value = '';
                showMediaDetails(id, type); // Reload details to show the new comment
            }
        });

    } catch (error) {
        console.error("Error fetching media details:", error);
        detailContentContainer.innerHTML = `
            <p class="text-center text-red-500">Failed to load media details.</p>
        `;
        // Ensure close button works even on error
        document.getElementById('close-detail-btn').addEventListener('click', () => {
            detailSection.classList.add('hidden');

            detailContentContainer.classList.remove('overflow-y-auto', 'custom-scrollbar', 'p-8');
            detailContentContainer.classList.add('overflow-hidden');
            detailContentContainer.style.flex = '';

            if (searchResultsSection && !searchResultsSection.classList.contains('hidden')) {
                searchResultsSection.classList.remove('hidden');
            } else {
                document.querySelectorAll('main section:not(#search-results-section)').forEach(section => section.classList.remove('hidden'));
            }
            mainContent.classList.remove('hidden');
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