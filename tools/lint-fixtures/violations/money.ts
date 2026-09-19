// Each numbered line below MUST be reported by the money rule.
// The fixture exercises all four selectors, one apiece.
export const amount_minor = 1250;
export const balance_minor = 500;

export const a = parseFloat('12.50'); // 1 - float parsing
export const b = Number(amount_minor); // 2 - float coercion of money
export const c = amount_minor * 1.2; // 3 - float multiplication of money
export const d = balance_minor / 3; // 4 - float division of money
export const e = Math.round(12.5); // 5 - wrong rounding mode for money
