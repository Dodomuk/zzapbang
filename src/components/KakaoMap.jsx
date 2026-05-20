import { useEffect, useRef } from 'react';
import { depositColor, formatDeposit } from '../utils/deposit';

export default function KakaoMap({ records, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const { kakao } = window;
    if (!kakao?.maps) return;

    const map = new kakao.maps.Map(containerRef.current, {
      center: new kakao.maps.LatLng(37.5665, 126.978),
      level: 8,
    });
    mapRef.current = map;
    infoWindowRef.current = new kakao.maps.InfoWindow({ zIndex: 1 });
  }, []);

  useEffect(() => {
    const { kakao } = window;
    if (!kakao?.maps || !mapRef.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    infoWindowRef.current?.close();

    records
      .filter((r) => r.lat && r.lng)
      .forEach((record) => {
        const color = depositColor(record.deposit);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
          <circle cx="8" cy="8" r="7" fill="${color}" stroke="white" stroke-width="2"/>
        </svg>`;
        const markerImage = new kakao.maps.MarkerImage(
          `data:image/svg+xml,${encodeURIComponent(svg)}`,
          new kakao.maps.Size(16, 16),
          { offset: new kakao.maps.Point(8, 8) }
        );

        const marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(record.lat, record.lng),
          image: markerImage,
          map: mapRef.current,
        });

        kakao.maps.event.addListener(marker, 'click', () => {
          const content = `
            <div style="padding:10px 14px;font-size:13px;min-width:170px;line-height:1.6">
              <strong style="font-size:14px">${record.apartment}</strong><br>
              <span style="color:#888">${record.dong} · ${record.floor}층 · ${record.area}㎡</span><br>
              <span style="color:${color};font-size:16px;font-weight:700">${formatDeposit(record.deposit)}</span>
            </div>`;
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(mapRef.current, marker);
          onSelect(record);
        });

        markersRef.current.push(marker);
      });
  }, [records]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
