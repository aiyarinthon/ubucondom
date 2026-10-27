import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Send, 
  Star, 
  Compass,
  Navigation,
  Layers,
  Crosshair,
  Maximize2,
  Minimize2,
  ExternalLink,
  Sparkles,
  Map as MapIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UbuLocation } from '../types/ubuCondom';

interface CampusMapViewProps {
  locations: UbuLocation[];
  onReportEmpty: (locationName: string) => Promise<void>;
  onSubmitSurvey: (rating: number, feedback: string) => Promise<void>;
  isLoading?: boolean;
}

type MapLayerType = 'roadmap' | 'satellite' | 'terrain';

// Calculate distance in meters using Haversine formula
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} ม.`;
  }
  return `${(meters / 1000).toFixed(1)} กม.`;
}

export const CampusMapView: React.FC<CampusMapViewProps> = ({
  locations,
  onReportEmpty,
  onSubmitSurvey,
  isLoading,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);
  const markerMapRef = useRef<Record<number, L.Marker>>({});

  const [mapLayer, setMapLayer] = useState<MapLayerType>('roadmap');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'empty'>('all');
  const [selectedLocation, setSelectedLocation] = useState<UbuLocation | null>(null);
  const [reportingLocation, setReportingLocation] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // User GPS state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Survey state
  const [surveyRating, setSurveyRating] = useState<number>(0);
  const [surveyHoverRating, setSurveyHoverRating] = useState<number>(0);
  const [surveyFeedback, setSurveyFeedback] = useState<string>('');
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState(false);
  const [surveySubmitted, setSurveySubmitted] = useState(false);

  // Google Maps Tile URLs
  const getGoogleTileUrl = (type: MapLayerType): { url: string; maxZoom: number } => {
    switch (type) {
      case 'satellite':
        // Google Hybrid: Satellite imagery + road & landmark names
        return {
          url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          maxZoom: 20,
        };
      case 'terrain':
        // Google Terrain
        return {
          url: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
          maxZoom: 20,
        };
      case 'roadmap':
      default:
        // Google Standard Roadmap
        return {
          url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          maxZoom: 20,
        };
    }
  };

  // Switch Tile Layer
  const changeTileLayer = useCallback((layerType: MapLayerType) => {
    if (!mapInstanceRef.current) return;
    
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const { url, maxZoom } = getGoogleTileUrl(layerType);
    const newLayer = L.tileLayer(url, {
      subdomains: ['0', '1', '2', '3'],
      maxZoom,
      attribution: '&copy; Google Maps',
    });

    newLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
    setMapLayer(layerType);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered at Ubon Ratchathani University
    const ubuCenter: L.LatLngExpression = [15.1190, 104.9060];
    
    const map = L.map(mapContainerRef.current, {
      center: ubuCenter,
      zoom: 16,
      zoomControl: false, // We use custom Google Maps style controls
    });

    // Add Google Roadmap as default
    const { url, maxZoom } = getGoogleTileUrl('roadmap');
    const baseLayer = L.tileLayer(url, {
      subdomains: ['0', '1', '2', '3'],
      maxZoom,
      attribution: '&copy; Google Maps',
    }).addTo(map);
    tileLayerRef.current = baseLayer;

    // Add zoom control at bottom right like Google Maps
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    const userLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    markersGroupRef.current = markersGroup;
    userLocationLayerRef.current = userLayer;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle GPS location request (Like Google Maps "My Location" button)
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setLocationError('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง GPS');
      return;
    }

    setIsLocatingUser(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setIsLocatingUser(false);

        if (mapInstanceRef.current && userLocationLayerRef.current) {
          userLocationLayerRef.current.clearLayers();

          // Blue pulsating accuracy circle
          const accuracyCircle = L.circle([latitude, longitude], {
            radius: Math.max(accuracy, 25),
            color: '#3b82f6',
            fillColor: '#60a5fa',
            fillOpacity: 0.15,
            weight: 1.5,
          });

          // Google Maps blue pulsating user location dot
          const userIcon = L.divIcon({
            html: `
              <div class="relative flex items-center justify-center w-8 h-8">
                <span class="absolute inline-flex h-8 w-8 rounded-full bg-blue-500 opacity-70 animate-ping"></span>
                <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-lg"></span>
              </div>
            `,
            className: 'user-gps-dot',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const userMarker = L.marker([latitude, longitude], { icon: userIcon })
            .bindPopup(`
              <div class="p-2 text-center text-xs font-bold text-slate-800">
                <div class="text-blue-600 font-extrabold mb-0.5">📍 ตำแหน่งของคุณ</div>
                <div class="text-slate-500 font-normal">ความแม่นยำ ~${Math.round(accuracy)} เมตร</div>
              </div>
            `);

          userLocationLayerRef.current.addLayer(accuracyCircle);
          userLocationLayerRef.current.addLayer(userMarker);

          mapInstanceRef.current.setView([latitude, longitude], 17, { animate: true });
        }
      },
      (err) => {
        setIsLocatingUser(false);
        setLocationError('ไม่สามารถเข้าถึงตำแหน่ง GPS ของคุณได้ โปรดเปิดสิทธิ์ Location');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Google Maps Style Pin Marker Generator
  const createGoogleMapsPin = (isAvailable: boolean, isSelected: boolean) => {
    const pinColor = isAvailable ? '#10b981' : '#ea4335'; // Emerald or Google Red
    const glowClass = !isAvailable ? 'gmap-pin-pulse' : '';
    const scaleStyle = isSelected ? 'transform: scale(1.15); filter: drop-shadow(0 10px 15px rgba(0,0,0,0.3));' : '';

    return L.divIcon({
      html: `
        <div class="relative group cursor-pointer flex flex-col items-center" style="${scaleStyle}">
          ${!isAvailable ? `<span class="absolute -top-1 w-10 h-10 rounded-full bg-rose-500/40 ${glowClass}"></span>` : ''}
          <!-- Google Maps Teardrop Pin SVG -->
          <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" class="filter drop-shadow-md transition-transform duration-200 hover:scale-110">
            <path d="M17 0C7.61116 0 0 7.61116 0 17C0 27.625 14.875 40.6875 16.3125 41.9375C16.6875 42.25 17.3125 42.25 17.6875 41.9375C19.125 40.6875 34 27.625 34 17C34 7.61116 26.3888 0 17 0Z" fill="${pinColor}"/>
            <circle cx="17" cy="17" r="13" fill="white"/>
            <circle cx="17" cy="17" r="10" fill="${pinColor}"/>
            <!-- Inner Icon -->
            ${isAvailable 
              ? `<path d="M13 17.2L15.6 19.8L21 14.4" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`
              : `<path d="M17 12V17M17 21H17.01" stroke="white" stroke-width="2.6" stroke-linecap="round"/>`
            }
          </svg>
          <!-- Pin ground shadow -->
          <div class="w-4 h-1.5 bg-black/25 rounded-full filter blur-[1px] -mt-1"></div>
        </div>
      `,
      className: 'gmap-marker-pin',
      iconSize: [34, 44],
      iconAnchor: [17, 42],
      popupAnchor: [0, -42],
    });
  };

  // Update Markers on Location or UserCoords change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();
    markerMapRef.current = {};

    locations.forEach((loc) => {
      if (!loc.lat || !loc.lng) return;

      const isAvailable = loc.status === 'มีอยู่';
      const isSelected = selectedLocation?.id === loc.id;
      const customPin = createGoogleMapsPin(isAvailable, isSelected);

      // Distance from user
      const distMeters = userCoords ? calculateDistanceMeters(userCoords.lat, userCoords.lng, loc.lat, loc.lng) : null;
      const distString = distMeters !== null ? formatDistance(distMeters) : null;

      // Google Maps Navigation URL
      const gmapsDirUrl = `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`;

      const popupDiv = document.createElement('div');
      popupDiv.className = 'font-sans p-3 min-w-[260px] max-w-[300px] text-slate-800 bg-white rounded-2xl';
      popupDiv.innerHTML = `
        <div class="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
          <div>
            <div class="text-[11px] font-bold tracking-wider uppercase text-blue-600 mb-0.5">
              ${loc.zone || 'มหาวิทยาลัยอุบลราชธานี'}
            </div>
            <h4 class="font-black text-sm text-slate-900 leading-snug">${loc.name}</h4>
          </div>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
            isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }">
            ${isAvailable ? '● มีของ' : '● หมดแล้ว'}
          </span>
        </div>

        <p class="text-xs text-slate-500 mb-3 flex items-start gap-1.5">
          <span class="text-slate-400 mt-0.5">📍</span>
          <span>${loc.landmark || 'จุดบริการถุงยางอนามัยฟรี ม.อุบลฯ'}</span>
        </p>

        ${distString ? `
          <div class="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs font-bold text-blue-700 mb-3">
            <span>🧭</span>
            <span>ห่างจากตำแหน่งคุณ: ${distString}</span>
          </div>
        ` : ''}

        <div class="space-y-2">
          <!-- Google Maps Direct Navigation Link -->
          <a
            href="${gmapsDirUrl}"
            target="_blank"
            rel="noopener noreferrer"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer no-underline"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            <span>นำทางด้วย Google Maps</span>
          </a>

          ${isAvailable ? `
            <button
              id="report-empty-btn-${loc.id}"
              class="w-full bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-600 font-bold text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>⚠️ แจ้งจุดนี้ของหมด</span>
            </button>
          ` : `
            <div class="text-center py-2 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold">
              รอจิตอาสานำของเข้าเติม
            </div>
          `}
        </div>
      `;

      const marker = L.marker([loc.lat, loc.lng], { icon: customPin })
        .bindPopup(popupDiv, { maxWidth: 320 })
        .addTo(markersGroupRef.current!);

      marker.on('click', () => {
        setSelectedLocation(loc);
      });

      marker.on('popupopen', () => {
        if (isAvailable) {
          const btn = document.getElementById(`report-empty-btn-${loc.id}`);
          if (btn) {
            btn.onclick = () => {
              mapInstanceRef.current?.closePopup();
              handleReportEmptyClick(loc.name);
            };
          }
        }
      });

      markerMapRef.current[loc.id] = marker;
    });
  }, [locations, selectedLocation, userCoords]);

  const handleReportEmptyClick = async (name: string) => {
    if (window.confirm(`คุณต้องการส่งรายงานข้อมูล "ถุงยางอนามัยหมด" ณ จุดตู้บริการ:\n${name} ใช่หรือไม่?`)) {
      setReportingLocation(name);
      try {
        await onReportEmpty(name);
      } finally {
        setReportingLocation(null);
      }
    }
  };

  const handleZoomToLocation = (loc: UbuLocation) => {
    setSelectedLocation(loc);
    if (mapInstanceRef.current && loc.lat && loc.lng) {
      mapInstanceRef.current.setView([loc.lat, loc.lng], 18, { animate: true });
      
      const targetMarker = markerMapRef.current[loc.id];
      if (targetMarker) {
        targetMarker.openPopup();
      }
    }
  };

  const handleResetCampusView = () => {
    if (mapInstanceRef.current && locations.length > 0) {
      const validPoints = locations.filter(l => l.lat && l.lng);
      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints.map(l => [l.lat, l.lng]));
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
      } else {
        mapInstanceRef.current.setView([15.1190, 104.9060], 16, { animate: true });
      }
    }
  };

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (surveyRating === 0) {
      alert('โปรดเลือกระดับความพึงพอใจ (1 - 5 ดาว)');
      return;
    }

    setIsSubmittingSurvey(true);
    try {
      await onSubmitSurvey(surveyRating, surveyFeedback);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
      setSurveySubmitted(true);
      setSurveyFeedback('');
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถส่งแบบประเมินได้');
    } finally {
      setIsSubmittingSurvey(false);
    }
  };

  // Filtered list
  const filteredLocations = locations.filter((loc) => {
    const matchesSearch = loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loc.landmark && loc.landmark.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (loc.zone && loc.zone.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterStatus === 'available') return loc.status === 'มีอยู่';
    if (filterStatus === 'empty') return loc.status === 'หมดแล้ว';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Main Section: Interactive Google Maps + Location List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map View Column (8 cols on lg) */}
        <div className={`lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 custom-shadow flex flex-col space-y-3.5 ${
          isFullscreen ? 'fixed inset-4 z-50 overflow-hidden' : ''
        }`}>
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <span>แผนที่จุดบริการ (Google Maps)</span>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    {locations.length} จุดทั่วมหาวิทยาลัย
                  </span>
                </h2>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleLocateUser}
                disabled={isLocatingUser}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs sm:text-sm font-bold rounded-2xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
                title="ค้นหาตำแหน่งของฉันใน ม.อุบลฯ"
              >
                <Crosshair className={`w-4 h-4 text-blue-600 ${isLocatingUser ? 'animate-spin' : ''}`} />
                <span>{isLocatingUser ? 'กำลังระบุ...' : 'ตำแหน่งของฉัน'}</span>
              </button>

              <button
                onClick={handleResetCampusView}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-2xl transition-colors cursor-pointer border border-slate-200"
                title="ขยายมุมมองให้เห็นทุกจุดใน ม.อุบลฯ"
              >
                <Compass className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">ภาพรวม ม.อุบลฯ</span>
              </button>

              <button
                onClick={() => {
                  setIsFullscreen(!isFullscreen);
                  setTimeout(() => {
                    mapInstanceRef.current?.invalidateSize();
                  }, 200);
                }}
                className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-2xl border border-slate-200 transition-colors cursor-pointer"
                title={isFullscreen ? 'ย่อแผนที่' : 'ขยายเต็มจอ'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Location error message banner */}
          {locationError && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 flex items-center justify-between">
              <span>⚠️ {locationError}</span>
              <button onClick={() => setLocationError(null)} className="text-amber-900 font-bold ml-2">×</button>
            </div>
          )}

          {/* Google Maps Container Frame */}
          <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100 transition-all ${
            isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-[520px]'
          }`}>
            <div ref={mapContainerRef} className="w-full h-full z-10" />

            {/* Google Maps Floating Layer Switcher (Top Left Controls) */}
            <div className="absolute top-3 left-3 z-20 flex items-center bg-white/95 backdrop-blur-md p-1 rounded-2xl shadow-lg border border-slate-200/90 text-xs font-bold">
              <button
                onClick={() => changeTileLayer('roadmap')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  mapLayer === 'roadmap'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>แผนที่</span>
              </button>

              <button
                onClick={() => changeTileLayer('satellite')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  mapLayer === 'satellite'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>ดาวเทียม</span>
              </button>

              <button
                onClick={() => changeTileLayer('terrain')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  mapLayer === 'terrain'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>ภูมิประเทศ</span>
              </button>
            </div>

            {/* Floating Map Legend (Bottom Left) */}
            <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm shadow-md flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-xs"></span>
                <span className="text-slate-700 font-bold">มีของพร้อมบริการ ({locations.filter(l => l.status === 'มีอยู่').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 border border-white shadow-xs animate-pulse"></span>
                <span className="text-rose-600 font-bold">ของหมด ({locations.filter(l => l.status === 'หมดแล้ว').length})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Location Finder & Survey (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-6 flex flex-col justify-between">
          {/* Location Explorer Box */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 custom-shadow flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3.5">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">ค้นหาจุดตู้บริการ</h3>
                <p className="text-sm font-bold text-slate-800 mt-0.5">พบ {filteredLocations.length} จุดบริการ</p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${filterStatus === 'all' ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  ทั้งหมด
                </button>
                <button
                  onClick={() => setFilterStatus('available')}
                  className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${filterStatus === 'available' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  มีอยู่
                </button>
                <button
                  onClick={() => setFilterStatus('empty')}
                  className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${filterStatus === 'empty' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  หมด
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-3.5">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อคณะ อาคาร หรือจุดบริการ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Scrollable Locations List */}
            <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1">
              {filteredLocations.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400 font-medium">
                  ไม่พบจุดบริการที่ตรงกับการค้นหา
                </div>
              ) : (
                filteredLocations.map((loc) => {
                  const isAvailable = loc.status === 'มีอยู่';
                  const isSelected = selectedLocation?.id === loc.id;
                  const distM = (userCoords && loc.lat && loc.lng) 
                    ? calculateDistanceMeters(userCoords.lat, userCoords.lng, loc.lat, loc.lng) 
                    : null;

                  return (
                    <div
                      key={loc.id}
                      onClick={() => handleZoomToLocation(loc)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-blue-50/90 border-blue-400 shadow-md ring-2 ring-blue-400/20'
                          : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className="truncate">{loc.name}</span>
                          </div>
                          {loc.landmark && (
                            <div className="text-xs text-slate-500 truncate pl-4 mt-0.5">
                              {loc.landmark}
                            </div>
                          )}
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                            isAvailable
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {loc.status}
                        </span>
                      </div>

                      {/* Distance & Action bar */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                        {distM !== null ? (
                          <span className="text-blue-700 font-bold flex items-center gap-1">
                            <span>🧭</span>
                            <span>{formatDistance(distM)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">
                            {loc.lat?.toFixed(3)}, {loc.lng?.toFixed(3)}
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <span>นำทาง Google Maps</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          {isAvailable && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReportEmptyClick(loc.name);
                              }}
                              title="แจ้งของหมด"
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Satisfaction Survey Box */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 custom-shadow">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-500 text-lg">⭐</span>
              <h3 className="text-base font-bold text-slate-800">แบบประเมินความพึงพอใจ</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mb-3.5">
              ความคิดเห็นของท่านช่วยพัฒนาการบริการให้ดียิ่งขึ้น
            </p>

            {surveySubmitted ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 animate-in fade-in">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-emerald-800">
                  บันทึกแบบประเมินเรียบร้อยแล้ว!
                </p>
                <p className="text-xs text-slate-600">
                  ขอบคุณสำหรับข้อเสนอแนะในการพัฒนาโครงการ
                </p>
                <button
                  onClick={() => setSurveySubmitted(false)}
                  className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  ประเมินอีกครั้ง
                </button>
              </div>
            ) : (
              <form onSubmit={handleSurveySubmit} className="space-y-3.5">
                {/* Star rating selector */}
                <div className="flex items-center justify-center gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (surveyHoverRating || surveyRating) >= star;
                    return (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setSurveyRating(star)}
                        onMouseEnter={() => setSurveyHoverRating(star)}
                        onMouseLeave={() => setSurveyHoverRating(0)}
                        className="p-1 transition-transform hover:scale-125 cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            isFilled
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  placeholder="พิมพ์ข้อเสนอแนะเพิ่มเติมที่นี่..."
                  value={surveyFeedback}
                  onChange={(e) => setSurveyFeedback(e.target.value)}
                  className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />

                <button
                  type="submit"
                  disabled={isSubmittingSurvey || surveyRating === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-2xl transition-all shadow-md shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmittingSurvey ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>กำลังส่งข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>ส่งข้อมูลสถิติ</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
