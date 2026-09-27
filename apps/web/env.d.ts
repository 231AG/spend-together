// Declares the public variables validated in lib/env.ts so they can be read with dot
// access, which is the form Next.js inlines into the client bundle.
declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_API_MODE?: string;
    readonly NEXT_PUBLIC_API_BASE_URL?: string;
  }
}
