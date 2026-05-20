import { useState, useEffect, useRef } from 'react';
import KakaoMap from './components/KakaoMap';
import RecordList from './components/RecordList';
import { formatDeposit, parseDeposit } from './utils/deposit';
import './App.css';

const LEGEND_JEONSE = [
  { label: '3억 미만', color: '#52c41a' },
  { label: '3~5억', color: '#fadb14' },
  { label: '5~10억', color: '#fa8c16' },
  { label: '10억+', color: '#f5222d' },
];

const TYPE_OPTIONS = ['전체', '전세', '월세'];

export default function App() {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [typeFilter, setTypeFilter] = useState('전체');
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
        setLoading(false);
      })
      .catch(() => {
        setRecords([]);
        setLoading(false);
      });
  }, [selectedDate]);

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

  const displayRecords =
    typeFilter === '전체'
      ? records
      : records.filter((r) => (r.type || '전세') === typeFilter);

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
              <ul className="date-dropdown">
                {dates.length === 0 && (
                  <li className="date-option date-option--empty">데이터 없음</li>
                )}
                {dates.map((d) => (
                  <li
                    key={d}
                    className={`date-option${d === selectedDate ? ' date-option--active' : ''}`}
                    onClick={() => {
                      setSelectedDate(d);
                      setShowDateDropdown(false);
                    }}
                  >
                    {d}
                  </li>
                ))}
              </ul>
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
                  className={`type-btn${typeFilter === opt ? ' type-btn--active' : ''}`}
                  onClick={() => {
                    setTypeFilter(opt);
                    setSelectedRecord(null);
                  }}
                >
                  {opt === '전체'
                    ? `전체 ${records.length}`
                    : opt === '전세'
                    ? `전세 ${jeonseCount}`
                    : `월세 ${monthlyCount}`}
                </button>
              ))}
            </div>

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
          {loading ? (
            <p className="list-loading">불러오는 중...</p>
          ) : (
            <RecordList
              records={records}
              selectedRecord={selectedRecord}
              onSelect={setSelectedRecord}
              typeFilter={typeFilter}
            />
          )}
        </div>
      </div>
    </div>
  );
}
