// Sélecteur de localisation sur carte (clic ou position GPS).
// Utilisé à la création/édition d'une boutique.
import { useCallback, useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { storePinIcon } from "./pinIcons";
import { YAOUNDE_CENTER } from "../../utils/geo";
import { useI18n } from "../../i18n/I18nContext";

export interface PickedPosition {
  lat: number;
  lng: number;
}

function MapClickHandler({
  onChange,
}: {
  onChange: (pos: PickedPosition) => void;
}) {
  useMapEvents({
    click(event) {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function Recenter({ position }: { position: PickedPosition | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 15), {
        duration: 0.6,
      });
    }
  }, [position, map]);
  return null;
}

async function reverseGeocode(position: PickedPosition): Promise<{
  address: string;
  city: string;
}> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.lat}&lon=${position.lng}&accept-language=fr`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!response.ok) return { address: "", city: "" };
    const data = await response.json();
    const address = typeof data.display_name === "string" ? data.display_name : "";
    const parts = (data.address ?? {}) as Record<string, string>;
    const city =
      parts.city || parts.town || parts.village || parts.county || parts.state || "";
    return { address, city };
  } catch {
    return { address: "", city: "" };
  }
}

export default function LocationPicker({
  value,
  onChange,
}: {
  value: PickedPosition | null;
  onChange: (pos: PickedPosition) => void;
}) {
  const { t } = useI18n();
  const [locating, setLocating] = useState(false);

  const center = value ?? YAOUNDE_CENTER;

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [onChange]);

  // Remplissage auto de l'adresse / ville (meilleure production, non bloquant).
  const handlePick = useCallback(
    (pos: PickedPosition) => {
      onChange(pos);
      void reverseGeocode(pos).then((result) => {
        window.dispatchEvent(
          new CustomEvent("mboafind:geocode", {
            detail: { address: result.address, city: result.city },
          }),
        );
      });
    },
    [onChange],
  );

  return (
    <div>
      <div className="h-64 overflow-hidden rounded-2xl border border-slate-300 dark:border-slate-600">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={value ? 15 : 12}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onChange={handlePick} />
          {value && (
            <>
              <Recenter position={value} />
              <Marker position={[value.lat, value.lng]} icon={storePinIcon()} />
            </>
          )}
        </MapContainer>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {t("merchant.locationHint")}
      </p>
      <button
        type="button"
        onClick={handleLocate}
        disabled={locating}
        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <span aria-hidden>📍</span>
        {locating ? t("common.loading") : t("merchant.locateMe")}
      </button>
    </div>
  );
}