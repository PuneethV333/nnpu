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

/**
 * Rupees typed by an admin → integer paise, or `null` when it is not a money
 * amount.
 *
 * The API only ever accepts integer paise, and every fee input is rupee text,
 * so the conversion happens exactly once, here, instead of as `/ 100` at each
 * call site. Accepts `50000`, `50,000`, `50000.5` and `50000.50`; rejects
 * negatives, more than two decimals and anything non-numeric. Returning `null`
 * rather than rounding is deliberate — a silently rounded fee is charged to
 * every student in the section, so the form must refuse it instead.
 */
export const rupeesToPaise = (text: string): number | null => {
  const cleaned = text.replace(/,/g, '').trim();
  // `\d{0,2}` (not `\d{1,2}`) so the in-progress "5000." while typing parses
  // as 5000 instead of making the running total flicker to zero.
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;

  const [whole, fraction = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
};

export const formatDate = (d: Date): string =>
  d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
