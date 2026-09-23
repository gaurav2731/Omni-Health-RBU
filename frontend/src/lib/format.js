export function formatCost(min, max) {
  const minNum = Number(min) || 0;
  const maxNum = Number(max) || 0;
  if (minNum === maxNum) return `₹${minNum.toLocaleString()}`;
  return `₹${minNum.toLocaleString()} – ₹${maxNum.toLocaleString()}`;
}

export function formatNumber(num) {
  const n = Number(num);
  return Number.isFinite(n) && n > 0 ? n.toLocaleString() : 'N/A';
}
