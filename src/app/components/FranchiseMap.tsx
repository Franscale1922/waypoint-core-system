"use client";

import { useEffect, useState, useMemo } from "react";
import { CITY_COORDS, STATE_COORDS } from "../data/territoryCoords";

// Google Sheet published as CSV
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1nUQaiUoZ6yB67O5U2DgR07If1GBUf9vSGbFTJKLhlM4/export?format=csv";

// Albers USA projection
function albersProject(lat: number, lng: number): [number, number] {
  const toRad = Math.PI / 180;
  const phi1 = 29.5 * toRad;
  const phi2 = 45.5 * toRad;
  const phi0 = 37.5 * toRad;
  const lam0 = -96 * toRad;
  const phi = lat * toRad;
  const lam = lng * toRad;

  const n = 0.5 * (Math.sin(phi1) + Math.sin(phi2));
  const C = Math.cos(phi1) ** 2 + 2 * n * Math.sin(phi1);
  const rho0 = Math.sqrt(C - 2 * n * Math.sin(phi0)) / n;
  const rho = Math.sqrt(C - 2 * n * Math.sin(phi)) / n;
  const theta = n * (lam - lam0);

  const x = rho * Math.sin(theta);
  const y = rho0 - rho * Math.cos(theta);

  const scale = 1100;
  const translateX = 480;
  const translateY = 280;

  return [x * scale + translateX, -y * scale + translateY];
}

// Generate the US outline as a projected polygon from actual border coordinates
function generateUSOutlinePath(): string {
  // Continental US border points (lat, lng) — simplified outline
  const borderPoints: [number, number][] = [
    // Pacific Northwest
    [48.99, -124.7], [48.99, -123.0], [49.0, -117.0], [49.0, -116.05],
    [49.0, -104.05], [49.0, -97.2], [49.38, -95.15],
    // Northern border / Great Lakes
    [47.6, -95.0], [48.0, -91.5], [47.5, -89.5], [46.5, -85.0],
    [45.5, -84.0], [43.5, -82.5], [42.0, -83.0], [41.7, -82.5],
    [42.5, -79.8], [43.5, -79.0], [44.0, -76.5], [44.5, -75.0],
    [45.0, -74.7],
    // Northeast
    [45.0, -71.5], [47.3, -68.3], [47.35, -67.8],
    // Maine coast
    [44.8, -66.95], [43.5, -70.0], [42.0, -70.0], [41.3, -70.0],
    // New England / Mid-Atlantic coast
    [41.0, -72.0], [40.6, -73.7], [40.5, -74.0], [39.5, -74.3],
    [38.9, -74.9], [38.5, -75.1], [37.0, -75.5],
    // Southeast coast
    [36.5, -75.8], [35.2, -75.5], [34.2, -77.5], [33.7, -78.0],
    [32.0, -80.5], [31.0, -81.0], [30.3, -81.4],
    // Florida
    [27.8, -80.5], [25.5, -80.2], [24.5, -81.8], [25.0, -81.7],
    [26.0, -82.0], [28.0, -82.7], [29.0, -83.0], [29.8, -84.0],
    [30.0, -85.0], [30.3, -86.5], [30.2, -88.0],
    // Gulf Coast
    [30.3, -89.0], [29.3, -89.5], [29.0, -90.0], [29.5, -91.0],
    [29.6, -93.0], [29.8, -94.0],
    // Texas coast
    [29.3, -94.7], [28.5, -96.0], [27.5, -97.2], [26.1, -97.2],
    [25.84, -97.4],
    // Texas-Mexico border (Rio Grande)
    [26.4, -98.8], [27.5, -99.5], [29.5, -101.0], [29.8, -102.0],
    [30.5, -103.5], [31.8, -106.6],
    // Southern border
    [31.33, -108.2], [31.33, -111.1], [32.5, -114.8],
    // California coast
    [32.7, -117.2], [33.5, -118.0], [34.0, -118.5], [34.5, -120.5],
    [35.5, -121.0], [36.8, -122.0], [37.8, -122.5], [38.5, -123.0],
    [39.5, -123.8], [40.5, -124.3], [42.0, -124.3],
    // Oregon / Washington coast
    [43.0, -124.4], [46.0, -124.0], [46.3, -124.0], [48.2, -124.7],
    [48.99, -124.7],
  ];

  const projectedPoints = borderPoints.map(([lat, lng]) => albersProject(lat, lng));
  const path = projectedPoints
    .map((p, i) => (i === 0 ? `M ${p[0].toFixed(1)} ${p[1].toFixed(1)}` : `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`))
    .join(" ");
  return path + " Z";
}

interface Territory {
  name: string;
  x: number;
  y: number;
}

function parseCSV(csv: string): string[] {
  return csv
    .split(/\r?\n/)
    .map((line) => line.replace(/^"|"$/g, "").trim())
    .filter((line) => line.length > 0);
}

function geocodeCity(name: string): [number, number] | null {
  const normalized = name.toLowerCase().trim();

  // Direct lookup
  if (CITY_COORDS[normalized]) return CITY_COORDS[normalized];

  // Try extracting state abbreviation and use state centroid
  const match = normalized.match(/,\s*([a-z]{2})\s*$/);
  if (match) {
    const state = match[1].toUpperCase();
    if (STATE_COORDS[state]) return STATE_COORDS[state];
  }

  return null;
}

export default function FranchiseMap() {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  useEffect(() => {
    fetch(SHEET_CSV_URL)
      .then((res) => res.text())
      .then((csv) => {
        setCities(parseCSV(csv));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const territories: Territory[] = useMemo(() => {
    return cities
      .map((name) => {
        const coords = geocodeCity(name);
        if (!coords) return null;
        const [x, y] = albersProject(coords[0], coords[1]);
        return { name, x, y };
      })
      .filter(Boolean) as Territory[];
  }, [cities]);

  const uniqueStates = useMemo(() => {
    const states = new Set<string>();
    cities.forEach((c) => {
      const match = c.match(/,\s*([A-Z]{2})\s*$/i);
      if (match) states.add(match[1].toUpperCase());
    });
    return states.size;
  }, [cities]);

  const usOutlinePath = useMemo(() => generateUSOutlinePath(), []);

  return (
    <section className="py-16 sm:py-24 md:py-32 bg-[#0c1929] overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="reveal text-center mb-10 sm:mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#d4a55a] mb-4 sm:mb-6">
            Trusted Nationwide
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight max-w-2xl mx-auto leading-tight">
            {loading
              ? "Loading..."
              : (
                <>
                  I&rsquo;ve helped{" "}
                  <span className="text-[#d4a55a]">
                    {territories.length}+ owners
                  </span>{" "}
                  find and start the right franchise.
                </>
              )}
          </h2>
        </div>

        {/* Map Container */}
        <div className="reveal relative w-full max-w-4xl mx-auto">
          <svg
            viewBox="0 0 960 600"
            className="w-full h-auto"
            aria-label={`Map showing ${territories.length} franchise territories across the United States`}
          >
            {/* Background */}
            <rect width="960" height="600" fill="transparent" />

            <defs>
              {/* Pin glow filter */}
              <filter id="pin-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="pin-gradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#d4a55a" />
                <stop offset="100%" stopColor="#c08b3e" />
              </radialGradient>
              {/* Subtle inner shadow for the map shape */}
              <filter id="map-inner-glow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blur" />
                <feOffset dx="0" dy="2" result="offsetBlur" />
                <feFlood floodColor="#1b3a5f" floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="offsetBlur" operator="in" result="shadow" />
                <feComposite in="shadow" in2="SourceGraphic" operator="out" result="inverseShadow" />
                <feMerge>
                  <feMergeNode in="SourceGraphic" />
                  <feMergeNode in="inverseShadow" />
                </feMerge>
              </filter>
            </defs>

            {/* Continental US outline — projected from real border coordinates */}
            <path
              d={usOutlinePath}
              fill="#122640"
              stroke="#1b3a5f"
              strokeWidth="1.5"
              strokeLinejoin="round"
              opacity="0.7"
              filter="url(#map-inner-glow)"
            />

            {/* Territory pins */}
            {territories.map((t, i) => (
              <g key={`${t.name}-${i}`}>
                {/* Outer glow */}
                <circle
                  cx={t.x}
                  cy={t.y}
                  r="6"
                  fill="#d4a55a"
                  opacity="0.15"
                  className="animate-pulse"
                />
                {/* Pin */}
                <circle
                  cx={t.x}
                  cy={t.y}
                  r={hoveredCity === t.name ? 4.5 : 3}
                  fill="url(#pin-gradient)"
                  stroke="#0c1929"
                  strokeWidth="1"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredCity(t.name)}
                  onMouseLeave={() => setHoveredCity(null)}
                  style={{
                    animationDelay: `${i * 20}ms`,
                  }}
                />
              </g>
            ))}

            {/* Tooltip */}
            {hoveredCity && (() => {
              const t = territories.find((t) => t.name === hoveredCity);
              if (!t) return null;
              const textWidth = hoveredCity.length * 6.5 + 16;
              return (
                <g>
                  <rect
                    x={t.x - textWidth / 2}
                    y={t.y - 28}
                    width={textWidth}
                    height="20"
                    rx="4"
                    fill="#FAF8F4"
                    stroke="#c08b3e"
                    strokeWidth="0.5"
                  />
                  <text
                    x={t.x}
                    y={t.y - 15}
                    textAnchor="middle"
                    fill="#1a1a1a"
                    fontSize="9"
                    fontFamily="Inter, sans-serif"
                    fontWeight="500"
                  >
                    {hoveredCity}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Caption */}
        <div className="reveal mt-8 sm:mt-12 text-center">
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-lg mx-auto">
            Every pin is an owner who trusted me to get it right.
            Across {uniqueStates} states and counting. This map updates live as new clients launch.
          </p>
        </div>
      </div>
    </section>
  );
}
