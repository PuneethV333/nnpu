/**
 * Every fee/payment amount that crosses the API is an integer number of
 * PAISE (₹1 = 100 paise) — see `CreateFeeStructureDto`'s `@ApiProperty({
 * example: 5000000, description: 'Amount in paise (₹50,000)' })`.
 *
 * Never format these numbers with a bare `toLocaleString` — that renders
 * ₹50,000 as "₹50,000,000". Always go through `formatMoney`.
 */
export const formatMoney = (paise: number): string => {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/** Paise → a plain rupee number, for Razorpay/text inputs. */
export const paiseToRupees = (paise: number): number => paise / 100;

export const formatDate = (d: Date): string =>
  d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
