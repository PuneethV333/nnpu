/**
 * Every fee/payment amount that crosses the API is an integer number of PAISE
 * (₹1 = 100 paise) — see the backend's `CreateFeeStructureDto`, which documents
 * `5000000` as `'Amount in paise (₹50,000)'`.
 *
 * Never format these with a bare `toLocaleString`: ₹50,000 in paise is
 * 5000000, which prints as "₹50,00,000". This is the only place the /100
 * happens, and `en-IN` gives lakh/crore grouping, which is what the front desk
 * reads.
 */
export const formatMoney = (paise: number): string => {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
