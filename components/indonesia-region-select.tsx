"use client";

import { useEffect, useMemo, useState } from "react";

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
const selectClass =
  "select select-bordered h-12 min-h-12 w-full rounded-xl border-[#BDC3C7] bg-white text-sm text-[#2C3E50] focus:border-[#34495E] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F5F7F8] disabled:text-[#8A969D]";

function normalizeRegionName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("id-ID")
    .replace(/^(provinsi|kabupaten(?: administrasi)?|kota(?: administrasi)?|kab\.?|kot\.?)\s+/i, "")
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
    return matches.find((option) => /^kabupaten\s+/i.test(option.name)) ?? matches[0];
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
  if (!Array.isArray(result.data)) throw new Error("Format data wilayah tidak sesuai.");
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
            error: "Daftar wilayah belum dapat dimuat. Periksa koneksi internet, lalu coba kembali.",
          });
        }
      });

    return () => controller.abort();
  }, [path]);

  // Jangan tampilkan pilihan dari provinsi/kota sebelumnya saat path sedang berubah.
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
  placeholder,
  loading,
  disabled,
  onSelect,
}: {
  id: string;
  label: string;
  value: string;
  options: RegionOption[];
  selected?: RegionOption;
  placeholder: string;
  loading: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const selectValue = selected?.id ?? (value ? `legacy:${value}` : "");

  return (
    <div className="form-control min-w-0 w-full gap-1.5">
      <label htmlFor={id} className="label justify-start gap-1 p-0">
        <span className="label-text text-xs font-bold text-[#34495E] sm:text-sm">
          {label}
        </span>
        <span className="text-xs font-bold text-red-500">*</span>
      </label>
      <select
        id={id}
        className={selectClass}
        value={selectValue}
        onChange={(event) => onSelect(event.target.value)}
        disabled={disabled || loading}
        autoComplete={id === "identity-province" ? "address-level1" : id === "identity-city" ? "address-level2" : undefined}
      >
        <option value="">{loading ? `Memuat ${label.toLowerCase()}...` : placeholder}</option>
        {value && !selected && (
          <option value={`legacy:${value}`} disabled>
            {value} (data tersimpan)
          </option>
        )}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
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
    onChange({ province: selected?.name ?? "", city: "", district: "", village: "" });
  }

  function selectRegency(id: string) {
    const selected = regencyData.options.find((option) => option.id === id);
    onChange({ ...value, city: selected?.name ?? "", district: "", village: "" });
  }

  function selectDistrict(id: string) {
    const selected = districtData.options.find((option) => option.id === id);
    onChange({ ...value, district: selected?.name ?? "", village: "" });
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
        placeholder="Pilih provinsi"
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
        placeholder="Pilih kota/kabupaten"
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
        placeholder="Pilih kecamatan"
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
        placeholder="Pilih desa/kelurahan"
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
