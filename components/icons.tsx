export function MailIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M2 4.5L8 9L14 4.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M3.5 2h2l1 3-1.5 1.2a8 8 0 0 0 4.8 4.8L11 9.5l3 1v2a1.3 1.3 0 0 1-1.4 1.3A11.5 11.5 0 0 1 2.2 3.4 1.3 1.3 0 0 1 3.5 2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SunIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 1.5v1.6M8 12.9v1.6M14.5 8h-1.6M3.1 8H1.5M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1M12.4 12.4l-1.1-1.1M4.7 4.7 3.6 3.6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M13.8 9.7A5.8 5.8 0 0 1 6.3 2.2a5.8 5.8 0 1 0 7.5 7.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CopyIcon({
  copied,
  className,
}: {
  copied: boolean;
  className?: string;
}) {
  if (copied) {
    return (
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
        <path
          d="M3 8.4L6.3 12L13 4.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <rect x="6" y="6" width="8" height="8" rx="1.3" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M4 10H3.3A1.3 1.3 0 0 1 2 8.7V3.3A1.3 1.3 0 0 1 3.3 2h5.4A1.3 1.3 0 0 1 10 3.3V4"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}
