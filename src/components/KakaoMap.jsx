import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { depositColor, formatDeposit, formatArea } from '../utils/deposit';
import { nearestStation } from '../data/subway';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MONTHLY_COLOR = '#1677ff';

// 팝업 공유 버튼 핸들러 레지스트리
// Leaflet 팝업은 HTML 문자열이라 onclick에서 직접 클로저 호출이 필요
if (!window.__zzapShareRegistry) window.__zzapShareRegistry = {};

function markerColor(record) {
  return record.type === '월세' ? MONTHLY_COLOR : depositColor(record.deposit);
}

function buildPopup(record, handlerId) {
  const color = markerColor(record);
  const isMonthly = record.type === '월세';

  const depositLine = isMonthly
    ? `보증금 ${formatDeposit(record.deposit)} / 월 ${parseInt(record.monthlyRent || 0).toLocaleString()}만`
    : formatDeposit(record.deposit);

  const station = nearestStation(record.lat, record.lng);
  const stationHtml = station
    ? `<div style="margin:4px 0 6px;font-size:11px;color:#555">🚇 ${station.name} (${station.line}) · 도보 약 ${station.walkMin}분</div>`
    : '';

  const q = encodeURIComponent(`${record.gu} ${record.dong} ${record.apartment}`);
  const naverUrl = `https://land.naver.com/search/search.nhn?query=${q}`;
  // Kakao 로드뷰: 국내 커버리지 우수, 모바일에서 카카오맵 앱 연동
  const roadviewUrl = `https://map.kakao.com/link/roadview/${record.lat},${record.lng}`;
  // 채광·조망·소음: 네이버 블로그·카페 실거주 후기 검색
  const naverSearch = `https://search.naver.com/search.naver?query=${encodeURIComponent(record.apartment + ' 채광 조망 소음 후기')}`;

  const linkStyle =
    'display:block;padding:5px 8px;background:#f0f0f0;border-radius:5px;' +
    'text-decoration:none;color:#222;font-size:12px;margin-bottom:3px';

  const shareStyle =
    'display:block;width:100%;padding:6px 8px;background:#FEE500;border:none;' +
    'border-radius:5px;color:#3A1D1D;font-size:12px;font-weight:600;' +
    'cursor:pointer;text-align:center;margin-top:6px;box-sizing:border-box';

  return `
    <div style="min-width:200px;line-height:1.5;font-size:13px">
      <div style="font-weight:700;font-size:14px;margin-bottom:2px">${record.apartment}</div>
      <div style="color:#888;font-size:11px">${record.dong} · ${record.floor}층 · ${formatArea(record.area)}</div>
      <div style="color:${color};font-size:14px;font-weight:700;margin:5px 0">${depositLine}</div>
      ${stationHtml}
      <div style="margin-top:8px">
        <a href="${naverUrl}" target="_blank" rel="noopener" style="${linkStyle}">🏠 집 내부 사진 보기</a>
        <a href="${roadviewUrl}" target="_blank" rel="noopener" style="${linkStyle}">🗺️ 주변 환경 보기</a>
        <a href="${naverSearch}" target="_blank" rel="noopener" style="${linkStyle}margin-bottom:0">🌳 채광·조망·소음 확인</a>
        <button
          id="${handlerId}"
          onclick="window.__zzapShareRegistry['${handlerId}']()"
          style="${shareStyle}"
        >💬 카카오톡 공유</button>
      </div>
    </div>
  `;
}

function registerShareHandler(record, handlerId, depositLine) {
  window.__zzapShareRegistry[handlerId] = async () => {
    const btn = document.getElementById(handlerId);
    const shareText = [
      `🏠 ${record.apartment}`,
      `${record.gu} ${record.dong} · ${record.floor}층 · ${record.area}㎡`,
      depositLine,
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: record.apartment,
          text: shareText,
          url: window.location.href,
        });
      } catch (e) {
        // AbortError = 사용자가 공유 취소, 무시
      }
    } else {
      // 데스크탑: 클립보드 복사 후 버튼 텍스트로 피드백
      try {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        if (btn) {
          btn.textContent = '✅ 복사됐어요!';
          setTimeout(() => { btn.textContent = '💬 카카오톡 공유'; }, 2000);
        }
      } catch (_) {}
    }
  };
}

export default function KakaoMap({ records, onSelect, focusRecord }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 기존 마커 및 공유 핸들러 정리
    markersRef.current.forEach(({ marker, handlerId }) => {
      marker.remove();
      delete window.__zzapShareRegistry[handlerId];
    });
    markersRef.current = [];

    records
      .filter((r) => r.lat && r.lng)
      .forEach((record) => {
        const color = markerColor(record);
        const isMonthly = record.type === '월세';

        const dotHtml = isMonthly
          ? `<div style="width:14px;height:14px;border-radius:50%;background:white;border:2.5px solid ${color};box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`
          : `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`;

        const icon = L.divIcon({
          className: '',
          html: dotHtml,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const depositLine =
          isMonthly
            ? `보증금 ${formatDeposit(record.deposit)} / 월 ${parseInt(record.monthlyRent || 0).toLocaleString()}만`
            : formatDeposit(record.deposit);

        // 공유 핸들러 ID: DOM ID이기도 하므로 영숫자만 사용
        const handlerId = `zs${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

        registerShareHandler(record, handlerId, depositLine);

        const marker = L.marker([record.lat, record.lng], { icon })
          .addTo(map)
          .bindPopup(buildPopup(record, handlerId), {
            maxWidth: 240,
            keepInView: true,
            autoPanPadding: [20, 30],
          })
          .on('click', () => onSelect(record));

        markersRef.current.push({ marker, record, handlerId });
      });
  }, [records]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusRecord?.lat || !focusRecord?.lng) return;

    const targetZoom = 16;
    const mapSize = map.getSize();

    // 마커를 뷰포트 75% 위치에 배치해 팝업(마커 위쪽) 잘림 방지
    const yOffset = mapSize.y * 0.25;
    const markerPx = map.project([focusRecord.lat, focusRecord.lng], targetZoom);
    const newCenter = map.unproject(
      L.point(markerPx.x, markerPx.y - yOffset),
      targetZoom
    );

    map.flyTo(newCenter, targetZoom, { duration: 0.8 });

    const found = markersRef.current.find(({ record }) => record === focusRecord);
    if (found) {
      map.once('moveend', () => found.marker.openPopup());
    }
  }, [focusRecord]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
