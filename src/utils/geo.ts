// Columbia, Maryland Geolocation Utilities
// Determines residency and distance from Columbia, MD

// Columbia, MD ZIP codes
const COLUMBIA_ZIPS = ['21044', '21045', '21046'];

// Columbia, MD approximate center (latitude, longitude)
const COLUMBIA_CENTER = { lat: 39.2037, lng: -76.8610 };

// Columbia, MD boundary polygon (approximate convex hull)
// Based on actual geographic boundaries of Columbia, MD
const COLUMBIA_BOUNDARY: { lat: number; lng: number }[] = [
  { lat: 39.2420, lng: -76.8950 }, // NW corner
  { lat: 39.2450, lng: -76.8700 }, // N
  { lat: 39.2400, lng: -76.8400 }, // NE corner
  { lat: 39.2300, lng: -76.8250 }, // E upper
  { lat: 39.2100, lng: -76.8150 }, // E
  { lat: 39.1900, lng: -76.8200 }, // SE corner
  { lat: 39.1780, lng: -76.8350 }, // S
  { lat: 39.1750, lng: -76.8550 }, // SW corner
  { lat: 39.1800, lng: -76.8800 }, // W lower
  { lat: 39.1950, lng: -76.8950 }, // W
  { lat: 39.2150, lng: -76.9050 }, // W upper
  { lat: 39.2300, lng: -76.9000 }, // NW
];

// Known Maryland city/town approximate coordinates for distance calculation
const MD_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  // Columbia and immediate area
  'columbia': { lat: 39.2037, lng: -76.8610 },
  'ellicott city': { lat: 39.2674, lng: -76.7983 },
  'elkridge': { lat: 39.2126, lng: -76.7136 },
  'laurel': { lat: 39.0993, lng: -76.8483 },
  'savage': { lat: 39.1379, lng: -76.8236 },
  'jessup': { lat: 39.1462, lng: -76.7753 },
  'hanover': { lat: 39.1929, lng: -76.7244 },
  'clarksville': { lat: 39.2070, lng: -76.9397 },
  'dayton': { lat: 39.2420, lng: -76.9640 },
  'fulton': { lat: 39.1520, lng: -76.9230 },
  'highland': { lat: 39.1751, lng: -76.9569 },
  'west friendship': { lat: 39.2847, lng: -76.9375 },
  
  // Baltimore area
  'baltimore': { lat: 39.2904, lng: -76.6122 },
  'towson': { lat: 39.4015, lng: -76.6019 },
  'catonsville': { lat: 39.2721, lng: -76.7319 },
  'dundalk': { lat: 39.2507, lng: -76.5205 },
  'essex': { lat: 39.3093, lng: -76.4746 },
  'parkville': { lat: 39.3771, lng: -76.5397 },
  'perry hall': { lat: 39.4126, lng: -76.4636 },
  'owings mills': { lat: 39.4197, lng: -76.7708 },
  'pikesville': { lat: 39.3743, lng: -76.7225 },
  'glen burnie': { lat: 39.1626, lng: -76.6247 },
  'linthicum': { lat: 39.2054, lng: -76.6594 },
  'arbutus': { lat: 39.2365, lng: -76.6922 },
  'halethorpe': { lat: 39.2268, lng: -76.6836 },
  'rosedale': { lat: 39.3204, lng: -76.5155 },
  'middle river': { lat: 39.3382, lng: -76.4394 },
  'randallstown': { lat: 39.3676, lng: -76.7953 },
  'reisterstown': { lat: 39.4693, lng: -76.8294 },
  'cockeysville': { lat: 39.4790, lng: -76.6438 },
  'timonium': { lat: 39.4370, lng: -76.6197 },
  'lutherville': { lat: 39.4215, lng: -76.6264 },
  
  // DC area / southern MD
  'washington': { lat: 38.9072, lng: -77.0369 },
  'silver spring': { lat: 38.9907, lng: -77.0261 },
  'bethesda': { lat: 38.9847, lng: -77.0947 },
  'rockville': { lat: 39.0840, lng: -77.1528 },
  'gaithersburg': { lat: 39.1434, lng: -77.2014 },
  'germantown': { lat: 39.1732, lng: -77.2717 },
  'bowie': { lat: 38.9428, lng: -76.7302 },
  'college park': { lat: 38.9807, lng: -76.9370 },
  'greenbelt': { lat: 38.9954, lng: -76.8828 },
  'hyattsville': { lat: 38.9559, lng: -76.9453 },
  'lanham': { lat: 38.9687, lng: -76.8633 },
  'largo': { lat: 38.8976, lng: -76.8303 },
  'upper marlboro': { lat: 38.8156, lng: -76.7497 },
  
  // Annapolis / Anne Arundel
  'annapolis': { lat: 38.9784, lng: -76.4922 },
  'severna park': { lat: 39.0704, lng: -76.5683 },
  'severn': { lat: 39.1371, lng: -76.6983 },
  'odenton': { lat: 39.0840, lng: -76.7000 },
  'crofton': { lat: 39.0018, lng: -76.6872 },
  'gambrills': { lat: 39.0679, lng: -76.6653 },
  'millersville': { lat: 39.0573, lng: -76.6392 },
  'pasadena': { lat: 39.1076, lng: -76.5711 },
  'arnold': { lat: 39.0329, lng: -76.5025 },
  
  // Frederick area
  'frederick': { lat: 39.4143, lng: -77.4105 },
  'mount airy': { lat: 39.3762, lng: -77.1547 },
  'new market': { lat: 39.3901, lng: -77.2767 },
  'sykesville': { lat: 39.3735, lng: -76.9678 },
  'eldersburg': { lat: 39.4039, lng: -76.9519 },
  'westminster': { lat: 39.5754, lng: -76.9958 },
  
  // Harford County
  'bel air': { lat: 39.5360, lng: -76.3483 },
  'aberdeen': { lat: 39.5093, lng: -76.1641 },
  'havre de grace': { lat: 39.5493, lng: -76.0919 },
  'edgewood': { lat: 39.4187, lng: -76.2944 },
  'joppa': { lat: 39.4365, lng: -76.3561 },
  
  // Other
  'columbia md': { lat: 39.2037, lng: -76.8610 },
  'olney': { lat: 39.1532, lng: -77.0668 },
  'burtonsville': { lat: 39.1113, lng: -76.9325 },
  'north laurel': { lat: 39.1337, lng: -76.8586 },
  'maple lawn': { lat: 39.1680, lng: -76.8886 },
  'kings contrivance': { lat: 39.1856, lng: -76.8433 },
  'dorsey': { lat: 39.1604, lng: -76.7853 },
  'scaggsville': { lat: 39.1446, lng: -76.8825 },
  'woodbine': { lat: 39.3340, lng: -77.0675 },
  'lisbon': { lat: 39.3273, lng: -77.0600 },
  'cooksville': { lat: 39.3273, lng: -76.9956 },
  'glenelg': { lat: 39.2718, lng: -76.9122 },
  'woodstock': { lat: 39.3308, lng: -76.8726 },
  'marriottsville': { lat: 39.2996, lng: -76.8986 },
};

// ZIP code approximate coordinates (Maryland focus)
const ZIP_COORDS: Record<string, { lat: number; lng: number }> = {
  // Columbia
  '21044': { lat: 39.2128, lng: -76.8812 },
  '21045': { lat: 39.2025, lng: -76.8331 },
  '21046': { lat: 39.1893, lng: -76.8553 },
  
  // Nearby Howard County
  '21042': { lat: 39.2674, lng: -76.7983 }, // Ellicott City
  '21043': { lat: 39.2501, lng: -76.7711 }, // Ellicott City
  '21075': { lat: 39.2126, lng: -76.7136 }, // Elkridge
  '21076': { lat: 39.1929, lng: -76.7244 }, // Hanover
  '21029': { lat: 39.2070, lng: -76.9397 }, // Clarksville
  '21036': { lat: 39.2420, lng: -76.9640 }, // Dayton
  '21104': { lat: 39.2996, lng: -76.8986 }, // Marriottsville
  '21163': { lat: 39.3308, lng: -76.8726 }, // Woodstock
  '21738': { lat: 39.2718, lng: -76.9122 }, // Glenelg
  '21797': { lat: 39.3340, lng: -77.0675 }, // Woodbine
  '21794': { lat: 39.3273, lng: -77.0600 }, // Lisbon
  
  // Laurel area
  '20707': { lat: 39.0993, lng: -76.8483 }, // Laurel
  '20708': { lat: 39.0760, lng: -76.8417 }, // Laurel
  '20723': { lat: 39.1337, lng: -76.8586 }, // North Laurel
  '20724': { lat: 39.0943, lng: -76.7000 }, // Laurel / Ft. Meade
  '20794': { lat: 39.1462, lng: -76.7753 }, // Jessup
  '20763': { lat: 39.1379, lng: -76.8236 }, // Savage
  
  // Baltimore area
  '21201': { lat: 39.2904, lng: -76.6177 },
  '21202': { lat: 39.2960, lng: -76.6005 },
  '21206': { lat: 39.3271, lng: -76.5397 },
  '21207': { lat: 39.3176, lng: -76.7225 },
  '21208': { lat: 39.3743, lng: -76.7225 },
  '21209': { lat: 39.3649, lng: -76.6686 },
  '21210': { lat: 39.3490, lng: -76.6397 },
  '21211': { lat: 39.3260, lng: -76.6397 },
  '21212': { lat: 39.3665, lng: -76.6122 },
  '21213': { lat: 39.3065, lng: -76.5794 },
  '21214': { lat: 39.3493, lng: -76.5622 },
  '21215': { lat: 39.3443, lng: -76.6833 },
  '21216': { lat: 39.3082, lng: -76.6622 },
  '21217': { lat: 39.3082, lng: -76.6394 },
  '21218': { lat: 39.3260, lng: -76.6028 },
  '21227': { lat: 39.2268, lng: -76.6836 }, // Halethorpe
  '21228': { lat: 39.2721, lng: -76.7319 }, // Catonsville
  '21229': { lat: 39.2718, lng: -76.6922 },
  '21230': { lat: 39.2632, lng: -76.6247 },
  '21234': { lat: 39.3771, lng: -76.5397 }, // Parkville
  '21236': { lat: 39.3382, lng: -76.4394 }, // Middle River
  '21237': { lat: 39.3204, lng: -76.5155 }, // Rosedale
  '21244': { lat: 39.3176, lng: -76.7869 }, // Windsor Mill
  
  // Glen Burnie / Severn
  '21060': { lat: 39.1626, lng: -76.6247 },
  '21061': { lat: 39.1526, lng: -76.6247 },
  '21144': { lat: 39.1371, lng: -76.6983 }, // Severn
  
  // Annapolis area
  '21401': { lat: 38.9784, lng: -76.4922 },
  '21403': { lat: 38.9584, lng: -76.4722 },
  '21108': { lat: 39.0573, lng: -76.6392 }, // Millersville
  '21113': { lat: 39.0840, lng: -76.7000 }, // Odenton
  '21114': { lat: 39.0018, lng: -76.6872 }, // Crofton
  '21012': { lat: 39.0329, lng: -76.5025 }, // Arnold
  '21122': { lat: 39.1076, lng: -76.5711 }, // Pasadena
  '21146': { lat: 39.0704, lng: -76.5683 }, // Severna Park
  
  // DC suburbs
  '20901': { lat: 38.9907, lng: -77.0261 }, // Silver Spring
  '20814': { lat: 38.9847, lng: -77.0947 }, // Bethesda
  '20850': { lat: 39.0840, lng: -77.1528 }, // Rockville
  '20877': { lat: 39.1434, lng: -77.2014 }, // Gaithersburg
  '20874': { lat: 39.1732, lng: -77.2717 }, // Germantown
  '20720': { lat: 38.9428, lng: -76.7302 }, // Bowie
  '20740': { lat: 38.9807, lng: -76.9370 }, // College Park
  '20770': { lat: 38.9954, lng: -76.8828 }, // Greenbelt
  '20783': { lat: 38.9559, lng: -76.9453 }, // Hyattsville
  
  // Frederick
  '21701': { lat: 39.4143, lng: -77.4105 },
  '21771': { lat: 39.3762, lng: -77.1547 }, // Mount Airy
  '21784': { lat: 39.3735, lng: -76.9678 }, // Sykesville
  '21157': { lat: 39.5754, lng: -76.9958 }, // Westminster
  '21048': { lat: 39.4039, lng: -76.9519 }, // Eldersburg
  
  // Harford
  '21014': { lat: 39.5360, lng: -76.3483 }, // Bel Air
  '21001': { lat: 39.5093, lng: -76.1641 }, // Aberdeen
  '21078': { lat: 39.5493, lng: -76.0919 }, // Havre de Grace
  '21040': { lat: 39.4187, lng: -76.2944 }, // Edgewood
};

// Extract ZIP code from an address string
function extractZip(address: string): string | null {
  const zipMatch = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return zipMatch ? zipMatch[1] : null;
}

// Extract city name from an address string
function extractCity(address: string): string | null {
  const lower = address.toLowerCase().trim();
  
  // Try to find a known city in the address
  // Sort by length descending so "ellicott city" matches before "city"
  const knownCities = Object.keys(MD_CITY_COORDS).sort((a, b) => b.length - a.length);
  for (const city of knownCities) {
    if (lower.includes(city)) {
      return city;
    }
  }
  
  // Try to parse city from "Street, City, State ZIP" format
  const parts = address.split(',').map(p => p.trim().toLowerCase());
  if (parts.length >= 2) {
    // City is usually the second-to-last part, or second part
    for (let i = 1; i < parts.length; i++) {
      const cityCandidate = parts[i].replace(/\b(md|maryland)\b/gi, '').replace(/\d{5}/g, '').trim();
      if (cityCandidate && MD_CITY_COORDS[cityCandidate]) {
        return cityCandidate;
      }
    }
  }
  
  return null;
}

// Check if a point is inside the Columbia boundary polygon (ray casting algorithm)
function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: { lat: number; lng: number }[]
): boolean {
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    
    const intersect = ((yi > point.lng) !== (yj > point.lng)) &&
      (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

// Calculate distance from a point to the nearest edge of the Columbia boundary (in miles)
function distanceToPolygonBorder(
  point: { lat: number; lng: number },
  polygon: { lat: number; lng: number }[]
): number {
  let minDist = Infinity;
  const n = polygon.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dist = distanceToSegment(point, polygon[i], polygon[j]);
    if (dist < minDist) minDist = dist;
  }
  
  return minDist;
}

// Distance from point to a line segment (in miles using Haversine)
function distanceToSegment(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dx = b.lat - a.lat;
  const dy = b.lng - a.lng;
  
  if (dx === 0 && dy === 0) {
    return haversineDistance(p, a);
  }
  
  let t = ((p.lat - a.lat) * dx + (p.lng - a.lng) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  
  const closest = {
    lat: a.lat + t * dx,
    lng: a.lng + t * dy
  };
  
  return haversineDistance(p, closest);
}

// Haversine distance between two lat/lng points in miles
function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRad(deg: number): number {
  return deg * Math.PI / 180;
}

// Get approximate coordinates for an address
function geocodeAddress(address: string): { lat: number; lng: number } | null {
  // Try ZIP code first
  const zip = extractZip(address);
  if (zip && ZIP_COORDS[zip]) {
    return ZIP_COORDS[zip];
  }
  
  // Try city name matching
  const city = extractCity(address);
  if (city && MD_CITY_COORDS[city]) {
    return MD_CITY_COORDS[city];
  }
  
  // Check for Columbia-specific identifiers
  const lower = address.toLowerCase();
  if (lower.includes('columbia') && (lower.includes('md') || lower.includes('maryland') || lower.includes('21044') || lower.includes('21045') || lower.includes('21046'))) {
    return COLUMBIA_CENTER;
  }
  
  return null;
}

export interface ColumbiaAnalysis {
  isResident: boolean;      // true = in Columbia, MD
  residencyStatus: string;  // "Resident" or "Non-Resident"
  distanceFromBorder: number | null; // miles from Columbia border (null for residents, number for non-residents)
  confidence: 'high' | 'medium' | 'low'; // how confident we are in the classification
  geocoded: boolean;        // whether we could geocode the address
}

// Check if an address is in Columbia, MD
export function analyzeColumbia(address: string): ColumbiaAnalysis {
  if (!address || address.trim() === '') {
    return {
      isResident: false,
      residencyStatus: 'Unknown',
      distanceFromBorder: null,
      confidence: 'low',
      geocoded: false,
    };
  }
  
  const lower = address.toLowerCase().trim();
  
  // Quick check: Columbia ZIP codes
  const zip = extractZip(address);
  if (zip && COLUMBIA_ZIPS.includes(zip)) {
    return {
      isResident: true,
      residencyStatus: 'Resident',
      distanceFromBorder: 0,
      confidence: 'high',
      geocoded: true,
    };
  }
  
  // Quick check: Address explicitly mentions Columbia, MD
  if ((lower.includes('columbia') && (lower.includes('md') || lower.includes('maryland'))) ||
      (lower.includes('columbia,') && !lower.includes('columbia, sc') && !lower.includes('columbia, mo'))) {
    return {
      isResident: true,
      residencyStatus: 'Resident',
      distanceFromBorder: 0,
      confidence: 'high',
      geocoded: true,
    };
  }
  
  // Try to geocode
  const coords = geocodeAddress(address);
  if (!coords) {
    // Can't geocode - try heuristics
    // If the address mentions MD but not Columbia, it's likely non-resident
    if (lower.includes('md') || lower.includes('maryland')) {
      return {
        isResident: false,
        residencyStatus: 'Non-Resident',
        distanceFromBorder: null,
        confidence: 'low',
        geocoded: false,
      };
    }
    return {
      isResident: false,
      residencyStatus: 'Unknown',
      distanceFromBorder: null,
      confidence: 'low',
      geocoded: false,
    };
  }
  
  // Check if coordinates fall inside Columbia boundary
  const inColumbia = isPointInPolygon(coords, COLUMBIA_BOUNDARY);
  
  if (inColumbia) {
    return {
      isResident: true,
      residencyStatus: 'Resident',
      distanceFromBorder: 0,
      confidence: 'high',
      geocoded: true,
    };
  }
  
  // Calculate distance from Columbia border
  const distance = distanceToPolygonBorder(coords, COLUMBIA_BOUNDARY);
  
  return {
    isResident: false,
    residencyStatus: 'Non-Resident',
    distanceFromBorder: Math.round(distance * 10) / 10, // round to 1 decimal
    confidence: 'high',
    geocoded: true,
  };
}

// Process an array of records and add Columbia analysis columns
export function enrichWithColumbiaData(
  data: Record<string, string>[],
  addressField: string
): Record<string, string>[] {
  return data.map(row => {
    const address = row[addressField] || '';
    const analysis = analyzeColumbia(address);
    
    return {
      ...row,
      columbia_resident: analysis.isResident ? 'yes' : 'no',
      distance_from_columbia_mi: analysis.distanceFromBorder !== null 
        ? String(analysis.distanceFromBorder) 
        : (analysis.isResident ? '0' : ''),
    };
  });
}

// Detect which field is likely the address field
export function detectAddressField(headers: string[]): string | null {
  const addressPatterns = [
    /^address$/i,
    /^street[_\s]?address$/i,
    /^mailing[_\s]?address$/i,
    /^home[_\s]?address$/i,
    /^full[_\s]?address$/i,
    /address/i,
    /^street$/i,
    /^location$/i,
  ];
  
  for (const pattern of addressPatterns) {
    const match = headers.find(h => pattern.test(h));
    if (match) return match;
  }
  
  return null;
}

// Get summary statistics about Columbia residency for a dataset
export interface ColumbiaSummary {
  total: number;
  residents: number;
  nonResidents: number;
  unknown: number;
  geocodedCount: number;
  avgDistance: number | null; // average distance for non-residents
  minDistance: number | null;
  maxDistance: number | null;
  distanceBuckets: { label: string; count: number }[];
}

export function getColumbiaSummary(data: Record<string, string>[], addressField: string): ColumbiaSummary {
  let residents = 0;
  let nonResidents = 0;
  let unknown = 0;
  let geocodedCount = 0;
  const distances: number[] = [];
  
  for (const row of data) {
    const analysis = analyzeColumbia(row[addressField] || '');
    if (analysis.geocoded) geocodedCount++;
    
    if (analysis.residencyStatus === 'Resident') {
      residents++;
    } else if (analysis.residencyStatus === 'Non-Resident') {
      nonResidents++;
      if (analysis.distanceFromBorder !== null) {
        distances.push(analysis.distanceFromBorder);
      }
    } else {
      unknown++;
    }
  }
  
  const avgDistance = distances.length > 0 
    ? Math.round((distances.reduce((a, b) => a + b, 0) / distances.length) * 10) / 10 
    : null;
  
  // Create distance buckets
  const buckets = [
    { label: '0-5 mi', count: 0 },
    { label: '5-10 mi', count: 0 },
    { label: '10-20 mi', count: 0 },
    { label: '20-30 mi', count: 0 },
    { label: '30+ mi', count: 0 },
  ];
  
  for (const d of distances) {
    if (d <= 5) buckets[0].count++;
    else if (d <= 10) buckets[1].count++;
    else if (d <= 20) buckets[2].count++;
    else if (d <= 30) buckets[3].count++;
    else buckets[4].count++;
  }
  
  return {
    total: data.length,
    residents,
    nonResidents,
    unknown,
    geocodedCount,
    avgDistance,
    minDistance: distances.length > 0 ? Math.min(...distances) : null,
    maxDistance: distances.length > 0 ? Math.max(...distances) : null,
    distanceBuckets: buckets,
  };
}
