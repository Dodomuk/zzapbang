import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { depositColor, formatDeposit, formatArea } from '../utils/deposit';
import { nearestStation } from '../data/subway';
import { favoriteKey, MAX_FAVORITES } from '../utils/favorites';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MONTHLY_COLOR = '#1677ff';

// 서울 지하철 호선별 공식 색상
const LINE_COLOR = {
  '1호선': '#0052A4', '2호선': '#00A84D', '3호선': '#EF7C1C', '4호선': '#00A5DE',
  '5호선': '#996CAC', '6호선': '#CD7C2F', '7호선': '#747F00', '8호선': '#E6186C',
  '9호선': '#BDB092', '신분당': '#D31145', '분당선': '#F5A200',
  '공항철도': '#0065B3', '경의중앙': '#77C4A3',
};
const LINE_SHORT = {
  '1호선': '1', '2호선': '2', '3호선': '3', '4호선': '4', '5호선': '5',
  '6호선': '6', '7호선': '7', '8호선': '8', '9호선': '9',
  '신분당': '신', '분당선': '분', '공항철도': '공', '경의중앙': '경',
};

function stationSign(station) {
  const lines = station.line.split('·');
  const primaryColor = LINE_COLOR[lines[0]] || '#888';
  const badges = lines
    .map((l) => {
      const bg = LINE_COLOR[l] || '#888';
      const txt = LINE_SHORT[l] || l[0];
      return `<span style="display:inline-flex;align-items:center;justify-content:center;` +
        `width:20px;height:20px;border-radius:50%;background:${bg};` +
        `color:#fff;font-size:10px;font-weight:800;flex-shrink:0">${txt}</span>`;
    })
    .join('');
  return (
    `<div style="display:inline-flex;align-items:center;gap:4px;` +
    `margin:5px 0 8px;border:2px solid ${primaryColor};border-radius:16px;` +
    `padding:3px 10px 3px 3px;background:#fff">` +
    `${badges}` +
    `<span style="font-size:12px;font-weight:700;color:#222">${station.name}</span>` +
    `<span style="font-size:10px;color:#888">· 도보 약 ${station.walkMin}분</span>` +
    `</div>`
  );
}

// 팝업 버튼 핸들러 레지스트리 (HTML 문자열 팝업 → 글로벌 클로저 패턴)
if (!window.__zzapShareRegistry) window.__zzapShareRegistry = {};
if (!window.__zzapFavRegistry) window.__zzapFavRegistry = {};

function updateFavBtn(btn, isFav) {
  btn.textContent = isFav ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기 추가';
  btn.style.background = isFav ? '#fadb14' : 'rgba(255,255,255,0.08)';
  btn.style.color = isFav ? '#3A1D1D' : '#aaa';
  btn.style.borderColor = isFav ? '#fadb14' : 'rgba(255,255,255,0.15)';
}

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
  const stationHtml = station ? stationSign(station) : '';

  const q = encodeURIComponent(`${record.apartment} 아파트`);
  const naverSearchUrl = `https://search.naver.com/search.naver?query=${q}`;
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

  const favStyle =
    'display:block;width:100%;padding:6px 8px;background:rgba(255,255,255,0.08);' +
    'border:1px solid rgba(255,255,255,0.15);border-radius:5px;color:#aaa;font-size:12px;' +
    'cursor:pointer;text-align:center;margin-top:4px;box-sizing:border-box';

  return `
    <div style="min-width:200px;line-height:1.5;font-size:13px">
      <div style="font-weight:700;font-size:14px;margin-bottom:2px">${record.apartment}</div>
      <div style="color:#888;font-size:11px">${record.dong} · ${record.floor}층 · ${formatArea(record.area)}</div>
      <div style="color:${color};font-size:14px;font-weight:700;margin:5px 0">${depositLine}</div>
      ${stationHtml}
      <div style="margin-top:8px">
        <a href="${naverSearchUrl}" target="_blank" rel="noopener" style="${linkStyle}">🏠 아파트 사진·평면도 보기</a>
        <a href="${roadviewUrl}" target="_blank" rel="noopener" style="${linkStyle}">🗺️ 주변 환경 보기</a>
        <a href="${naverSearch}" target="_blank" rel="noopener" style="${linkStyle}margin-bottom:0">🌳 채광·조망·소음 확인</a>
        <button
          id="${handlerId}-fav"
          onclick="window.__zzapFavRegistry['${handlerId}']()"
          style="${favStyle}"
        >☆ 즐겨찾기 추가</button>
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

    // 딥링크: 받는 사람이 열면 해당 매물로 자동 포커스
    const params = new URLSearchParams({
      date: record.date,
      apt: record.apartment,
      dong: record.dong,
      floor: record.floor,
    });
    const shareUrl = `${window.location.origin}/?${params.toString()}`;

    const shareText = [
      `🏠 ${record.apartment}`,
      `${record.gu} ${record.dong} · ${record.floor}층 · ${formatArea(record.area)}`,
      depositLine,
    ].join('\n');

    if (navigator.share) {
      try {
        // url 필드 제거: KakaoTalk이 url 필드를 og:url로 교체해 파라미터 손실
        // text에 URL 포함 → 카톡 메시지에 전체 URL이 그대로 노출됨
        await navigator.share({ title: record.apartment, text: `${shareText}\n${shareUrl}` });
      } catch (e) {
        // AbortError = 사용자가 공유 취소, 무시
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        if (btn) {
          btn.textContent = '✅ 복사됐어요!';
          setTimeout(() => { btn.textContent = '💬 카카오톡 공유'; }, 2000);
        }
      } catch (_) {}
    }
  };
}

function registerFavHandler(record, handlerId) {
  window.__zzapFavRegistry[handlerId] = () => {
    const currentFavs = window.__zzapCurrentFavorites || [];
    const key = favoriteKey(record);
    const idx = currentFavs.findIndex((f) => favoriteKey(f) === key);
    let newFavs;
    if (idx >= 0) {
      newFavs = currentFavs.filter((_, i) => i !== idx);
    } else {
      if (currentFavs.length >= MAX_FAVORITES) {
        alert(`즐겨찾기는 최대 ${MAX_FAVORITES}개까지 가능합니다.`);
        return;
      }
      newFavs = [...currentFavs, record];
    }
    if (window.__onFavoritesChange) window.__onFavoritesChange(newFavs);
    const favBtn = document.getElementById(`${handlerId}-fav`);
    if (favBtn) updateFavBtn(favBtn, newFavs.some((f) => favoriteKey(f) === key));
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
      attributionControl: false,
    });

    L.control.attribution({ position: 'topright', prefix: false }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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

    // 기존 마커 및 핸들러 정리
    markersRef.current.forEach(({ marker, handlerId }) => {
      marker.remove();
      delete window.__zzapShareRegistry[handlerId];
      delete window.__zzapFavRegistry[handlerId];
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
        registerFavHandler(record, handlerId);

        const marker = L.marker([record.lat, record.lng], { icon })
          .addTo(map)
          .bindPopup(buildPopup(record, handlerId), {
            maxWidth: 240,
            keepInView: true,
            autoPanPadding: [20, 30],
          })
          .on('click', () => onSelect(record))
          .on('popupopen', () => {
            const favBtn = document.getElementById(`${handlerId}-fav`);
            if (!favBtn) return;
            const currentFavs = window.__zzapCurrentFavorites || [];
            updateFavBtn(favBtn, currentFavs.some((f) => favoriteKey(f) === favoriteKey(record)));
          });

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
