export function parseDeposit(str) {
  return parseInt(String(str || '0').replace(/,/g, ''), 10) || 0;
}

export function formatDeposit(str) {
  const amount = parseDeposit(str);
  if (amount >= 10000) {
    const uk = Math.floor(amount / 10000);
    const rest = amount % 10000;
    if (rest === 0) return `${uk}억`;
    return `${uk}억 ${rest.toLocaleString()}만`;
  }
  return `${amount.toLocaleString()}만`;
}

export function formatArea(sqmStr) {
  const sqm = parseFloat(sqmStr);
  if (!sqm) return `${sqmStr}㎡`;
  const pyeong = Math.floor(sqm / 3.3058);
  return `${pyeong}평 (${sqm}㎡)`;
}

export function depositColor(str) {
  const amount = parseDeposit(str);
  if (amount < 30000) return '#52c41a';
  if (amount < 50000) return '#fadb14';
  if (amount < 100000) return '#fa8c16';
  return '#f5222d';
}
