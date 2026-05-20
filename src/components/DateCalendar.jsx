import { useState, useMemo } from 'react';

const DOW = ['월', '화', '수', '목', '금', '토', '일'];

export default function DateCalendar({ dates, selectedDate, onSelect }) {
  const available = useMemo(() => new Set(dates), [dates]);

  // 가장 최근 데이터가 있는 달을 초기 뷰로
  const [viewYear, setViewYear] = useState(() => {
    const d = dates[0] ? new Date(dates[0] + 'T00:00:00') : new Date();
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = dates[0] ? new Date(dates[0] + 'T00:00:00') : new Date();
    return d.getMonth(); // 0-indexed
  });

  const cells = useMemo(() => {
    const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // 0=월
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const result = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      result.push(
        `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      );
    }
    return result;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  const now = new Date();
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  return (
    <div className="cal-wrap">
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevMonth} aria-label="이전 달">‹</button>
        <span className="cal-month-label">{viewYear}년 {viewMonth + 1}월</span>
        <button
          className="cal-nav-btn"
          onClick={nextMonth}
          disabled={isCurrentMonth}
          aria-label="다음 달"
        >›</button>
      </div>

      <div className="cal-grid">
        {DOW.map((d, i) => (
          <div key={d} className={`cal-dow${i === 5 ? ' cal-dow--sat' : i === 6 ? ' cal-dow--sun' : ''}`}>
            {d}
          </div>
        ))}
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`e${i}`} className="cal-day" />;
          const hasData = available.has(dateStr);
          const isSelected = dateStr === selectedDate;
          const dow = (new Date(dateStr + 'T00:00:00').getDay() + 6) % 7;
          const isSat = dow === 5;
          const isSun = dow === 6;
          return (
            <button
              key={dateStr}
              className={[
                'cal-day',
                hasData ? 'cal-day--has-data' : '',
                isSelected ? 'cal-day--selected' : '',
                isSat ? 'cal-day--sat' : '',
                isSun ? 'cal-day--sun' : '',
              ].filter(Boolean).join(' ')}
              disabled={!hasData}
              onClick={() => onSelect(dateStr)}
              aria-pressed={isSelected}
            >
              {parseInt(dateStr.slice(-2))}
              {hasData && <span className="cal-day-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
