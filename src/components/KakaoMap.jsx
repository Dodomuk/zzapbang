import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { depositColor, formatDeposit } from '../utils/deposit';

// Leaflet 기본 마커 아이콘 경로 수정 (Vite 환경)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function KakaoMap({ records, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // 지도 초기화 (최초 1회)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, {
      center: [37.5665, 126.978],
      zoom: 11,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 마커 업데이트
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    records
      .filter((r) => r.lat && r.lng)
      .forEach((record) => {
        const color = depositColor(record.deposit);

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:14px;height:14px;border-radius:50%;
            background:${color};border:2px solid white;
            box-shadow:0 1px 4px rgba(0,0,0,.4);
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([record.lat, record.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:160px;line-height:1.6">
              <strong>${record.apartment}</strong><br>
              <span style="color:#888;font-size:12px">${record.dong} · ${record.floor}층 · ${record.area}㎡</span><br>
              <span style="color:${color};font-size:15px;font-weight:700">${formatDeposit(record.deposit)}</span>
            </div>
          `)
          .on('click', () => onSelect(record));

        markersRef.current.push(marker);
      });
  }, [records]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
