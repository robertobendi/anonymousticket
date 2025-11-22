/**
 * Transport API service for Swiss public transport data
 * Uses the free transport.opendata.ch API
 */

const API_BASE_URL = 'https://transport.opendata.ch/v1';

/**
 * Search for stations by query string
 * @param {string} query - Station name to search for
 * @returns {Promise<Array>} Array of station objects
 */
export async function searchStations(query) {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/locations?query=${encodeURIComponent(query)}&type=station`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.stations || [];
  } catch (error) {
    console.error('Error searching stations:', error);
    return [];
  }
}

/**
 * Get connections between two stations
 * @param {string} from - Origin station name
 * @param {string} to - Destination station name
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:MM format (optional)
 * @param {boolean} isArrivalTime - If true, time is arrival time (default: false, departure time)
 * @returns {Promise<Object>} Connections data
 */
export async function getConnections(from, to, date, time = null, isArrivalTime = false) {
  try {
    const params = new URLSearchParams({
      from: from,
      to: to,
      date: date,
    });

    if (time) {
      params.append('time', time);
      if (isArrivalTime) {
        params.append('isArrivalTime', '1');
      }
    }

    const response = await fetch(`${API_BASE_URL}/connections?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching connections:', error);
    throw error;
  }
}

/**
 * Transform API connection to our UI format
 * @param {Object} connection - Connection object from API
 * @param {number} index - Index for unique ID
 * @returns {Object} Transformed connection object
 */
export function transformConnection(connection, index) {
  const from = connection.from;
  const to = connection.to;
  
  // Calculate duration
  const depTime = new Date(from.departure);
  const arrTime = new Date(to.arrival);
  const durationMs = arrTime - depTime;
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
  const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const durationStr = durationHours > 0 
    ? `${durationHours}h ${durationMinutes}min`
    : `${durationMinutes}min`;

  // Count changes (number of transfers)
  // A direct connection has 1 section, so changes = sections.length - 1
  let changes = 0;
  if (connection.sections && Array.isArray(connection.sections)) {
    // Filter out walking sections to count actual train changes
    const trainSections = connection.sections.filter(section => 
      section.journey && section.journey.category !== 'WALK'
    );
    changes = Math.max(0, trainSections.length - 1);
  }
  
  // Get train name from first section
  const firstSection = connection.sections?.[0];
  let trainName = 'Train';
  if (firstSection?.journey) {
    if (firstSection.journey.name) {
      trainName = firstSection.journey.name;
    } else if (firstSection.journey.category) {
      trainName = firstSection.journey.category;
    }
  }

  // Format times
  const departure = formatTime(from.departure);
  const arrival = formatTime(to.arrival);

  return {
    id: index + 1,
    departure,
    arrival,
    duration: durationStr,
    price: null, // Transport API doesn't provide prices
    train: trainName,
    changes,
    connection: connection, // Keep full connection data for details
  };
}

/**
 * Format ISO date string to HH:MM time format
 * @param {string} isoString - ISO date string
 * @returns {string} Time in HH:MM format
 */
function formatTime(isoString) {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get popular Swiss stations for dropdown
 * @returns {Array} Array of station names
 */
export function getPopularStations() {
  return [
    'Zürich HB',
    'Bern',
    'Basel SBB',
    'Genève',
    'Lausanne',
    'Luzern',
    'St. Gallen',
    'Winterthur',
    'Biel/Bienne',
    'Thun',
    'Zug',
    'Schaffhausen',
    'Chur',
    'Interlaken Ost',
    'Montreux',
  ];
}

