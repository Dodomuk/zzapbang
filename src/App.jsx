import { useState, useEffect, useRef, useMemo } from 'react';
import KakaoMap from './components/KakaoMap';
import RecordList from './components/RecordList';
import FavoritesList from './components/FavoritesList';
import DateCalendar from './components/DateCalendar';
import { formatDeposit, parseDeposit } from './utils/deposit';
import { loadFavorites, saveFavorites } from './utils/favorites';
import './App.css';

const LEGEND_JEONSE = [
  { label: '3억 미만', color: '#52c41a' },
  { label: '3~5억', color: '#fadb14' },
  { label: '5~10억', color: '#fa8c16' },
  { label: '10억+', color: '#f5222d' },
];

const TYPE_OPTIONS = ['전체', '전세', '월세', '★'];

export default function App() {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [typeFilter, setTypeFilter] = useState('전체');
  const [guFilter, setGuFilter] = useState('전체');
  const [showGuPopup, setShowGuPopup] = useState(false);
  const [favorites, setFavorites] = useState(() => loadFavorites());
  const datepickerRef = useRef(null);

  useEffect(() => {
    fetch('/data/index.json')
      .then((r) => r.json())
      .then((data) => {
        setDates(data);
        if (data.length > 0) setSelectedDate(data[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    setSelectedRecord(null);
    fetch(`/data/${selectedDate}.json`)
      .then((r) => r.json())
      .then((data) => {
        setRecords(data);
        setGuFilter('전체');
        setLoading(false);
      })
      .catch(() => {
        setRecords([]);
        setLoading(false);
      });
  }, [selectedDate]);

  useEffect(() => {
    window.__zzapCurrentFavorites = favorites;
  }, [favorites]);

  useEffect(() => {
    window.__onFavoritesChange = (newFavs) => {
      setFavorites(newFavs);
      saveFavorites(newFavs);
    };
    return () => { window.__onFavoritesChange = null; };
  }, []);

  useEffect(() => {
    const handleOutside = (e) => {
      if (datepickerRef.current && !datepickerRef.current.contains(e.target)) {
        setShowDateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  const typeFiltered =
    typeFilter === '★'
      ? favorites
      : typeFilter === '전체'
      ? records
      : records.filter((r) => (r.type || '전세') === typeFilter);

  const guOptions = useMemo(() => {
    const guSet = new Set(typeFiltered.map((r) => r.gu).filter(Boolean));
    return ['전체', ...Array.from(guSet).sort()];
  }, [typeFiltered]);

  const displayRecords =
    typeFilter === '★' || guFilter === '전체'
      ? typeFiltered
      : typeFiltered.filter((r) => r.gu === guFilter);

  const withCoords = displayRecords.filter((r) => r.lat && r.lng);
  const deposits = displayRecords.map((r) => parseDeposit(r.deposit)).filter(Boolean);
  const avg = deposits.length
    ? Math.round(deposits.reduce((a, b) => a + b, 0) / deposits.length)
    : 0;

  const jeonseCount = records.filter((r) => (r.type || '전세') === '전세').length;
  const monthlyCount = records.filter((r) => r.type === '월세').length;

  return (
    <div className="app">
      <div className="map-wrap">
        <KakaoMap
          records={displayRecords}
          onSelect={setSelectedRecord}
          focusRecord={selectedRecord}
        />
      </div>

      <div className="side-panel">
        <div className="panel-header">
          <span className="brand">짭방</span>

          <div className="date-picker" ref={datepickerRef}>
            <button
              className="date-btn"
              onClick={() => setShowDateDropdown((v) => !v)}
              aria-expanded={showDateDropdown}
            >
              {selectedDate || '날짜 선택'}
              <span className="date-caret" aria-hidden="true">▾</span>
            </button>
            {showDateDropdown && (
              <DateCalendar
                dates={dates}
                selectedDate={selectedDate}
                onSelect={(d) => {
                  setSelectedDate(d);
                  setShowDateDropdown(false);
                }}
              />
            )}
          </div>
        </div>

        {!loading && records.length > 0 && (
          <div className="stats-bar">
            <div className="stats-numbers">
              <span>
                지도 <strong>{withCoords.length}</strong>건
              </span>
              {typeFilter !== '월세' && avg > 0 && (
                <span>
                  전세평균 <strong>{formatDeposit(String(avg))}</strong>
                </span>
              )}
            </div>

            <div className="type-filter">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className={`type-btn${typeFilter === opt ? ' type-btn--active' : ''}${opt === '★' ? ' type-btn--star' : ''}`}
                  onClick={() => {
                    setTypeFilter(opt);
                    setSelectedRecord(null);
                  }}
                >
                  {opt === '전체'
                    ? `전체 ${records.length}`
                    : opt === '전세'
                    ? `전세 ${jeonseCount}`
                    : opt === '월세'
                    ? `월세 ${monthlyCount}`
                    : `★ ${favorites.length}`}
                </button>
              ))}
            </div>

            {typeFilter !== '★' && (
              <div className="gu-filter-row">
                <div className="city-filter-wrap">
                  <button className="city-filter-btn">
                    서울시
                    <span className="gu-filter-caret">▾</span>
                  </button>
                  <span className="city-coming-soon">추후 업데이트 됩니다!</span>
                </div>

                {guOptions.length > 2 && (
                  <>
                    <button
                      className={`gu-filter-btn${guFilter !== '전체' ? ' gu-filter-btn--active' : ''}`}
                      onClick={() => setShowGuPopup(true)}
                    >
                      <span className="gu-filter-icon">⊞</span>
                      {guFilter === '전체' ? '구 전체' : guFilter}
                      <span className="gu-filter-caret">▾</span>
                    </button>
                    {guFilter !== '전체' && (
                      <button
                        className="gu-filter-clear"
                        onClick={() => { setGuFilter('전체'); setSelectedRecord(null); }}
                        title="필터 해제"
                      >✕</button>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="legend-row">
              {LEGEND_JEONSE.map(({ label, color }) => (
                <span key={label} className="legend-item">
                  <i style={{ background: color }} />
                  {label}
                </span>
              ))}
              <span className="legend-item">
                <i style={{ background: 'transparent', border: '2px solid #1677ff', borderRadius: '50%' }} />
                월세
              </span>
            </div>
          </div>
        )}

        <div className="list-wrap">
          {typeFilter === '★' ? (
            <FavoritesList
              favorites={favorites}
              onSelect={setSelectedRecord}
              onRemove={(newFavs) => {
                setFavorites(newFavs);
                saveFavorites(newFavs);
              }}
            />
          ) : loading ? (
            <p className="list-loading">불러오는 중...</p>
          ) : (
            <RecordList
              records={displayRecords}
              selectedRecord={selectedRecord}
              onSelect={setSelectedRecord}
              typeFilter="전체"
            />
          )}
        </div>
        {showGuPopup && (
          <div className="gu-popup-overlay" onClick={() => setShowGuPopup(false)}>
            <div className="gu-popup" onClick={(e) => e.stopPropagation()}>
              <div className="gu-popup-header">
                <span className="gu-popup-title">지역 선택</span>
                <button className="gu-popup-close" onClick={() => setShowGuPopup(false)}>✕</button>
              </div>
              <div className="gu-options-grid">
                <button
                  className={`gu-option-btn gu-option-btn--all${guFilter === '전체' ? ' gu-option-btn--active' : ''}`}
                  onClick={() => { setGuFilter('전체'); setSelectedRecord(null); setShowGuPopup(false); }}
                >
                  전체
                </button>
                {guOptions.slice(1).map((gu) => (
                  <button
                    key={gu}
                    className={`gu-option-btn${guFilter === gu ? ' gu-option-btn--active' : ''}`}
                    onClick={() => { setGuFilter(gu); setSelectedRecord(null); setShowGuPopup(false); }}
                  >
                    {gu}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
