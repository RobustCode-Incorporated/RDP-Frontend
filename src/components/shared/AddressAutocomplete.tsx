import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { MIN_QUERY_LENGTH, searchAddresses, type GeocodeResult } from '../../lib/nominatim';

export const ADDRESS_DEBOUNCE_MS = 600;

interface AddressAutocompleteProps {
  label: string;
  value: string;
  /** Free-text edit. The parent should drop previously selected coordinates. */
  onChange: (value: string) => void;
  /** A suggestion was chosen: address text + coordinates. */
  onSelect: (result: GeocodeResult) => void;
  /** True when the current value comes from a suggestion (coordinates known). */
  hasCoordinates?: boolean;
  error?: string;
  required?: boolean;
  placeholder?: string;
  name?: string;
}

type SearchState = { query: string; items: GeocodeResult[]; failed: boolean };

export function AddressAutocomplete({
  label,
  value,
  onChange,
  onSelect,
  hasCoordinates = false,
  error,
  required,
  placeholder = 'Rue, numéro, commune…',
  name,
}: AddressAutocompleteProps) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [search, setSearch] = useState<SearchState>({ query: '', items: [], failed: false });
  const debouncedValue = useDebouncedValue(value, ADDRESS_DEBOUNCE_MS);
  const query = debouncedValue.trim();
  const shouldSearch = isOpen && !hasCoordinates && query.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!shouldSearch) {
      return;
    }
    const controller = new AbortController();
    searchAddresses(query, { signal: controller.signal })
      .then((items) => setSearch({ query, items, failed: false }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setSearch({ query, items: [], failed: true });
      });
    return () => controller.abort();
  }, [query, shouldSearch]);

  const isSearching = shouldSearch && search.query !== query;
  const suggestions = shouldSearch && search.query === query ? search.items : [];
  const showList = shouldSearch;

  const choose = (item: GeocodeResult) => {
    onSelect(item);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-600">
        {label}{required ? ' *' : ''}
      </label>
      <input
        id={inputId}
        name={name}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={Boolean(error)}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={handleKeyDown}
        className={`rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-black ${error ? 'border-rose-400' : 'border-slate-200'}`}
      />
      <p className="text-xs text-slate-400">
        {hasCoordinates
          ? 'Adresse localisée sur la carte.'
          : 'Choisissez une suggestion pour localiser l’adresse (saisie libre possible).'}
      </p>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[4.6rem] z-30 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          {isSearching ? <li className="px-4 py-2 text-slate-400">Recherche…</li> : null}
          {!isSearching && search.failed ? (
            <li className="px-4 py-2 text-amber-700">Suggestions indisponibles, saisie libre possible.</li>
          ) : null}
          {!isSearching && !search.failed && suggestions.length === 0 ? (
            <li className="px-4 py-2 text-slate-400">Aucune adresse trouvée en Belgique.</li>
          ) : null}
          {!isSearching && suggestions.map((item, index) => (
            <li
              key={`${item.latitude},${item.longitude},${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(item);
              }}
              className={`cursor-pointer px-4 py-2 ${index === activeIndex ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
            >
              {item.label}
            </li>
          ))}
          <li className="border-t border-slate-100 px-4 pt-1 text-[0.65rem] text-slate-400">© OpenStreetMap contributors</li>
        </ul>
      ) : null}
    </div>
  );
}
