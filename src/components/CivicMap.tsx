import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Issue } from '../types';

interface CivicMapProps {
  issues: Issue[];
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedLocation?: [number, number] | null;
  activeIssueId?: string | null;
  showHeatmap?: boolean;
}

const getStatusColor = (status: string) => {
  const statusColors: Record<string, string> = {
    'Reported': '#ef4444',
    'Under Review': '#f59e0b',
    'Assigned': '#3b82f6',
    'In Progress': '#6366f1',
    'Resolved': '#10b981',
    'Rejected': '#6b7280',
  };
  return statusColors[status] || '#6b7280';
};

const getMarkerIcon = (severity: string, isActive: boolean = false) => {
  let color = '#3b82f6'; // Default: Blue
  if (severity === 'Low') color = '#64748b';
  else if (severity === 'High') color = '#f97316';
  else if (severity === 'Critical') color = '#ef4444';

  const size = isActive ? 34 : 26;
  const strokeColor = isActive ? '#0f172a' : '#ffffff';
  const strokeWidth = isActive ? 2.5 : 1.5;

  const svgHtml = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.3));">
      <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
      <circle cx="12" cy="9" r="3" fill="#ffffff"/>
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

export default function CivicMap({
  issues,
  center,
  zoom = 13,
  interactive = false,
  onLocationSelect,
  selectedLocation,
  activeIssueId,
  showHeatmap = false,
}: CivicMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);
  const selectionMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter = center || [12.9716, 77.5946]; // Default to Bangalore if center not specified

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: zoom,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    // Standard OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const markersGroup = L.featureGroup().addTo(map);

    mapRef.current = map;
    markersGroupRef.current = markersGroup;

    if (interactive && onLocationSelect) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onLocationSelect(lat, lng);
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map center when prop changes
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setView(center, mapRef.current.getZoom());
    }
  }, [center?.[0], center?.[1]]);

  // Sync selected location pin (when reporting an issue)
  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedLocation) {
      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.setLatLng(selectedLocation);
      } else {
        const pinIcon = L.divIcon({
          html: `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #4f46e5; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.4));">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          className: 'custom-selection-marker'
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

  // Sync issues/hotspots and active markers
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    issues.forEach((issue) => {
      if (issue.latitude && issue.longitude) {
        const isActive = activeIssueId === issue.id;

        if (showHeatmap && issue.status !== 'Resolved' && issue.status !== 'Rejected') {
          // Render heatmap visualization circle
          let heatColor = '#ef4444';
          if (issue.severity === 'High') heatColor = '#f97316';
          else if (issue.severity === 'Medium') heatColor = '#eab308';
          else if (issue.severity === 'Low') heatColor = '#3b82f6';

          const circle = L.circle([issue.latitude, issue.longitude], {
            color: heatColor,
            fillColor: heatColor,
            fillOpacity: 0.35,
            radius: 150,
            weight: 1.5
          });

          const popupContent = `
            <div style="font-family: system-ui, sans-serif; padding: 2px;">
              <div style="font-size: 10px; font-weight: 700; color: ${heatColor}; text-transform: uppercase; margin-bottom: 2px;">
                Active Hotspot Area
              </div>
              <h4 style="margin: 0 0 4px 0; font-weight: 700; font-size: 13px; color: #1e293b;">${issue.title}</h4>
              <p style="margin: 0; font-size: 11px; color: #64748b;">${issue.category} • Severity: <strong>${issue.severity}</strong></p>
            </div>
          `;
          circle.bindPopup(popupContent, { maxWidth: 200 });
          markersGroupRef.current?.addLayer(circle);
        } else {
          // Render standard pin marker
          const icon = getMarkerIcon(issue.severity, isActive);
          const marker = L.marker([issue.latitude, issue.longitude], { icon });

          const statusColor = getStatusColor(issue.status);

          const popupContent = `
            <div style="font-family: system-ui, sans-serif; min-width: 180px; padding: 2px;">
              <h4 style="margin: 0 0 4px 0; font-weight: 700; font-size: 13px; color: #1e293b;">${issue.title}</h4>
              <div style="display: flex; gap: 4px; margin-bottom: 6px;">
                <span style="background-color: ${statusColor}; color: white; font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
                  ${issue.status}
                </span>
                <span style="background-color: #f1f5f9; color: #475569; font-size: 9px; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
                  ${issue.category}
                </span>
              </div>
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #475569; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${issue.description}
              </p>
              <div style="font-size: 10px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 6px; display: flex; justify-content: space-between;">
                <span>Priority: <strong>${issue.severity}</strong></span>
                <span>Upvotes: <strong>${issue.verificationCount || 0}</strong></span>
              </div>
            </div>
          `;

          marker.bindPopup(popupContent, { maxWidth: 220 });
          markersGroupRef.current?.addLayer(marker);

          if (isActive) {
            marker.openPopup();
            mapRef.current?.setView([issue.latitude, issue.longitude], 15);
          }
        }
      }
    });

    // Auto-fit bounds if issues exist and not in specific interactive modes
    if (issues.length > 0 && !selectedLocation && !activeIssueId && !interactive) {
      try {
        const bounds = markersGroupRef.current.getBounds();
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }
      } catch (e) {
        // Safe bypass
      }
    }
  }, [issues, activeIssueId, selectedLocation, showHeatmap]);

  return (
    <div className="relative w-full h-full border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-xs">
      <div ref={mapContainerRef} className="w-full h-full z-10" />
    </div>
  );
}
