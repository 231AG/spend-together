import { cn } from '@/lib/cn';

// §11.1 (F11-09): the Open Access endpoint of ExchangeRate-API is free on condition that
// it is credited with a link. Shown in Settings → Currency and the site footer. This is a
// licensing obligation: keep the wording and the link as the provider asks.

export const FX_ATTRIBUTION_URL = 'https://www.exchangerate-api.com';

export function FxAttribution({ className }: { className?: string }) {
  return (
    <p className={cn('type-caption text-fg-muted', className)}>
      Exchange rates:{' '}
      <a href={FX_ATTRIBUTION_URL} className="text-fg-link underline" rel="noopener">
        Rates By Exchange Rate API
      </a>
    </p>
  );
}

/** The site footer: the attribution, on every page that shows money. */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('border-t border-border-default py-4', className)}>
      <FxAttribution />
    </footer>
  );
}
