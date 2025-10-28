// TMDB API Configuration
const API_KEY = 'd2aac7456bf07db40918764f9a7bddf1';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const ORIGINAL_IMAGE_BASE_URL= 'https://image.tmdb.org/t/p/original';


// --- Function to fetch data from TMDb ---
async function fetchMedia(endpoint, page = 1) {
    try {
        // Determine if the endpoint supports pagination
        const supportsPagination = /trending|popular|top_rated|airing_today|on_the_air|search/.test(endpoint);

        // Build the URL dynamically
        const url = endpoint.includes('?')
            ? `${BASE_URL}${endpoint}&api_key=${API_KEY}${supportsPagination ? `&page=${page}` : ''}`
            : `${BASE_URL}${endpoint}?api_key=${API_KEY}${supportsPagination ? `&page=${page}` : ''}`;

        console.log('Fetching:', url); // helpful for debugging

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Endpoint: ${endpoint}, Status: ${response.status}`);
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
let isSearching = false;


// --- Highlight Active Navigation Link ---
function highlightActiveNav() {
    const navLinks = document.querySelectorAll("nav ul li a");
    const currentPath = window.location.pathname.split("/").pop() || "index.html";

    navLinks.forEach((link) => {
        link.classList.remove("text-red-500", "border-b-2", "border-red-500");
        link.classList.add("hover:text-red-500");

        const linkPath = link.href.split("/").pop() || "index.html";

        if (currentPath === linkPath) {
            link.classList.add("text-red-500", "border-b-2", "border-red-500");
            link.classList.remove("hover:text-red-500");
        }
    });
}

// --- Function to create a movie/TV show card HTML ---
function createMediaCard(media) {
    if (!media.poster_path) return ''; 

    const title = media.title || media.name;
    const mediaType = media.media_type || (media.title ? "movie" : "tv");
    
    if (mediaType === 'person') return '';

    const posterPath = `${IMAGE_BASE_URL}${media.poster_path}`;
    const voteAverage = media.vote_average ? media.vote_average.toFixed(1) : "N/A";

    return `
        <div class="bg-gray-800 rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-300 cursor-pointer" data-id="${media.id}" data-type="${mediaType}">
            <img src="${posterPath}" alt="${title}" class="w-full h-auto object-cover">
            <div class="p-4">
                <h3 class="text-lg font-semibold hover:text-red-500 truncate">${title}</h3>
                <p class="text-sm text-gray-400 mt-2">Rating: ${voteAverage} / 10</p>
            </div>
        </div>
    `;
}

// --- This function renders a list of movie/TV show cards inside a specific container on your page. ---
function displayMedia(mediaItems, containerId, append = false) {
    const container = document.getElementById(containerId);
    if (container) {
        let cardsHtml = mediaItems.map(createMediaCard).join('');
        
        if (!append) {
            container.innerHTML = cardsHtml;
        } else {
            container.innerHTML += cardsHtml;
        }
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

// --- Function to reset all page trackers ---
function resetPageTrackers() {
    Object.keys(pageTrackers).forEach(key => {
        if (typeof pageTrackers[key] === 'object') {
            Object.keys(pageTrackers[key]).forEach(subKey => {
                pageTrackers[key][subKey] = 1;
            });
        } else {
            pageTrackers[key] = 1;
        }
    });
}

// --- Main function to load initial content based on the current page ---
async function loadInitialContent() {
    resetPageTrackers();
    
    const path = window.location.pathname;
    let mediaType = "movie";
    let heroEndpoint = "";

    const allContentSections = [
        document.getElementById('trending-movies-section'),
        document.getElementById('popular-movies-section'),
        document.getElementById('trending-tv-section'),
        document.getElementById('popular-tv-section'),
        document.getElementById('airing-today-tv-section')
    ];
    allContentSections.forEach(section => section && section.classList.add('hidden'));

    if (isSearching) return; 

    // Determine content based on the current page
    if (path.includes('index.html') || path === "/") {
        currentTrendingEndpoint = "/trending/movie/week";
        currentPopularEndpoint = "/movie/popular";
        heroEndpoint = "/movie/now_playing";
        currentTrendingGridId = "trending-movies-grid";
        currentPopularGridId = "popular-movies-grid";
        document.title = "My Movie Hub - Movies";

        document.getElementById('trending-movies-section')?.classList.remove('hidden');
        document.getElementById('popular-movies-section')?.classList.remove('hidden');

    } else if (path.includes("series.html")) {
        currentTrendingEndpoint = "/trending/tv/week";
        currentPopularEndpoint = "/tv/popular";
        heroEndpoint = "/tv/top_rated";
        currentTrendingGridId = "trending-tv-grid";
        currentPopularGridId = "popular-tv-grid";
        document.title = "My Movie Hub - Series";

        document.getElementById('trending-tv-section')?.classList.remove('hidden');
        document.getElementById('popular-tv-section')?.classList.remove('hidden');

    } else if (path.includes("tvshows.html")) {
        currentTrendingEndpoint = "/tv/airing_today";
        currentPopularEndpoint = "/tv/on_the_air";
        heroEndpoint = "/tv/popular";
        currentTrendingGridId = "airing-today-tv-grid";
        currentPopularGridId = "popular-tv-grid";
        document.title = "My Movie Hub - TV Shows";

        document.getElementById('airing-today-tv-section')?.classList.remove('hidden');
        document.getElementById('popular-tv-section')?.classList.remove('hidden');
    }

    // Load and display initial content (Page 1)
    const trendingMedia = await fetchMedia(currentTrendingEndpoint, 1);
    displayMedia(trendingMedia, currentTrendingGridId);

    const popularMedia = await fetchMedia(currentPopularEndpoint, 1);
    displayMedia(popularMedia, currentPopularGridId);

    // Load and set up the hero section
    const heroSection = document.getElementById("hero-section");
    if (heroSection) {
        const heroData = await fetchMedia(heroEndpoint);
        if (heroData.length > 0) {
            const heroItem = heroData[0];
            mediaType = heroItem.media_type || (heroItem.title ? "movie" : "tv");
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
    if (isLoading || isSearching) return; 

    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        isLoading = true;

        // Load more Trending/Airing Today
        incrementPage(currentTrendingEndpoint);
        const moreTrending = await fetchMedia(currentTrendingEndpoint, getCurrentPage(currentTrendingEndpoint));
        displayMedia(moreTrending, currentTrendingGridId, true);

        // Load more Popular/On The Air
        incrementPage(currentPopularEndpoint);
        const morePopular = await fetchMedia(currentPopularEndpoint, getCurrentPage(currentPopularEndpoint));
        displayMedia(morePopular, currentPopularGridId, true);

        isLoading = false;
    }
});


/// --- Search Functionality ---
const searchInput = document.getElementById('search-input');
let searchTimeout;

if (searchInput) {
    searchInput.addEventListener('input', async (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        currentSearchQuery = query;

        const mainContentSections = document.querySelectorAll('main section:not(#search-results-section)');
        let searchResultsSection = document.getElementById('search-results-section');
        const main = document.querySelector('main');
        
        // 1. Handle search activation
        if (query.length > 2) {
            isSearching = true;
            searchTimeout = setTimeout(async () => {
                
                const searchResults = await fetchMedia(`/search/multi?query=${encodeURIComponent(query)}`, pageTrackers.search);

                // Initialize search section structure if it doesn't exist
                if (!searchResultsSection) {
                    searchResultsSection = document.createElement('section');
                    searchResultsSection.id = 'search-results-section';
                    searchResultsSection.classList.add('mb-8', 'container', 'mx-auto', 'py-8');
                    main.prepend(searchResultsSection);
                }
                searchResultsSection.classList.remove('hidden');

                // Update section content
                searchResultsSection.innerHTML = `
                    <h2 class="text-3xl font-bold mb-6 text-center">Search Results for "${query}"</h2>
                    <div id="search-results-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    </div>
                `;
                
                // Hide main content sections
                mainContentSections.forEach(section => section.classList.add('hidden'));

                // Display results
                displayMedia(searchResults, 'search-results-grid');

                pageTrackers.search = 1;

            }, 500);
        } 
        // 2. Handle search deactivation
        else if (query.length === 0 && isSearching) {
            clearTimeout(searchTimeout);
            isSearching = false;
            
            if (searchResultsSection) {
                searchResultsSection.classList.add('hidden');
                searchResultsSection.innerHTML = '';
            }
            
            // Restore main content and reload
            mainContentSections.forEach(section => section.classList.remove('hidden'));
            loadInitialContent();
        }
    });
}


// --- Media Details & Comments Event Listeners ---
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

// --- Media Details Modal Function (with Robust Trailer Logic) ---
async function showMediaDetails(id, type) {
    const detailSection = document.getElementById('movie-detail-section');
    const searchResultsSection = document.getElementById('search-results-section');
    
    if (!detailSection) {
        console.error("Movie detail section not found. Please add <section id='movie-detail-section'> to your HTML.");
        return;
    }

    const detailContentContainer = detailSection.querySelector('#detail-content');

    // Show Loading State & Hide Main Content
    document.querySelectorAll('main section').forEach(section => section.classList.add('hidden'));

    detailSection.classList.remove('hidden');

    // Set initial loading state styles
    detailContentContainer.classList.add('flex', 'justify-center', 'items-center', 'h-full', 'p-8');
    detailContentContainer.classList.remove('overflow-y-auto', 'custom-scrollbar');
    detailContentContainer.innerHTML = `
        <div class="text-center">
            <p class="text-lg text-red-500 mb-4">Loading details...</p>
            <div class="w-12 h-12 border-4 border-t-4 border-red-500 border-opacity-25 rounded-full animate-spin"></div>
        </div>
    `;

    try {
        const mediaDetails = await fetchMedia(`/${type}/${id}`);
        const videos = await fetchMedia(`/${type}/${id}/videos`);

        // --- ROBUST TRAILER SEARCH LOGIC (FIXED) ---
        let trailer = null;
        if (videos.results) {
            // 1. Search for a YouTube video of type 'Trailer' first.
            trailer = videos.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');

            // 2. If no 'Trailer' is found, try finding a reliable 'Teaser' or 'Clip'.
            if (!trailer) {
                trailer = videos.results.find(video => 
                    (video.type === 'Teaser' || video.type === 'Clip') && video.site === 'YouTube'
                );
            }
            
            // 3. If still nothing, just grab the first YouTube video available.
            if (!trailer && videos.results.length > 0) {
                trailer = videos.results.find(video => video.site === 'YouTube');
            }
        }
        const trailerEmbedUrl = trailer ? `https://www.youtube.com/embed/${trailer.key}` : '';
        // --- END ROBUST TRAILER SEARCH LOGIC ---

        let seasonsHtml = '';
        if (type === 'tv' && mediaDetails.seasons && mediaDetails.seasons.length > 0) {
            seasonsHtml = `
                <h3 class="text-2xl font-bold mt-8 mb-4">Seasons & Episodes</h3>
                <div class="flex flex-col gap-4">
            `;
            mediaDetails.seasons.forEach(season => {
                if (season.season_number === 0 && season.episode_count === 0) return; 

                const seasonPoster = season.poster_path ? `${IMAGE_BASE_URL}${season.poster_path}` : 'https://via.placeholder.com/100x150?text=No+Poster';

                seasonsHtml += `
                    <div class="bg-gray-700 p-4 rounded-lg shadow-md cursor-pointer toggle-season" 
                         data-season-number="${season.season_number}" data-tv-id="${id}">
                        <div class="flex items-center justify-between">
                             <div class="flex items-center gap-4">
                                <img src="${seasonPoster}" alt="${season.name}" class="w-16 h-24 object-cover rounded-md flex-shrink-0">
                                <div>
                                    <h4 class="text-xl font-semibold">${season.name} (${season.episode_count || 'N/A'} Episodes)</h4>
                                    <p class="text-sm text-gray-400">${season.air_date ? new Date(season.air_date).getFullYear() : 'N/A'}</p>
                                </div>
                             </div>
                            <span class="text-2xl font-bold toggle-icon">+</span>
                        </div>
                        <div class="season-episodes hidden mt-4 pl-4 border-l border-gray-600 text-sm">
                            <p class="text-gray-400">Click to load episodes...</p>
                        </div>
                    </div>
                `;
            });
            seasonsHtml += `</div>`;
        }

        const comments = getCommentsForMedia(id);

        // --- Generate Detail Content HTML ---
        const detailContentHtml = `
            <div class="flex flex-col md:flex-row gap-8 items-start mb-8">
                <img src="${mediaDetails.poster_path ? `${IMAGE_BASE_URL}${mediaDetails.poster_path}` : "https://via.placeholder.com/200x300?text=No+Image"}"
                     alt="${mediaDetails.title || mediaDetails.name}"
                     class="w-full md:w-64 h-auto object-cover rounded-lg shadow-lg flex-shrink-0">
                <div class="flex-grow">
                    <h2 class="text-4xl font-bold mb-4">${mediaDetails.title || mediaDetails.name}</h2>
                    <p class="text-gray-300 text-lg mb-4">${mediaDetails.overview || 'No overview available.'}</p>
                    <p class="text-md text-gray-400 mb-2"><strong>Release Date:</strong> ${mediaDetails.release_date || mediaDetails.first_air_date || 'N/A'}</p>
                    <p class="text-md text-gray-400 mb-4"><strong>Rating:</strong> ${mediaDetails.vote_average ? mediaDetails.vote_average.toFixed(1) : 'N/A'} / 10 (${mediaDetails.vote_count || 0} votes)</p>
                    <p class="text-md text-gray-400 mb-4"><strong>Genres:</strong> ${mediaDetails.genres ? mediaDetails.genres.map(g => g.name).join(', ') : 'N/A'}</p>
                    ${type === 'tv' ? `<p class="text-md text-gray-400 mb-4"><strong>Number of Seasons:</strong> ${mediaDetails.number_of_seasons || 'N/A'}</p>` : ''}

                   ${trailer ? `
    <h3 class="text-2xl font-bold mt-6 mb-4">Trailer</h3>
    <a href="https://www.youtube.com/watch?v=${trailer.key}" 
       target="_blank" 
       rel="noopener noreferrer"
       class="inline-flex items-center bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition">
        Watch Trailer on YouTube
    </a>
` : `
    <p class="text-gray-500 mt-6">
        No trailer available on TMDb.
        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(mediaDetails.title || mediaDetails.name + ' trailer')}"
           target="_blank"
           class="text-red-500 underline ml-1">
           Search on YouTube
        </a>
    </p>
`}

                </div>
            </div>

            ${seasonsHtml}

            <h3 class="text-2xl font-bold mt-8 mb-4">Comments</h3>
            <div id="comments-section" class="mb-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                ${comments.length > 0 ? comments.map(comment => `<p class="bg-gray-700 p-3 rounded-md mb-2">${comment}</p>`).join('') : '<p class="text-gray-500">No comments yet. Be the first to comment!</p>'}
            </div>
            <textarea id="comment-input" class="w-full bg-gray-700 text-white rounded-md p-3 mb-2 focus:outline-none focus:ring-2 focus:ring-red-500" rows="3" placeholder="Add a comment..."></textarea>
            <button id="add-comment-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md">Add Comment</button>
        `;

        // Apply Correct Display Styles and Content
        detailContentContainer.classList.remove('flex', 'justify-center', 'items-center', 'h-full');
        detailContentContainer.classList.add('overflow-y-auto', 'custom-scrollbar');
        detailContentContainer.innerHTML = detailContentHtml;

        // --- Attach Dynamic Event Listeners ---
        
        // 1. Season Toggles (Only for TV)
        if (type === 'tv') {
            document.querySelectorAll('.toggle-season').forEach(seasonDiv => {
                seasonDiv.addEventListener('click', async (e) => {
                    if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
                    
                    const targetDiv = e.currentTarget;
                    const episodesContainer = targetDiv.querySelector('.season-episodes');
                    const seasonNumber = targetDiv.dataset.seasonNumber;
                    const tvId = targetDiv.dataset.tvId;
                    const toggleIcon = targetDiv.querySelector('.toggle-icon');

                    if (episodesContainer.classList.contains('hidden')) {
                        // Load episodes only once
                        if (!episodesContainer.dataset.loaded) {
                            episodesContainer.innerHTML = `<p class="text-red-500">Loading episodes...</p>`;
                            const episodesData = await fetchMedia(`/${type}/${tvId}/season/${seasonNumber}`);
                            
                            if (episodesData && episodesData.episodes && episodesData.episodes.length > 0) {
                                episodesContainer.innerHTML = episodesData.episodes.map(episode => `
                                    <div class="flex items-start gap-2 mb-3 p-3 bg-gray-600 rounded-md">
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
                        toggleIcon.textContent = '−';
                    } else {
                        episodesContainer.classList.add('hidden');
                        toggleIcon.textContent = '+';
                    }
                });
            });
        }
        
        // 2. Close Button
        document.getElementById('close-detail-btn').addEventListener('click', () => {
            detailSection.classList.add('hidden');
            detailContentContainer.classList.remove('overflow-y-auto', 'custom-scrollbar');
            
            if (isSearching && searchResultsSection) {
                searchResultsSection.classList.remove('hidden');
            } else {
                document.querySelectorAll('main section').forEach(section => section.classList.remove('hidden'));
                loadInitialContent();
            }
        });
        
        // 3. Add Comment Button
        document.getElementById('add-comment-btn').addEventListener('click', () => {
            const commentInput = document.getElementById('comment-input');
            const commentText = commentInput.value.trim();
            if (commentText) {
                addCommentToMedia(id, commentText);
                commentInput.value = '';
                showMediaDetails(id, type); 
            }
        });

    } catch (error) {
        console.error("Error fetching media details:", error);
        detailContentContainer.classList.remove('flex', 'justify-center', 'items-center', 'h-full');
        detailContentContainer.innerHTML = `<p class="text-center text-red-500">Failed to load media details.</p>`;
        
        document.getElementById('close-detail-btn').addEventListener('click', () => {
             detailSection.classList.add('hidden');
             loadInitialContent();
        });
    }
}

// --- Comments using Local Storage (Crucial missing functions) ---
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
    // Only execute browser-specific functions when window object is defined
    if (typeof window !== 'undefined') {
        loadInitialContent();
        highlightActiveNav();
    }
});