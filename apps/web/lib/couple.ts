// Display helpers for the couple screens (F10). Names only: nothing here can describe a
// partner's money, because the contract carries none (BR-05).

/** The first word of a name ("Sam Tweh" → "Sam"); the whole name if it has no space. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/**
 * §7.9's typed confirmation: the partner's first name, ignoring case, surrounding spaces
 * and accents ("sam", " Sam ", "Sám" all confirm "Sam Tweh").
 */
export function confirmsName(typed: string, partnerName: string): boolean {
  const norm = (s: string) =>
    s
      .trim()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase();
  const expected = norm(firstName(partnerName));
  return expected.length > 0 && norm(typed) === expected;
}

/** The privacy promise, shown before anyone is invited (W-07, ux-ui-specification). */
export const COUPLE_PRIVACY =
  'Your partner sees shared goals only. Your income, expenses and personal goals always stay private.';

/** SCR-20's promise to the invitee. */
export const INVITE_PRIVACY =
  "You'll share savings goals — not your income, expenses or personal goals.";

export const OFFLINE_BLOCKED = 'Connect to the internet to do this.';
