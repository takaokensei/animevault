import React, { useState, useRef, useEffect } from 'react';

interface DropdownOption {
  value: string;
  label: string;
}

interface SearchFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  genreFilter: string;
  setGenreFilter: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  genreOptions: DropdownOption[];
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'watching', label: 'Assistindo' },
  { value: 'completed', label: 'Completado' },
  { value: 'on_hold', label: 'Em Pausa' },
  { value: 'dropped', label: 'Abandonado' },
  { value: 'plan_to_watch', label: 'Planejado' }
];

const sortOptions = [
  { value: 'title', label: 'Título' },
  { value: 'rating', label: 'Avaliação' },
  { value: 'episodes', label: 'Episódios' },
  { value: 'year', label: 'Ano' },
  { value: 'status', label: 'Status' }
];

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  genreFilter,
  setGenreFilter,
  sortBy,
  setSortBy,
  genreOptions,
  clearFilters,
  hasActiveFilters
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const closeAllDropdowns = () => {
    setShowStatusDropdown(false);
    setShowGenreDropdown(false);
    setShowSortDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeAllDropdowns();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const Dropdown = ({
    isOpen,
    onToggle,
    options,
    value,
    onChange,
    placeholder,
    defaultValue = 'all',
  }: {
    isOpen: boolean;
    onToggle: () => void;
    options: DropdownOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    defaultValue?: string;
  }) => {
    const isActive = value !== defaultValue;
    return (
      <div className="relative">
        <button
          onClick={onToggle}
          type="button"
          className="flex h-9 items-center gap-x-2 rounded-xl px-4 text-sm font-medium transition-all duration-200"
          style={{
            background: isActive ? 'rgba(124,58,237,0.25)' : 'var(--bg-surface)',
            border: isActive ? '1px solid rgba(124,58,237,0.5)' : '1px solid var(--border-subtle)',
            color: isActive ? '#c4b5fd' : 'var(--text-secondary)',
          }}
        >
          {options.find(o => o.value === value)?.label || placeholder}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
            <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/>
          </svg>
        </button>
        {isOpen && (
          <div
            className="absolute top-full left-0 mt-2 rounded-2xl shadow-2xl z-50 min-w-[160px] max-h-60 overflow-y-auto"
            style={{
              background: 'rgba(22,27,34,0.98)',
              border: '1px solid var(--border-medium)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="p-1">
              {options.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { onChange(option.value); onToggle(); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm transition-colors duration-150"
                  style={{
                    color: option.value === value ? '#c4b5fd' : 'var(--text-primary)',
                    background: option.value === value ? 'rgba(124,58,237,0.2)' : 'transparent',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 mb-8">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-stretch rounded-xl h-12 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <span className="flex items-center pl-4" style={{ color: 'var(--text-secondary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
              <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar na sua biblioteca..."
            className="flex-1 bg-transparent outline-none border-none px-4 text-base text-white"
            style={{ color: 'var(--text-primary)' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            type="button"
            className="text-[#93acc8] text-sm hover:text-white transition-colors whitespace-nowrap"
          >
            Limpar filtros
          </button>
        )}
      </div>
      
      <div className="flex gap-3 flex-wrap" ref={containerRef}>
        <Dropdown
          isOpen={showStatusDropdown}
          onToggle={() => {
            setShowStatusDropdown(!showStatusDropdown);
            setShowGenreDropdown(false);
            setShowSortDropdown(false);
          }}
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Status"
        />
        <Dropdown
          isOpen={showGenreDropdown}
          onToggle={() => {
            setShowGenreDropdown(!showGenreDropdown);
            setShowStatusDropdown(false);
            setShowSortDropdown(false);
          }}
          options={genreOptions}
          value={genreFilter}
          onChange={setGenreFilter}
          placeholder="Gênero"
        />
        <Dropdown
          isOpen={showSortDropdown}
          onToggle={() => {
            setShowSortDropdown(!showSortDropdown);
            setShowStatusDropdown(false);
            setShowGenreDropdown(false);
          }}
          options={sortOptions}
          value={sortBy}
          onChange={setSortBy}
          placeholder="Ordenar"
          defaultValue="title"
        />
      </div>
    </div>
  );
};
