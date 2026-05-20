import { useState, useMemo } from 'react';

const DOW = ['월', '화', '수', '목', '금', '토', '일'];

export default function DateCalendar({ dates, startDate, endDate, onSelect }) {
  const available = useMemo(() => new Set(dates), [dates]);

  const [viewYear, setViewYear] = useState(() => {
    const d = dates[0] ? new Date(dates[0] + 'T00:00:00') : new Date();
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = dates[0] ? new Date(dates[0] + 'T00:00:00') : new Date();
    return d.getMonth();
  });

  // 두 번 클릭으로 기간 선택: 첫 클릭 = 시작, 두 번째 클릭 = 종료
  const [pendingStart, setPendingStart] = useState(null);

  const cells = useMemo(() => {
    const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const result = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      result.push(
        `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      );
    }
    return result;
  }, [viewYear, viewMonth]);

  function handleDayClick(dateStr) {
    if (!available.has(dateStr)) return;
    if (!pendingStart) {
      // 첫 번째 클릭: 시작 날짜 대기 상태
      setPendingStart(dateStr);
    } else if (dateStr >= pendingStart) {
      // 두 번째 클릭 (시작보다 같거나 이후): 기간 확정
      onSelect(pendingStart, dateStr);
      setPendingStart(null);
    } else {
      // 시작보다 이전을 클릭: 새 시작으로 리셋
      setPendingStart(dateStr);
    }
  }

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

  // 표시용 범위: 대기 중이면 pendingStart만, 아니면 확정 범위
  const displayStart = pendingStart || startDate;
  const displayEnd = pendingStart ? null : endDate;

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
          const dow = (new Date(dateStr + 'T00:00:00').getDay() + 6) % 7;
          const isSat = dow === 5;
          const isSun = dow === 6;

          const isStart = dateStr === displayStart;
          const isEnd = dateStr === displayEnd;
          const inRange = displayStart && displayEnd
            && dateStr > displayStart && dateStr < displayEnd;
          const isPending = dateStr === pendingStart;

          return (
            <button
              key={dateStr}
              className={[
                'cal-day',
                hasData ? 'cal-day--has-data' : '',
                isStart && !isPending ? 'cal-day--range-start' : '',
                isEnd ? 'cal-day--range-end' : '',
                inRange ? 'cal-day--in-range' : '',
                isPending ? 'cal-day--pending' : '',
                isSat ? 'cal-day--sat' : '',
                isSun ? 'cal-day--sun' : '',
              ].filter(Boolean).join(' ')}
              disabled={!hasData}
              onClick={() => handleDayClick(dateStr)}
            >
              {parseInt(dateStr.slice(-2))}
              {hasData && <span className="cal-day-dot" />}
            </button>
          );
        })}
      </div>

      {pendingStart && (
        <div className="cal-hint">종료 날짜를 선택하세요</div>
      )}
    </div>
  );
}
