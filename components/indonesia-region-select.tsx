"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ChevronDown, LoaderCircle, Search } from "lucide-react";

type RegionOption = { id: string; name: string };
type RegionResponse = { data?: RegionOption[] };

export type IndonesiaRegionValue = {
  province: string;
  city: string;
  district: string;
  village: string;
};

type Props = {
  value: IndonesiaRegionValue;
  onChange: (value: IndonesiaRegionValue) => void;
};

type RegionState = {
  path: string;
  options: RegionOption[];
  loading: boolean;
  error: string;
};

const API_BASE_URL = "https://www.emsifa.com/api-wilayah-indonesia/v2";
const MAX_VISIBLE_OPTIONS = 80;

const inputClass =
  "input input-bordered h-12 min-h-12 w-full rounded-xl border-[#BDC3C7] bg-white pr-10 text-sm text-[#2C3E50] placeholder:text-[#8A969D] focus:border-[#34495E] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F5F7F8] disabled:text-[#8A969D]";

function normalizeRegionName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("id-ID")
    .replace(
      /^(provinsi|kabupaten(?: administrasi)?|kota(?: administrasi)?|kab\.?|kot\.?)\s+/i,
      "",
    )
    .replace(/\s+/g, " ");
}

function findRegion(options: RegionOption[], value: string) {
  if (!value.trim()) return undefined;

  const exact = options.find(
    (option) =>
      option.name.trim().toLocaleLowerCase("id-ID") ===
      value.trim().toLocaleLowerCase("id-ID"),
  );
  if (exact) return exact;

  const normalized = normalizeRegionName(value);
  const matches = options.filter(
    (option) => normalizeRegionName(option.name) === normalized,
  );
  if (matches.length <= 1) return matches[0];

  // Data lama kadang menyimpan "Bandung" tanpa awalan Kabupaten/Kota.
  const hasPrefix = /^(kabupaten|kota|kab\.?|kot\.?)\s+/i.test(value.trim());
  if (!hasPrefix) {
    return (
      matches.find((option) => /^kabupaten\s+/i.test(option.name)) ??
      matches[0]
    );
  }
  return matches[0];
}

async function fetchRegions(path: string, signal: AbortSignal) {
  const response = await fetch(`${API_BASE_URL}/${path}.json`, {
    signal,
    cache: "force-cache",
  });
  if (!response.ok) throw new Error("Data wilayah tidak dapat dimuat.");

  const result = (await response.json()) as RegionResponse;
  if (!Array.isArray(result.data)) {
    throw new Error("Format data wilayah tidak sesuai.");
  }
  return result.data;
}

function useRegions(path: string) {
  const [state, setState] = useState<RegionState>({
    path: "",
    options: [],
    loading: false,
    error: "",
  });

  useEffect(() => {
    if (!path) {
      setState({ path, options: [], loading: false, error: "" });
      return;
    }

    const controller = new AbortController();
    setState({ path, options: [], loading: true, error: "" });

    fetchRegions(path, controller.signal)
      .then((options) => {
        if (!controller.signal.aborted) {
          setState({ path, options, loading: false, error: "" });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({
            path,
            options: [],
            loading: false,
            error:
              "Daftar wilayah belum dapat dimuat. Periksa koneksi internet, lalu coba kembali.",
          });
        }
      });

    return () => controller.abort();
  }, [path]);

  // Jangan tampilkan pilihan dari provinsi/kota sebelumnya saat path berubah.
  return state.path === path
    ? state
    : { path, options: [], loading: Boolean(path), error: "" };
}

function RegionField({
  id,
  label,
  value,
  options,
  selected,
  loading,
  disabled,
  onSelect,
}: {
  id: string;
  label: string;
  value: string;
  options: RegionOption[];
  selected?: RegionOption;
  loading: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayValue = selected?.name ?? value;

  const matchingOptions = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("id-ID");
    if (!keyword) return options;

    return options.filter((option) =>
      option.name.toLocaleLowerCase("id-ID").includes(keyword),
    );
  }, [options, query]);

  const visibleOptions = matchingOptions.slice(0, MAX_VISIBLE_OPTIONS);

  useEffect(() => {
    if (!open) setQuery(displayValue);
  }, [displayValue, open]);

  useEffect(() => {
    function handleOutsideClick(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", handleOutsideClick);
  }, []);

  function chooseOption(option: RegionOption) {
    onSelect(option.id);
    setOpen(false);
    setQuery(option.name);
    setActiveIndex(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setQuery("");
        setActiveIndex(0);
        return;
      }
      if (visibleOptions.length > 0) {
        setActiveIndex((current) =>
          Math.min(current + 1, visibleOptions.length - 1),
        );
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (visibleOptions.length > 0) {
        setActiveIndex((current) => Math.max(current - 1, 0));
      }
      return;
    }

    if (event.key === "Enter" && open) {
      event.preventDefault();
      const option = visibleOptions[activeIndex];
      if (option) chooseOption(option);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="form-control min-w-0 w-full gap-1.5">
      <label htmlFor={id} className="label justify-start gap-1 p-0">
        <span className="label-text text-xs font-bold text-[#34495E] sm:text-sm">
          {label}
        </span>
        <span className="text-xs font-bold text-red-500">*</span>
      </label>

      <div ref={containerRef} className="relative w-full">
        <div className="relative">
          <input
            id={id}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={`${id}-options`}
            aria-activedescendant={
              open && visibleOptions[activeIndex]
                ? `${id}-option-${visibleOptions[activeIndex].id}`
                : undefined
            }
            autoComplete="off"
            className={inputClass}
            value={open ? query : displayValue}
            placeholder={
              loading
                ? `Memuat ${label.toLowerCase()}...`
                : disabled
                  ? "Pilih wilayah sebelumnya"
                  : `Ketik untuk mencari ${label.toLowerCase()}...`
            }
            disabled={disabled || loading}
            onFocus={() => {
              setOpen(true);
              setQuery("");
              setActiveIndex(0);
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />

          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#84929A]">
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : open ? (
              <Search className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </div>

        {open && !disabled && !loading && (
          <div
            id={`${id}-options`}
            role="listbox"
            className="absolute z-[60] mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-[#D8DEE3] bg-white py-1 shadow-xl"
          >
            {visibleOptions.length > 0 ? (
              <>
                {visibleOptions.map((option, index) => (
                  <button
                    key={option.id}
                    id={`${id}-option-${option.id}`}
                    type="button"
                    role="option"
                    aria-selected={selected?.id === option.id}
                    className={`block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#F1F5F9] ${
                      activeIndex === index
                        ? "bg-[#EFF4F8] text-[#24496B]"
                        : "text-[#34495E]"
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => chooseOption(option)}
                  >
                    {option.name}
                  </button>
                ))}

                {matchingOptions.length > MAX_VISIBLE_OPTIONS && (
                  <p className="border-t border-[#EEF1F4] px-4 py-2 text-xs text-[#84929A]">
                    Menampilkan {MAX_VISIBLE_OPTIONS} dari {matchingOptions.length} hasil. Ketik lagi untuk mempersempit pencarian.
                  </p>
                )}
              </>
            ) : (
              <p className="px-4 py-3 text-sm text-[#84929A]">
                {query.trim()
                  ? `Tidak ada ${label.toLowerCase()} yang cocok dengan "${query}".`
                  : `Belum ada pilihan ${label.toLowerCase()}.`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function IndonesiaRegionSelect({ value, onChange }: Props) {
  const provinceData = useRegions("provinces");
  const selectedProvince = useMemo(
    () => findRegion(provinceData.options, value.province),
    [provinceData.options, value.province],
  );

  const regencyData = useRegions(
    selectedProvince ? `regencies/${selectedProvince.id}` : "",
  );
  const selectedRegency = useMemo(
    () => findRegion(regencyData.options, value.city),
    [regencyData.options, value.city],
  );

  const districtData = useRegions(
    selectedRegency ? `districts/${selectedRegency.id}` : "",
  );
  const selectedDistrict = useMemo(
    () => findRegion(districtData.options, value.district),
    [districtData.options, value.district],
  );

  const villageData = useRegions(
    selectedDistrict ? `villages/${selectedDistrict.id}` : "",
  );
  const selectedVillage = useMemo(
    () => findRegion(villageData.options, value.village),
    [villageData.options, value.village],
  );

  const error =
    provinceData.error ||
    regencyData.error ||
    districtData.error ||
    villageData.error;

  function selectProvince(id: string) {
    const selected = provinceData.options.find((option) => option.id === id);
    onChange({
      province: selected?.name ?? "",
      city: "",
      district: "",
      village: "",
    });
  }

  function selectRegency(id: string) {
    const selected = regencyData.options.find((option) => option.id === id);
    onChange({
      ...value,
      city: selected?.name ?? "",
      district: "",
      village: "",
    });
  }

  function selectDistrict(id: string) {
    const selected = districtData.options.find((option) => option.id === id);
    onChange({
      ...value,
      district: selected?.name ?? "",
      village: "",
    });
  }

  function selectVillage(id: string) {
    const selected = villageData.options.find((option) => option.id === id);
    onChange({ ...value, village: selected?.name ?? "" });
  }

  return (
    <>
      <RegionField
        id="identity-province"
        label="Provinsi"
        value={value.province}
        options={provinceData.options}
        selected={selectedProvince}
        loading={provinceData.loading}
        disabled={false}
        onSelect={selectProvince}
      />

      <RegionField
        id="identity-city"
        label="Kota / Kabupaten"
        value={value.city}
        options={regencyData.options}
        selected={selectedRegency}
        loading={regencyData.loading}
        disabled={!selectedProvince}
        onSelect={selectRegency}
      />

      <RegionField
        id="identity-district"
        label="Kecamatan"
        value={value.district}
        options={districtData.options}
        selected={selectedDistrict}
        loading={districtData.loading}
        disabled={!selectedRegency}
        onSelect={selectDistrict}
      />

      <RegionField
        id="identity-village"
        label="Desa / Kelurahan"
        value={value.village}
        options={villageData.options}
        selected={selectedVillage}
        loading={villageData.loading}
        disabled={!selectedDistrict}
        onSelect={selectVillage}
      />

      {error && (
        <p className="sm:col-span-2 text-xs leading-5 text-red-600">{error}</p>
      )}
    </>
  );
}
