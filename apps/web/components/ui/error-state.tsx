import { AlertCircle, RotateCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './button';

// Spec §14.3 ErrorState and §19.1: plain language, no codes, a Retry. The banner variant
// sits above cached content, which stays visible.

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  variant?: 'block' | 'banner';
  retrying?: boolean;
  className?: string;
}

export function ErrorState({
  message,
  onRetry,
  variant = 'block',
  retrying = false,
  className,
}: ErrorStateProps) {
  const banner = variant === 'banner';
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-lg border',
        banner
          ? 'items-center border-status-behind-fg bg-status-behind-bg px-4 py-2'
          : 'flex-col items-center border-border-default bg-bg-card px-6 py-8 text-center',
        className,
      )}
    >
      <AlertCircle
        aria-hidden
        className={cn('shrink-0 text-fg-error', banner ? 'size-(--icon-md)' : 'size-(--icon-lg)')}
        strokeWidth={1.75}
      />
      <p className={cn('text-fg-default', banner ? 'flex-1 type-body-sm' : 'type-body-lg')}>
        {message}
      </p>
      {onRetry && (
        <Button
          variant={banner ? 'ghost' : 'tertiary'}
          size={banner ? 'sm' : 'md'}
          onClick={onRetry}
          loading={retrying}
          iconLeft={<RotateCw aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />}
        >
          Retry
        </Button>
      )}
    </div>
  );
}
