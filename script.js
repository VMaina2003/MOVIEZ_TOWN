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
