import { useState, useEffect } from 'react';
import KakaoMap from './components/KakaoMap';
import { depositColor, formatDeposit, parseDeposit } from './utils/deposit';
import './App.css';

const LEGEND = [
  { label: '3억 미만', color: '#52c41a' },
  { label: '3억 ~ 5억', color: '#fadb14' },
  { label: '5억 ~ 10억', color: '#fa8c16' },
  { label: '10억 이상', color: '#f5222d' },
];

export default function App() {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const withCoords = records.filter((r) => r.lat && r.lng);
  const deposits = records.map((r) => parseDeposit(r.deposit)).filter(Boolean);
  const avg = deposits.length
    ? Math.round(deposits.reduce((a, b) => a + b, 0) / deposits.length)
    : 0;

  return (
    <div className="app">
      <div className="map-wrap">
        <KakaoMap records={records} onSelect={setSelectedRecord} />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">짭방</div>
          <div className="panel-subtitle">서울 아파트 전세 실거래가</div>
        </div>

        <div className="panel-section">
          <span className="panel-label">날짜 선택</span>
          <select
            className="panel-select"
            value={selectedDate || ''}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            {dates.length === 0 && <option value="">데이터 없음</option>}
            {dates.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {!loading && records.length > 0 && (
          <div className="panel-section">
            <div className="panel-stats">
              <div className="panel-stat">
                <span className="stat-value">{records.length}</span>
                <span className="stat-label">전체 건수</span>
              </div>
              <div className="panel-stat">
                <span className="stat-value">{withCoords.length}</span>
                <span className="stat-label">지도 표시</span>
              </div>
            </div>
            <p className="panel-avg">
              평균 보증금 <strong>{formatDeposit(String(avg))}</strong>
            </p>
          </div>
        )}

        <div className="panel-section">
          <span className="panel-label">보증금 범위</span>
          <div className="panel-legend">
            {LEGEND.map(({ label, color }) => (
              <div key={label} className="legend-item">
                <span className="legend-dot" style={{ background: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {selectedRecord && (
          <div className="selected-card">
            <p className="card-apt">{selectedRecord.apartment}</p>
            <p className="card-addr">{selectedRecord.gu} {selectedRecord.dong}</p>
            <p className="card-detail">{selectedRecord.area}㎡ · {selectedRecord.floor}층</p>
            <p className="card-deposit" style={{ color: depositColor(selectedRecord.deposit) }}>
              {formatDeposit(selectedRecord.deposit)}
            </p>
          </div>
        )}

        {loading && <p className="panel-loading">불러오는 중...</p>}
      </div>
    </div>
  );
}
