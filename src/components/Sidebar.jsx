import { depositColor, formatDeposit, parseDeposit } from '../utils/deposit';
import styles from './Sidebar.module.css';

const LEGEND = [
  { label: '3억 미만', color: '#52c41a' },
  { label: '3억 ~ 5억', color: '#fadb14' },
  { label: '5억 ~ 10억', color: '#fa8c16' },
  { label: '10억 이상', color: '#f5222d' },
];

export default function Sidebar({ dates, selectedDate, onDateChange, records, selectedRecord, loading }) {
  const withCoords = records.filter((r) => r.lat && r.lng);
  const deposits = records.map((r) => parseDeposit(r.deposit)).filter(Boolean);
  const avg = deposits.length
    ? Math.round(deposits.reduce((a, b) => a + b, 0) / deposits.length)
    : 0;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h1 className={styles.title}>짭방</h1>
        <p className={styles.subtitle}>서울 아파트 전세 실거래가</p>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>날짜 선택</span>
        <select
          className={styles.select}
          value={selectedDate || ''}
          onChange={(e) => onDateChange(e.target.value)}
        >
          {dates.length === 0 && <option value="">데이터 없음</option>}
          {dates.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {!loading && records.length > 0 && (
        <div className={styles.section}>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{records.length}</span>
              <span className={styles.statLabel}>전체 건수</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{withCoords.length}</span>
              <span className={styles.statLabel}>지도 표시</span>
            </div>
          </div>
          <p className={styles.avg}>
            평균 보증금 <strong>{formatDeposit(String(avg))}</strong>
          </p>
        </div>
      )}

      <div className={styles.section}>
        <span className={styles.label}>보증금 범위</span>
        <div className={styles.legend}>
          {LEGEND.map(({ label, color }) => (
            <div key={label} className={styles.legendItem}>
              <span className={styles.dot} style={{ background: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedRecord && (
        <div className={styles.section}>
          <span className={styles.label}>선택된 거래</span>
          <div className={styles.card}>
            <p className={styles.aptName}>{selectedRecord.apartment}</p>
            <p className={styles.aptAddr}>
              {selectedRecord.gu} {selectedRecord.dong}
            </p>
            <p className={styles.aptDetail}>
              {selectedRecord.area}㎡ · {selectedRecord.floor}층
            </p>
            <p
              className={styles.aptDeposit}
              style={{ color: depositColor(selectedRecord.deposit) }}
            >
              {formatDeposit(selectedRecord.deposit)}
            </p>
          </div>
        </div>
      )}

      {loading && <p className={styles.loading}>불러오는 중...</p>}
    </aside>
  );
}
