export function lakhsToRupees(lakhs: number) {
  // 1 lakh = 1e5 INR
  return lakhs * 100_000;
}

export function formatLakhs(lakhs: number) {
  const rupees = lakhsToRupees(lakhs);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function formatLakhsCompact(lakhs: number) {
  // Display like ₹5L / ₹1Cr for readability.
  if (lakhs >= 100) {
    const cr = lakhs / 100;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)}Cr`;
  }
  return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`;
}

