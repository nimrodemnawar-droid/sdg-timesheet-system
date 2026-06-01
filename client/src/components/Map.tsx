/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - “map-attached” → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - “standalone” → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - “data-only” → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

// Debug logging
if (!API_KEY) {
  console.warn("Warning: VITE_FRONTEND_FORGE_API_KEY is not set");
}
if (!FORGE_BASE_URL) {
  console.warn("Warning: VITE_FRONTEND_FORGE_API_URL is not set");
}

function loadMapScript() {
  return new Promise((resolve, reject) => {
    // Check if Google Maps API is already loaded
    if (window.google?.maps) {
      resolve(null);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      `script[src*="maps/api/js"]`
    );
    if (existingScript) {
      // Wait for existing script to load
      let attempts = 0;
      const checkGoogle = () => {
        if (window.google?.maps) {
          resolve(null);
        } else if (attempts < 50) {
          attempts++;
          setTimeout(checkGoogle, 100);
        } else {
          reject(new Error("Timeout waiting for Google Maps to load"));
        }
      };
      checkGoogle();
      return;
    }

    // Validate API key and URL
    if (!API_KEY) {
      console.error("Google Maps API key is not configured");
      reject(new Error("Missing API key"));
      return;
    }

    const script = document.createElement("script");
    const scriptSrc = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
    
    console.log("Loading Google Maps from:", scriptSrc);
    
    script.src = scriptSrc;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    
    script.onload = () => {
      console.log("Google Maps script loaded successfully");
      if (window.google?.maps) {
        resolve(null);
      } else {
        // Script loaded but google.maps not available
        setTimeout(() => {
          if (window.google?.maps) {
            resolve(null);
          } else {
            reject(new Error("Google Maps API not available after script load"));
          }
        }, 500);
      }
    };
    
    script.onerror = (event) => {
      console.error("Failed to load Google Maps script", event);
      reject(new Error("Failed to load Google Maps script"));
    };
    
    document.head.appendChild(script);
  });
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);

  const init = usePersistFn(async () => {
    // Only initialize if container exists and is visible
    if (!mapContainer.current) {
      return;
    }
    
    // Check if container is actually in the DOM
    if (!document.body.contains(mapContainer.current)) {
      return;
    }
    
    try {
      await loadMapScript();
      if (!mapContainer.current) {
        return;
      }
      
      // Verify google.maps is available
      if (!window.google?.maps) {
        console.error("Google Maps API is not available");
        if (mapContainer.current) {
          mapContainer.current.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666; font-family: sans-serif;">Failed to load Google Maps. Please refresh the page.</div>';
        }
        return;
      }
      
      map.current = new window.google.maps.Map(mapContainer.current, {
        zoom: initialZoom,
        center: initialCenter,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: true,
        mapId: "DEMO_MAP_ID",
      });
      if (onMapReady) {
        onMapReady(map.current);
      }
    } catch (error) {
      console.error("Error initializing map:", error);
      if (mapContainer.current) {
        mapContainer.current.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666; font-family: sans-serif;">Map failed to load. Please check your connection and refresh.</div>';
      }
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />
  );
}
