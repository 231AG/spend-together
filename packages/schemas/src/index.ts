/**
 * @spendtogether/schemas — the frozen API contract.
 *
 * Zod schemas and inferred types for every endpoint in spec 10.3 and 10.4, the
 * error envelope (10.2), the money object and cursor pagination. Populated in
 * phase F1, after which the contract is FROZEN: changing a schema requires an
 * ADR and a matching update to the backend plan (ADR-002).
 */
export const SCHEMAS_PACKAGE = '@spendtogether/schemas' as const;
