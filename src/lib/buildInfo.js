/**
 * Build information utility
 * Reads build info from the public/build-info.json file generated during build
 */

let buildInfo = null;

/**
 * Loads build information from the build-info.json file
 * @returns {Promise<{buildNumber: number, buildDate: string, buildDateFormatted: string} | null>}
 */
export const getBuildInfo = async () => {
  if (buildInfo !== null) {
    return buildInfo;
  }

  try {
    const response = await fetch('/build-info.json');
    if (response.ok) {
      buildInfo = await response.json();
      return buildInfo;
    }
  } catch (error) {
    console.warn('Failed to load build info:', error);
  }

  return null;
};

/**
 * Gets build number synchronously (returns cached value or null)
 * @returns {number | null}
 */
export const getBuildNumber = () => {
  return buildInfo?.buildNumber || null;
};

/**
 * Gets formatted build date synchronously (returns cached value or null)
 * @returns {string | null}
 */
export const getBuildDate = () => {
  return buildInfo?.buildDateFormatted || null;
};

/**
 * Formats build number for display
 * @param {number} buildNumber
 * @returns {string}
 */
export const formatBuildNumber = (buildNumber) => {
  if (!buildNumber) return 'N/A';
  // Simple incremental number
  return `#${buildNumber}`;
};

