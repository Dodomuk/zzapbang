import { useMemo, useRef, useEffect } from 'react';
import { depositColor, formatDeposit, parseDeposit, formatArea } from '../utils/deposit';

const MONTHLY_COLOR = '#1677ff';

function recordColor(r) {
  return r.type === '월세' ? MONTHLY_COLOR : depositColor(r.deposit);
}

function primarySortKey(r) {
  if (r.type === '월세') return parseInt(r.monthlyRent || 0, 10);
  return parseDeposit(r.deposit) || Infinity;
}

export default function RecordList({ records, selectedRecord, onSelect, typeFilter }) {
  const selectedRef = useRef(null);

  const sorted = useMemo(() => {
    const filtered =
      typeFilter === '전체'
        ? records
        : records.filter((r) => (r.type || '전세') === typeFilter);
    return [...filtered].sort((a, b) => primarySortKey(a) - primarySortKey(b));
  }, [records, typeFilter]);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedRecord]);

  if (sorted.length === 0) return null;

  return (
    <ul className="record-list">
      {sorted.map((r, i) => {
        const color = recordColor(r);
        const isSelected = r === selectedRecord;
        const isMonthly = r.type === '월세';

        return (
          <li
            key={i}
            ref={isSelected ? selectedRef : null}
            className={`record-row${isSelected ? ' record-row--selected' : ''}`}
            onClick={() => onSelect(r)}
          >
            <span className="record-dot" style={{ background: isMonthly ? 'transparent' : color, border: isMonthly ? `2px solid ${color}` : 'none' }} />
            <div className="record-info">
              <div className="record-top">
                <span className={`type-badge type-badge--${isMonthly ? 'monthly' : 'jeonse'}`}>
                  {r.type || '전세'}
                </span>
                <span className="record-deposit" style={{ color }}>
                  {isMonthly
                    ? `월 ${parseInt(r.monthlyRent || 0).toLocaleString()}만`
                    : formatDeposit(r.deposit)}
                </span>
                <span className="record-name">{r.apartment}</span>
              </div>
              <div className="record-bottom">
                {isMonthly && r.deposit !== '0' && (
                  <span className="record-sub-deposit">보증금 {formatDeposit(r.deposit)} · </span>
                )}
                {r.gu} {r.dong} · {r.floor}층 · {formatArea(r.area)}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
