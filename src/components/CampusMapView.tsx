import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Send, 
  Star, 
  Compass
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UbuLocation } from '../types/ubuCondom';

interface CampusMapViewProps {
  locations: UbuLocation[];
  onReportEmpty: (locationName: string) => Promise<void>;
  onSubmitSurvey: (rating: number, feedback: string) => Promise<void>;
  isLoading?: boolean;
}

export const CampusMapView: React.FC<CampusMapViewProps> = ({
  locations,
  onReportEmpty,
  onSubmitSurvey,
  isLoading,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'empty'>('all');
  const [selectedLocation, setSelectedLocation] = useState<UbuLocation | null>(null);
  const [reportingLocation, setReportingLocation] = useState<string | null>(null);

  // Survey state
  const [surveyRating, setSurveyRating] = useState<number>(0);
  const [surveyHoverRating, setSurveyHoverRating] = useState<number>(0);
  const [surveyFeedback, setSurveyFeedback] = useState<string>('');
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState(false);
  const [surveySubmitted, setSurveySubmitted] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered at Ubon Ratchathani University (UBU)
    const ubuCenter: L.LatLngExpression = [15.1190, 104.9030];
    
    const map = L.map(mapContainerRef.current, {
      center: ubuCenter,
      zoom: 16,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    markersGroupRef.current = markersGroup;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when locations change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    locations.forEach((loc) => {
      if (!loc.lat || !loc.lng) return;

      const isAvailable = loc.status === 'มีอยู่';
      const markerColor = isAvailable ? '#10b981' : '#ef4444';
      const pulseAnimation = !isAvailable ? 'animate-ping' : '';

      const customIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            ${!isAvailable ? `<span class="absolute inline-flex h-8 w-8 rounded-full bg-rose-500 opacity-75 ${pulseAnimation}"></span>` : ''}
            <div style="background-color: ${markerColor}; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">
              ${isAvailable ? '✓' : '!'}
            </div>
          </div>
        `,
        className: 'custom-ubu-pin',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const popupDiv = document.createElement('div');
      popupDiv.className = 'font-sans p-1 min-w-[220px] text-slate-800';
      popupDiv.innerHTML = `
        <div class="font-bold text-base text-slate-900 leading-tight mb-1">${loc.name}</div>
        <div class="text-xs text-slate-500 mb-2">${loc.landmark || 'จุดบริการถุงยางอนามัยฟรี ม.อุบลฯ'}</div>
        <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} mb-3">
          <span class="w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
          สถานะ: ${loc.status}
        </div>
      `;

      if (isAvailable) {
        const reportBtn = document.createElement('button');
        reportBtn.className = 'w-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5';
        reportBtn.innerHTML = '⚠️ แจ้งจุดนี้ของหมด';
        reportBtn.onclick = () => {
          mapInstanceRef.current?.closePopup();
          handleReportEmptyClick(loc.name);
        };
        popupDiv.appendChild(reportBtn);
      } else {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'text-center py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold';
        emptyMsg.innerText = '🔴 แจ้งหมดแล้ว รอจิตอาสาเติม';
        popupDiv.appendChild(emptyMsg);
      }

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon })
        .bindPopup(popupDiv)
        .addTo(markersGroupRef.current!);

      marker.on('click', () => {
        setSelectedLocation(loc);
      });
    });
  }, [locations]);

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
    }
  };

  const handleResetCampusView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([15.1190, 104.9030], 16, { animate: true });
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
      {/* Top Main Section: Interactive Map + Location List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map View Column (8 cols on lg) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 custom-shadow flex flex-col space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></span>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
                แผนที่พิกัดกล่องถุงยางอนามัย มหาวิทยาลัยอุบลราชธานี
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetCampusView}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-2xl transition-colors cursor-pointer border border-slate-200"
                title="กลับสู่มุมมองภาพรวม ม.อุบลฯ"
              >
                <Compass className="w-4 h-4 text-blue-600" />
                <span>มุมมอง ม.อุบลฯ</span>
              </button>
            </div>
          </div>

          {/* Leaflet Map Frame */}
          <div className="relative w-full h-[480px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50">
            <div ref={mapContainerRef} className="w-full h-full z-10" />

            {/* Floating Map Legend */}
            <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm shadow-md flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs"></span>
                <span className="text-slate-700 font-semibold">มีของพร้อมบริการ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white shadow-xs animate-pulse"></span>
                <span className="text-rose-600 font-semibold">ของหมด (รอเติม)</span>
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
                <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">รายชื่อจุดบริการทั้งหมด</h3>
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
                placeholder="ค้นหาชื่ออาคาร ตึก หรือจุดบริการ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Scrollable Locations List */}
            <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
              {filteredLocations.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400 font-medium">
                  ไม่พบจุดบริการที่ตรงกับการค้นหา
                </div>
              ) : (
                filteredLocations.map((loc) => {
                  const isAvailable = loc.status === 'มีอยู่';
                  const isSelected = selectedLocation?.id === loc.id;

                  return (
                    <div
                      key={loc.id}
                      onClick={() => handleZoomToLocation(loc)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-300 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100/80 border-slate-100'
                      }`}
                    >
                      <div className="truncate flex-1">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-800 truncate">
                          <MapPin className={`w-4 h-4 shrink-0 ${isAvailable ? 'text-emerald-600' : 'text-rose-500'}`} />
                          <span className="truncate">{loc.name}</span>
                        </div>
                        {loc.landmark && (
                          <div className="text-xs text-slate-500 truncate pl-6 mt-0.5">
                            {loc.landmark}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isAvailable
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {loc.status}
                        </span>

                        {isAvailable ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReportEmptyClick(loc.name);
                            }}
                            title="แจ้งของหมด"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        ) : null}
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
