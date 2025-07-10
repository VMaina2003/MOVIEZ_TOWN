const API_KEY = ""; 
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const ORIGINAL_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"; 

// Function to fetch data from TMDb
async function fetchMedia(endpoint) {
    try {
        const response = await fetch( `${BASE_URL}${endpoint}?api_key=${API_KEY}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.results || data; 
    } 
    catch (error) {
        console.error("Error fetching data:", error);
        return []; 
    }
}


// Function to create a movie/TV show card HTML
function createMediaCard(media) {
    const posterPath = media.poster_path ? `${IMAGE_BASE_URL}${media.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image';
    const title = media.title || media.name; // 'title' for movies, 'name' for TV shows
    const voteAverage = media.vote_average ? media.vote_average.toFixed(1) : 'N/A'; // Shows the rating like 8.5 / 10 If no rating, it shows 'N/A'.
    const mediaType = media.media_type || (window.location.pathname.includes('series.html') || window.location.pathname.includes('tvshows.html') ? 'tv' : 'movie');

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
        container.innerHTML = ''; // removes previous content (so it doesn't stack new results on top).
        // Loops through each movie or TV show object in the list Calls createMediaCard() to get the HTML Appends it to the container's innerHTML
        mediaItems.forEach(item => {
            container.innerHTML += createMediaCard(item);
        });
    }
}