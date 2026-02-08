import { useState, useEffect, useCallback } from "react";

const GOOGLE_MAPS_API_KEY = "AIzaSyBEZQ3dPHqho8u6nfKSVWlAVIXzG7Yawck";
const CACHE_KEY = "geocoding-cache";
const GEOCODE_DELAY = 100; // 100ms between requests to avoid rate limiting

interface GeocodingResult {
  lat: number;
  lng: number;
}

interface CacheEntry {
  lat: number;
  lng: number;
  timestamp: number;
}

type GeocodingCache = Record<string, CacheEntry>;

// Cache expiry: 30 days
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000;

function getCache(): GeocodingCache {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn("Failed to read geocoding cache:", e);
  }
  return {};
}

function setCache(cache: GeocodingCache): void {
  try {
    // Clean up expired entries
    const now = Date.now();
    const cleanedCache: GeocodingCache = {};
    for (const [key, value] of Object.entries(cache)) {
      if (now - value.timestamp < CACHE_EXPIRY) {
        cleanedCache[key] = value;
      }
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cleanedCache));
  } catch (e) {
    console.warn("Failed to save geocoding cache:", e);
  }
}

async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
    
    console.warn(`Geocoding failed for "${address}": ${data.status}`);
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

export interface ProposalLocation {
  id: string;
  number: string;
  clientName: string;
  stageName: string;
  total: number;
  address: string;
  lat?: number;
  lng?: number;
}

export function useGeocoding(proposals: ProposalLocation[]) {
  const [geocodedProposals, setGeocodedProposals] = useState<ProposalLocation[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [progress, setProgress] = useState({ geocoded: 0, total: 0 });

  const geocodeProposals = useCallback(async () => {
    if (!proposals.length) {
      setGeocodedProposals([]);
      return;
    }

    setIsGeocoding(true);
    const cache = getCache();
    const results: ProposalLocation[] = [];
    let geocodedCount = 0;
    const proposalsWithAddress = proposals.filter(p => p.address);
    
    setProgress({ geocoded: 0, total: proposalsWithAddress.length });

    for (const proposal of proposals) {
      if (!proposal.address) {
        results.push(proposal);
        continue;
      }

      // Check cache first
      const cacheKey = proposal.address.toLowerCase().trim();
      const cached = cache[cacheKey];
      
      if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
        results.push({
          ...proposal,
          lat: cached.lat,
          lng: cached.lng,
        });
        geocodedCount++;
        setProgress({ geocoded: geocodedCount, total: proposalsWithAddress.length });
        continue;
      }

      // Geocode the address
      const coords = await geocodeAddress(proposal.address);
      
      if (coords) {
        cache[cacheKey] = {
          ...coords,
          timestamp: Date.now(),
        };
        results.push({
          ...proposal,
          lat: coords.lat,
          lng: coords.lng,
        });
      } else {
        results.push(proposal);
      }
      
      geocodedCount++;
      setProgress({ geocoded: geocodedCount, total: proposalsWithAddress.length });

      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, GEOCODE_DELAY));
    }

    setCache(cache);
    setGeocodedProposals(results);
    setIsGeocoding(false);
  }, [proposals]);

  useEffect(() => {
    geocodeProposals();
  }, [geocodeProposals]);

  return {
    geocodedProposals,
    isGeocoding,
    progress,
  };
}
