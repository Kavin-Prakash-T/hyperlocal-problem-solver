import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Issue } from '../types';
import { useTranslation } from '../lib/i18n';
import { Locate, Navigation, Loader2 } from 'lucide-react';

interface CivicMapProps {
  issues: Issue[];
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedLocation?: [number, number] | null;
  activeIssueId?: string | null;
}

const getMarkerIcon = (severity: string, isActive: boolean = false) => {
  // Theme-compliant colors (Slate / Blue-slate / Accents)
  let color = '#64748b'; // Low (Slate)
  if (severity === 'Medium') color = '#3b82f6'; // Medium (Moderate Blue Accent)
  else if (severity === 'High') color = '#2563eb'; // High (Deep Blue Accent)
  else if (severity === 'Critical') color = '#dc2626'; // Critical (Red Accent)
  
  const size = isActive ? 34 : 26;
  const strokeWidth = isActive ? 3 : 1.5;
  const strokeColor = isActive ? '#0f172a' : '#ffffff';

  const svgHtml = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
      <circle cx="12" cy="9" r="3.5" fill="#ffffff"/>
    </svg>
  `;
  return L.divIcon({
    html: svgHtml,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
    className: 'custom-civic-marker'
  });
};

const getYouAreHereIcon = () => {
  const html = `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-8 h-8 rounded-full bg-blue-500/20 animate-ping"></div>
      <div class="absolute w-5 h-5 rounded-full bg-blue-500/40"></div>
      <div class="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
    </div>
  `;
  return L.divIcon({
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: 'you-are-here-marker'
  });
};

export default function CivicMap({
  issues,
  center = [12.9716, 77.5946], // Default City Location (Bangalore), will update with browser location if enabled
  zoom = 13,
  interactive = false,
  onLocationSelect,
  selectedLocation,
  activeIssueId
}: CivicMapProps) {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);
  const selectionMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    // Add OpenStreetMap tiles with a clean, professional grey/blue-ish vibe if possible
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Feature group for issue markers
    const markersGroup = L.featureGroup().addTo(map);

    mapRef.current = map;
    markersGroupRef.current = markersGroup;

    // Click handler for interactive selection
    if (interactive && onLocationSelect) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onLocationSelect(lat, lng);
      });
    }

    // Try auto-locating on load
    requestUserLocation(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Request user location
  const requestUserLocation = (isInitial: boolean = false) => {
    if (!navigator.geolocation) return;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords: [number, number] = [latitude, longitude];
        setUserLoc(coords);
        setIsLocating(false);

        if (mapRef.current) {
          // If interactive and we have onLocationSelect, auto-select for new reports
          if (interactive && onLocationSelect && isInitial && !selectedLocation) {
            onLocationSelect(latitude, longitude);
          }

          // Center the map
          if (isInitial || !activeIssueId) {
            mapRef.current.setView(coords, 14);
          }
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setIsLocating(false);
        // Fall back to provided center/default
        if (isInitial && mapRef.current) {
          mapRef.current.setView(center, zoom);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Sync Map center if provided from outside
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setView(center, zoom);
    }
  }, [center?.[0], center?.[1]]);

  // Sync "You are here" marker
  useEffect(() => {
    if (!mapRef.current) return;

    if (userLoc) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userLoc);
      } else {
        userMarkerRef.current = L.marker(userLoc, {
          icon: getYouAreHereIcon(),
          zIndexOffset: 1000,
        })
          .addTo(mapRef.current)
          .bindTooltip(t('youAreHere'), { permanent: false, direction: 'top' });
      }
    } else {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    }
  }, [userLoc, t]);

  // Sync Selection Marker (for reporting issue)
  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedLocation) {
      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.setLatLng(selectedLocation);
      } else {
        const pinIcon = L.divIcon({
          html: `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
              <circle cx="12" cy="9" r="3" fill="#ffffff"/>
            </svg>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          className: 'selection-marker'
        });
        selectionMarkerRef.current = L.marker(selectedLocation, { icon: pinIcon }).addTo(mapRef.current);
      }
      mapRef.current.panTo(selectedLocation);
    } else {
      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.remove();
        selectionMarkerRef.current = null;
      }
    }
  }, [selectedLocation]);

  // Render/Sync Issue Markers
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;

    // Clear existing markers
    markersGroupRef.current.clearLayers();

    // Map issues to markers
    issues.forEach((issue) => {
      if (issue.latitude && issue.longitude) {
        const isActive = activeIssueId === issue.id;
        const icon = getMarkerIcon(issue.severity, isActive);
        
        const marker = L.marker([issue.latitude, issue.longitude], { icon });

        const statusColors: Record<string, string> = {
          'Reported': '#ef4444',
          'Under Review': '#f59e0b',
          'Assigned': '#3b82f6',
          'In Progress': '#6366f1',
          'Resolved': '#10b981',
          'Rejected': '#6b7280',
        };
        const statusColor = statusColors[issue.status] || '#6b7280';

        const popupContent = `
          <div style="font-family: system-ui, sans-serif; min-width: 180px;">
            <h4 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px; color: #0f172a;">${issue.title}</h4>
            <div style="display: flex; gap: 4px; margin-bottom: 8px;">
              <span style="background-color: ${statusColor}; color: white; font-size: 10px; padding: 1px 6px; border-radius: 4px; font-weight: 500;">
                ${issue.status}
              </span>
              <span style="background-color: #f1f5f9; color: #475569; font-size: 10px; padding: 1px 6px; border-radius: 4px;">
                ${issue.category}
              </span>
            </div>
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #475569; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
              ${issue.description}
            </p>
            <div style="font-size: 11px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 6px;">
              Severity: <strong>${issue.severity}</strong><br/>
              Urgency Score: <strong>${issue.urgencyScore || 0}%</strong>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        markersGroupRef.current?.addLayer(marker);

        if (isActive) {
          marker.openPopup();
          mapRef.current?.setView([issue.latitude, issue.longitude], 15);
        }
      }
    });

    // Auto-fit bounds if we have issues and not in interactive mode
    if (issues.length > 0 && !selectedLocation && !activeIssueId && !interactive) {
      try {
        const bounds = markersGroupRef.current.getBounds();
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [40, 40] });
        }
      } catch (e) {
        // Safe bypass
      }
    }
  }, [issues, activeIssueId, selectedLocation]);

  return (
    <div className="relative w-full h-full border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      <div id="leaflet-map-element" ref={mapContainerRef} className="w-full h-full z-10" />
      
      {/* Geolocation Trigger Button */}
      <div className="absolute bottom-4 right-4 z-20">
        <button
          type="button"
          onClick={() => requestUserLocation(false)}
          disabled={isLocating}
          className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl shadow-lg border border-slate-100 hover:border-slate-200 transition-all text-xs font-bold pointer-events-auto cursor-pointer"
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          ) : (
            <Locate className="h-4 w-4 text-slate-700" />
          )}
          <span>{t('useCurrentLocation')}</span>
        </button>
      </div>

      {interactive && (
        <div className="absolute top-3 left-3 md:left-12 z-20 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs text-slate-600 pointer-events-none">
          {selectedLocation ? t('locationSelected') : t('clickMapToSelect')}
        </div>
      )}
    </div>
  );
}
