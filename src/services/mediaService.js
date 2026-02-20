/**
 * Media Service - Helper for getting presigned URLs from S3 keys
 * 
 * This service provides a unified way to get presigned URLs for S3 objects
 * stored in MongoDB. It uses the /api/media/presigned-url endpoint.
 */

import api from './api';

/**
 * Get presigned URL for an S3 object
 * @param {string} key - S3 object key (e.g., "uploads/testimonials/123.jpg")
 * @param {number} expiresIn - Expiration time in seconds (default: 86400 = 1 day, max: 604800 = 7 days)
 * @returns {Promise<string|null>} Presigned URL or null if key is invalid
 */
export const getPresignedUrl = async (key, expiresIn = 86400) => {
  if (!key || typeof key !== 'string') {
    return null;
  }
  
  try {
    const response = await api.get(`/media/presigned-url?key=${encodeURIComponent(key)}&expiresIn=${expiresIn}`);
    
    if (response.data?.success && response.data?.data?.presignedUrl) {
      return response.data.data.presignedUrl;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting presigned URL:', error);
    return null;
  }
};

/**
 * Get presigned URL from S3 URL or key
 * Handles both S3 URLs and keys
 * @param {string} urlOrKey - S3 URL or key
 * @param {number} expiresIn - Expiration time in seconds
 * @returns {Promise<string|null>} Presigned URL or original URL if extraction fails
 */
export const getPresignedUrlFromUrl = async (urlOrKey, expiresIn = 86400) => {
  if (!urlOrKey) {
    return null;
  }
  
  // If it's already a presigned URL (contains X-Amz-Algorithm), return as-is
  if (urlOrKey.includes('X-Amz-Algorithm')) {
    return urlOrKey;
  }
  
  // Extract key from URL if needed
  let key = urlOrKey;
  if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
    try {
      const url = new URL(urlOrKey);
      key = url.pathname.substring(1); // Remove leading slash
    } catch (error) {
      // If URL parsing fails, try to extract manually
      const match = urlOrKey.match(/s3[.-]([^.]+)\.amazonaws\.com\/(.+)$/);
      if (match && match[2]) {
        key = decodeURIComponent(match[2]);
      } else {
        // If we can't extract key, return original URL
        return urlOrKey;
      }
    }
  }
  
  // Get presigned URL using the key
  const presignedUrl = await getPresignedUrl(key, expiresIn);
  
  // Fallback to original URL if presigned URL generation fails
  return presignedUrl || urlOrKey;
};

/**
 * Get presigned URLs for multiple keys/URLs
 * @param {Array<string>} keysOrUrls - Array of S3 keys or URLs
 * @param {number} expiresIn - Expiration time in seconds
 * @returns {Promise<Array<string>>} Array of presigned URLs
 */
export const getPresignedUrls = async (keysOrUrls, expiresIn = 86400) => {
  if (!Array.isArray(keysOrUrls)) {
    return [];
  }
  
  const promises = keysOrUrls.map(item => getPresignedUrlFromUrl(item, expiresIn));
  return Promise.all(promises);
};

export default {
  getPresignedUrl,
  getPresignedUrlFromUrl,
  getPresignedUrls
};
