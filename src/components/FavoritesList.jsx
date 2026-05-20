import { favoriteKey } from '../utils/favorites';
import { formatDeposit, depositColor, formatArea } from '../utils/deposit';

const MONTHLY_COLOR = '#1677ff';

export default function FavoritesList({ favorites, onSelect, onRemove }) {
  if (favorites.length === 0) {
    return (
      <div className="favlist-empty">
        <div className="favlist-empty-icon">☆</div>
        <p>즐겨찾기가 없어요</p>
        <p className="favlist-empty-hint">
          지도 마커를 클릭하고<br />
          팝업의 ☆ 버튼으로 추가하세요
        </p>
      </div>
    );
  }

  return (
    <ul className="record-list">
      {favorites.map((r) => {
        const key = favoriteKey(r);
        const isMonthly = r.type === '월세';
        const color = isMonthly ? MONTHLY_COLOR : depositColor(r.deposit);

        return (
          <li
            key={key}
            className="record-row fav-row"
            onClick={() => onSelect(r)}
          >
            <div
              className="record-dot"
              style={
                isMonthly
                  ? { background: 'transparent', border: `2.5px solid ${color}` }
                  : { background: color }
              }
            />
            <div className="record-info">
              <div className="record-top">
                <span className={`type-badge ${isMonthly ? 'type-badge--monthly' : 'type-badge--jeonse'}`}>
                  {r.type || '전세'}
                </span>
                <span className="record-deposit" style={{ color }}>
                  {formatDeposit(r.deposit)}
                </span>
                <span className="record-name">{r.apartment}</span>
              </div>
              <div className="record-bottom">
                {r.dong} · {r.floor}층 · {formatArea(r.area)}
                {isMonthly && ` · 월 ${parseInt(r.monthlyRent || 0).toLocaleString()}만`}
                {r.date && ` · ${r.date}`}
              </div>
            </div>
            <button
              className="fav-remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(favorites.filter((f) => favoriteKey(f) !== key));
              }}
              title="즐겨찾기 해제"
            >
              ✕
            </button>
          </li>
        );
      })}
    </ul>
  );
}
