import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, LocateFixed, MapPin, Search } from 'lucide-react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { formatDistance, reversePlace, searchPlaces, type LatLon, type Place } from '../api/geocode';
import './address-picker.css';

const DEFAULT_CENTER: [number, number] = [21.0285, 105.8542];

/** Where the user is, once the browser has told us. Kept for the whole session so it is asked only once. */
let knownPosition: LatLon | undefined;

/**
 * Address field with suggestions while typing and a map to pin the exact spot.
 * The map and the text stay in sync: choosing a suggestion moves the pin,
 * and clicking the map or dragging the pin fills the text with the nearest address.
 */
export function AddressPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const listId = useId();
  const [items, setItems] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState('');
  const [notice, setNotice] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const skipSearch = useRef(false);
  const [userPos, setUserPos] = useState<LatLon | undefined>(knownPosition);
  const askedPosition = useRef(false);
  const userPosRef = useRef(userPos);
  userPosRef.current = userPos;
  const onChangeRef = useRef(onChange);
  const initialValue = useRef(value);
  onChangeRef.current = onChange;

  // Suggestions while typing (debounced, one request in flight).
  useEffect(() => {
    if (skipSearch.current) { skipSearch.current = false; return; }
    if (!focused) return;
    const q = value.trim();
    if (q.length < 3) { setItems([]); setSearched(''); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setNotice('');
      try {
        const places = await searchPlaces(q, referencePoint(), controller.signal);
        setItems(places); setSearched(q); setActive(-1); setOpen(true);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') { setItems([]); setNotice((error as Error).message); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, focused, userPos]);

  /** Suggestions are ranked by distance from the user; with no position yet, from the map centre. */
  function referencePoint(): LatLon {
    if (userPosRef.current) return userPosRef.current;
    const c = map.current?.getCenter();
    return c ? { lat: c.lat, lon: c.lng } : { lat: DEFAULT_CENTER[0], lon: DEFAULT_CENTER[1] };
  }

  /** Ask once, when the user starts typing an address. A refusal is fine: the map centre is used instead. */
  function askPosition() {
    if (askedPosition.current || knownPosition || !navigator.geolocation) return;
    askedPosition.current = true;
    navigator.geolocation.getCurrentPosition(
      pos => {
        knownPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserPos(knownPosition);
        if (!initialValue.current.trim()) moveTo(knownPosition.lat, knownPosition.lon, 15);
      },
      () => { /* denied or unavailable */ },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }

  function moveTo(lat: number, lon: number, zoom = 17) {
    if (!map.current || !marker.current) return;
    marker.current.setLatLng([lat, lon]);
    map.current.setView([lat, lon], zoom);
  }

  async function pinAt(lat: number, lon: number) {
    marker.current?.setLatLng([lat, lon]);
    setLoading(true); setNotice('');
    try {
      const address = await reversePlace(lat, lon);
      if (address) { skipSearch.current = true; onChangeRef.current(address); setOpen(false); }
      else setNotice('Không xác định được địa chỉ tại vị trí này. Hãy nhập tay hoặc chọn vị trí khác.');
    } catch { setNotice('Không lấy được địa chỉ từ bản đồ lúc này.'); }
    finally { setLoading(false); }
  }
  const pinAtRef = useRef(pinAt);
  pinAtRef.current = pinAt;

  // Map is created once, lazily, so the page does not pay for Leaflet until an address is edited.
  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const [L] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
        if (disposed || !mapEl.current) return;
        const instance = L.map(mapEl.current, { center: DEFAULT_CENTER, zoom: 13, zoomControl: true, attributionControl: true });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(instance);
        const pin = L.marker(DEFAULT_CENTER, {
          draggable: true,
          keyboard: false,
          icon: L.divIcon({ className: 'ap-pin-wrap', html: '<span class="ap-pin"></span>', iconSize: [28, 36], iconAnchor: [14, 34] }),
        }).addTo(instance);
        pin.on('dragend', () => { const p = pin.getLatLng(); void pinAtRef.current(p.lat, p.lng); });
        instance.on('click', event => void pinAtRef.current(event.latlng.lat, event.latlng.lng));
        map.current = instance; marker.current = pin;
        setMapReady(true);
        setTimeout(() => instance.invalidateSize(), 50);
        // Editing an existing address: put the pin where that text points.
        const start = initialValue.current.trim();
        if (start.length >= 3) {
          const [first] = await searchPlaces(start, userPosRef.current);
          if (!disposed && first) moveTo(first.lat, first.lon);
        }
      } catch { if (!disposed) setNotice('Không tải được bản đồ. Bạn vẫn có thể nhập địa chỉ bằng tay.'); }
    })();
    return () => { disposed = true; map.current?.remove(); map.current = null; marker.current = null; };
  }, []);

  function choose(place: Place) {
    skipSearch.current = true;
    onChange(place.label);
    setItems([]); setOpen(false); setActive(-1);
    moveTo(place.lat, place.lon);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => (i + 1) % items.length); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => (i <= 0 ? items.length - 1 : i - 1)); }
    else if (event.key === 'Enter' && active >= 0) { event.preventDefault(); choose(items[active]); }
    else if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); }
  }

  function locate() {
    if (!navigator.geolocation) { setNotice('Trình duyệt không hỗ trợ định vị.'); return; }
    setLoading(true); setNotice('');
    navigator.geolocation.getCurrentPosition(
      pos => { knownPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude }; setUserPos(knownPosition); moveTo(pos.coords.latitude, pos.coords.longitude, 18); void pinAt(pos.coords.latitude, pos.coords.longitude); },
      () => { setLoading(false); setNotice('Không lấy được vị trí. Hãy cho phép truy cập vị trí hoặc chọn trên bản đồ.'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const showEmpty = open && !loading && searched === value.trim() && items.length === 0 && value.trim().length >= 3;
  return (
    <div className="ap">
      <div className="ap-field">
        <Search size={16} aria-hidden="true" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder="Nhập số nhà, đường, phường hoặc xã, quận hoặc huyện"
          value={value}
          onChange={event => { onChange(event.target.value); setOpen(true); }}
          onFocus={() => { setFocused(true); askPosition(); if (items.length) setOpen(true); }}
          onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 120); }}
          onKeyDown={onKeyDown}
        />
        {loading && <Loader2 size={16} className="ap-spin" aria-label="Đang tìm" />}
      </div>
      {open && items.length > 0 && (
        <ul id={listId} role="listbox" className="ap-list">
          {items.map((place, index) => (
            <li
              key={place.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? 'is-active' : ''}
              onMouseDown={event => { event.preventDefault(); choose(place); }}
              onMouseEnter={() => setActive(index)}
            >
              <MapPin size={15} aria-hidden="true" />
              <span className="ap-item-text"><strong>{place.label.split(', ')[0]}</strong><small>{place.label.split(', ').slice(1).join(', ')}</small></span>
              {place.distanceKm !== undefined && <span className="ap-dist">{formatDistance(place.distanceKm)}</span>}
            </li>
          ))}
        </ul>
      )}
      {showEmpty && <p className="ap-empty">Không có gợi ý phù hợp. Hãy thử bỏ bớt từ khóa hoặc ghim vị trí trên bản đồ.</p>}
      <div className="ap-map" ref={mapEl} role="application" aria-label="Bản đồ chọn vị trí giao hàng">
        {!mapReady && <span className="ap-map-loading">Đang tải bản đồ…</span>}
      </div>
      <div className="ap-actions">
        <button type="button" className="ap-locate" onClick={locate}><LocateFixed size={15} aria-hidden="true" />Dùng vị trí hiện tại</button>
        <span className="ap-hint">Bấm vào bản đồ hoặc kéo ghim để chọn vị trí chính xác.</span>
      </div>
      {notice && <p className="ap-notice" role="status">{notice}</p>}
    </div>
  );
}
