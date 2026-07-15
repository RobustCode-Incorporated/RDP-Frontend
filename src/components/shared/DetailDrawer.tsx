import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

interface DetailItem {
  label: string;
  value: ReactNode;
}

interface DetailSection {
  title: string;
  items: DetailItem[];
}

interface DetailDrawerProps {
  isOpen: boolean;
  title: string;
  subtitle: string;
  badge?: ReactNode;
  sections: DetailSection[];
  footer?: ReactNode;
  onClose: () => void;
}

export function DetailDrawer({
  isOpen,
  title,
  subtitle,
  badge,
  sections,
  footer,
  onClose,
}: DetailDrawerProps) {
  const drawerId = useId();
  const titleId = `${drawerId}-title`;
  const subtitleId = `${drawerId}-subtitle`;
  const containerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousActiveRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    return () => {
      previousActiveRef.current?.focus();
    };
  }, [isOpen]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab' || !containerRef.current) {
      return;
    }

    const focusable = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement as HTMLElement | null;

    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/55 p-0 sm:p-4">
      <button
        type="button"
        aria-label="Fermer le panneau de détails"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />

      <aside
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Détail</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 id={titleId} className="text-2xl font-semibold text-slate-900">{title}</h2>
                {badge ? badge : null}
              </div>
              <p id={subtitleId} className="mt-2 text-sm text-slate-500">{subtitle}</p>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-black hover:text-black"
            >
              Fermer
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {sections.map((section) => (
              <section key={section.title} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {section.title}
                </h3>
                <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {section.items.map((item) => (
                    <div key={item.label} className="rounded-2xl bg-white p-4 shadow-sm">
                      <dt className="text-sm text-slate-400">{item.label}</dt>
                      <dd className="mt-1 text-sm font-medium text-slate-900">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>

        {footer ? <div className="border-t border-slate-200 px-6 py-4">{footer}</div> : null}
      </aside>
    </div>
  );
}
