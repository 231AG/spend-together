import { statusFor, type ErrorCode } from '@spendtogether/schemas';

// A rule violation inside the mock store. Handlers turn it into the §10.2 envelope.
export class ApiFailure extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields: Record<string, string> | undefined;
  readonly headers: Record<string, string> | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    options: { fields?: Record<string, string>; headers?: Record<string, string> } = {},
  ) {
    super(message);
    this.name = 'ApiFailure';
    this.code = code;
    this.status = statusFor(code);
    this.fields = options.fields;
    this.headers = options.headers;
  }
}

export const notFound = (what = 'That item') =>
  new ApiFailure('NOT_FOUND', `${what} could not be found.`);

export const invalid = (field: string, message: string) =>
  new ApiFailure('VALIDATION_FAILED', 'Check the highlighted fields.', {
    fields: { [field]: message },
  });
