// The frozen API contract (spec §10). Changing anything exported from here after F1
// requires an ADR and a matching update to the backend plan (CLAUDE.md, ADR-002).
export * from './primitives';
export * from './errors';
export * from './auth';
export * from './me';
export * from './currencies';
export * from './categories';
export * from './transactions';
export * from './goals';
export * from './contributions';
export * from './couple';
export * from './invitations';
export * from './insights';
export * from './activity';
export * from './home';
export * from './endpoints';
