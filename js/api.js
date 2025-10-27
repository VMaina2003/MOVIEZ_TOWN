/**
 * js/api.js
 *
 * TMDb API helpers (ES module)
 *
 * - Provides safeFetch with timeout + retry
 * - Simple rate limiter and in-memory TTL cache
 * - Core functions: fetchMedia, fetchDetails, searchMulti, fetchVideos, fetchSeasonDetails
 *
 * USAGE:
 *  import {
 *    fetchMedia,
 *    fetchDetails,
 *    searchMulti,
 *    fetchVideos,
 *    fetchSeasonDetails,
 *    getImageUrl,
 *    ORIGINAL_IMAGE_BASE_URL
 *  } from './api.js';
 *
 * SECURITY:
 * - Do NOT commit API_KEY to a public repo.
 * - Prefer using a server-side proxy in production.
 */

/* =====================
   CONFIGURATION
   ===================== */

/**
 * If you are using Vite or another bundler, set your env var as:
 * VITE_TMDB_API_KEY
 *
 * On Vercel you would set TMDB_API_KEY on the server and optionally create
 * an API route that proxies to TMDb.
 */
// --- Safe environment / fallback config ---
const RUNTIME_CONFIG = {
  /**
   * In case you're using a bundler like Vite, it will inject env vars
   * as import.meta.env.VITE_TMDB_API_KEY
   * For plain JS (like on Vercel static hosting), we’ll fallback to manual.
   */
  API_KEY:
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_TMDB_API_KEY) ||
    null,

  // Fallbacks (safe for local testing only — DO NOT COMMIT API KEYS PUBLICLY)
  FALLBACK_API_KEY: "d2aac7456bf07db40918764f9a7bddf1",

  // If you later add a backend route or serverless function to hide your API key
  USE_SERVER_PROXY: false,
  PROXY_BASE: "/api/tmdb",
};


const API_KEY = RUNTIME_CONFIG.API_KEY || RUNTIME_CONFIG.FALLBACK_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
const ORIGINAL_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

/* =====================
   UTILITY: URL builder
   ===================== */

/**
 * Build an endpoint path + query string safely
 * @param {string} path - endpoint path e.g. '/trending/movie/week'
 * @param {Object} params - additional query params
 * @returns {string}
 */
function buildEndpoint(path, params = {}) {
  const url = new URL(path, BASE_URL);
  // Do not attach the API key here if we are using a server proxy (proxy will attach)
  if (!RUNTIME_CONFIG.USE_SERVER_PROXY) {
    url.searchParams.set('api_key', API_KEY);
  }
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/* =====================
   UTILITY: Safe fetch with timeout + retries
   ===================== */

/**
 * safeFetch - fetch wrapper with timeout and exponential backoff retry
 * Prevents infinite retry loops by limiting maxAttempts.
 *
 * @param {string} url
 * @param {Object} options - fetch options
 * @param {number} timeoutMs - abort timeout
 * @param {number} maxAttempts
 */
async function safeFetch(url, options = {}, timeoutMs = 8000, maxAttempts = 3) {
  let attempt = 0;
  let lastErr;

  while (attempt < maxAttempts) {
    attempt += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // If we are using a server proxy, transform the client URL to proxy path
      let finalUrl = url;
      if (RUNTIME_CONFIG.USE_SERVER_PROXY) {
        // Expecting server accepts a "target" or original path
        // Example: GET /api/tmdb?path=/trending/movie/week&page=1
        // We'll pass the original URL as a "target" param (encoded)
        const proxyUrl = new URL(RUNTIME_CONFIG.PROXY_BASE, window.location.origin);
        proxyUrl.searchParams.set('target', url);
        finalUrl = proxyUrl.toString();
      }

      const response = await fetch(finalUrl, { ...options, signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        // For client errors (4xx) don't retry except possibly 429 (rate limit)
        if (response.status >= 500 || response.status === 429) {
          // transient — allow retry
          lastErr = new Error(`HTTP ${response.status}`);
          // If 429, we can optionally read Retry-After header and wait
          const retryAfter = response.headers.get('Retry-After');
          if (retryAfter) {
            const waitMs = Number(retryAfter) * 1000 || 1000;
            await new Promise(res => setTimeout(res, waitMs));
          } else {
            // small backoff
            await new Promise(res => setTimeout(res, 200 * attempt));
          }
          continue;
        } else {
          // permanent client error
          const text = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status} - ${text}`);
        }
      }

      // Parse JSON if possible
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      // If aborted or network error, do backoff and retry
      if (err.name === 'AbortError') {
        // timeout — retry with increased timeout next attempt
        await new Promise(res => setTimeout(res, 200 * attempt));
        continue;
      }
      // Other fetch errors: network down etc. Wait and retry up to maxAttempts
      await new Promise(res => setTimeout(res, 150 * attempt));
    }
  }

  // If we exhausted retries, throw the last recorded error
  throw lastErr || new Error('safeFetch failed');
}

/* =====================
   SIMPLE RATE LIMITER (token bucket)
   ===================== */

const RateLimiter = (function () {
  // tokens per second
  const refillRate = 4; // 4 tokens per second (tweak as needed)
  const capacity = 8;
  let tokens = capacity;
  let lastRefill = Date.now();

  function refill() {
    const now = Date.now();
    const elapsed = (now - lastRefill) / 1000;
    const add = elapsed * refillRate;
    if (add > 0) {
      tokens = Math.min(capacity, tokens + add);
      lastRefill = now;
    }
  }

  return {
    async removeToken() {
      refill();
      if (tokens >= 1) {
        tokens -= 1;
        return true;
      }
      // wait briefly for next token
      await new Promise(res => setTimeout(res, 250));
      refill();
      if (tokens >= 1) {
        tokens -= 1;
        return true;
      }
      return false;
    }
  };
})();

/* =====================
   SIMPLE IN-MEMORY TTL CACHE
   ===================== */

const cache = new Map();
/**
 * key: string
 * value: { ts: Number, ttl: Number, data: any }
 */
function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > (entry.ttl || 60_000)) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}
function cacheSet(key, data, ttl = 60_000) {
  cache.set(key, { ts: Date.now(), ttl, data });
}

/* =====================
   API FUNCTIONS
   ===================== */

/**
 * fetchMedia - generic fetcher for endpoints that return 'results' arrays
 * Examples:
 *  /trending/movie/week
 *  /movie/popular
 *
 * @param {string} endpointPath - path relative to BASE_URL (e.g. '/trending/movie/week')
 * @param {number} page
 * @param {Object} opts - { cacheTTL }
 * @returns {Promise<Array|Object>} - returns parsed JSON (data.results or data)
 */
export async function fetchMedia(endpointPath, page = 1, opts = {}) {
  const params = { page };
  const url = buildEndpoint(endpointPath, params);
  const cacheKey = `media:${endpointPath}?page=${page}`;

  // Return cached if available
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // Rate limit politely
  await RateLimiter.removeToken();

  const data = await safeFetch(url);
  // Many TMDb endpoints return { page, results, total_pages, total_results }
  cacheSet(cacheKey, data, opts.cacheTTL || 60_000);
  return data;
}

/**
 * fetchDetails - get movie or tv details
 * @param {'movie'|'tv'} type
 * @param {string|number} id
 */
export async function fetchDetails(type, id) {
  if (!type || !id) throw new Error('fetchDetails requires type and id');
  const url = buildEndpoint(`/${type}/${id}`, { append_to_response: 'credits' });
  const cacheKey = `details:${type}:${id}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  await RateLimiter.removeToken();
  const data = await safeFetch(url);
  cacheSet(cacheKey, data, 5 * 60 * 1000); // cache 5 minutes
  return data;
}

/**
 * fetchVideos - trailers and videos for an item
 * @param {'movie'|'tv'} type
 * @param {string|number} id
 */
export async function fetchVideos(type, id) {
  const url = buildEndpoint(`/${type}/${id}/videos`);
  const cacheKey = `videos:${type}:${id}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  await RateLimiter.removeToken();
  const data = await safeFetch(url);
  cacheSet(cacheKey, data, 60_000);
  return data;
}

/**
 * searchMulti - search across movies, tv, people
 * @param {string} query
 * @param {number} page
 */
export async function searchMulti(query, page = 1) {
  if (!query || query.trim().length === 0) return { results: [] };

  // TMDb endpoint: /search/multi
  const url = buildEndpoint('/search/multi', { query: query.trim(), page });
  const cacheKey = `search:multi:${query}:${page}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  await RateLimiter.removeToken();
  const data = await safeFetch(url);
  cacheSet(cacheKey, data, 30_000);
  return data;
}

/**
 * fetchSeasonDetails - TV season episodes
 * @param {number|string} tvId
 * @param {number|string} seasonNumber
 */
export async function fetchSeasonDetails(tvId, seasonNumber) {
  const url = buildEndpoint(`/tv/${tvId}/season/${seasonNumber}`);
  const cacheKey = `season:${tvId}:${seasonNumber}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  await RateLimiter.removeToken();
  const data = await safeFetch(url);
  cacheSet(cacheKey, data, 5 * 60 * 1000);
  return data;
}

/* =====================
   IMAGE HELPERS
   ===================== */

/**
 * getImageUrl - returns image url with size, or placeholder
 * sizes: 'w92','w154','w185','w342','w500','w780' or 'original'
 */
export function getImageUrl(path, size = 'w500') {
  if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
  if (size === 'original') return `${ORIGINAL_IMAGE_BASE_URL}${path}`;
  return `${IMAGE_BASE_URL}${size}${path}`;
}

export { ORIGINAL_IMAGE_BASE_URL };

/* =====================
   UTILITY: small helpers
   ===================== */

/**
 * normalizeResults - ensure returned object always has results array
 * Some calls return single object, some return { results: [...] }.
 */
export function normalizeResults(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  // Otherwise return single object inside array
  return [data];
}

/* =====================
   DEFAULT EXPORT (optional)
   ===================== */

export default {
  fetchMedia,
  fetchDetails,
  searchMulti,
  fetchVideos,
  fetchSeasonDetails,
  getImageUrl,
  normalizeResults
};
