/**
 * @spendtogether/domain — every financial formula in the specification.
 *
 * This package is PURE: no framework, database or UI imports, and no ambient
 * clock. Its only runtime dependencies will be decimal.js and date-fns-tz.
 * The API, server components, the mock backend and the offline client all call
 * these same functions, which is what makes one implementation trustworthy.
 *
 * Populated in phase F2 with F-01 through F-24 at 100% line and branch coverage.
 */
export const DOMAIN_PACKAGE = '@spendtogether/domain' as const;
