"use client"

import * as React from "react"
import { RiLoader4Line, RiMapPinLine, RiSearchLine } from "@remixicon/react"
import type * as LeafletNS from "leaflet"
import "leaflet/dist/leaflet.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface GpsMapPickerProps {
  latitude: number | null
  longitude: number | null
  radiusMeters: number
  onChange: (lat: number, lng: number) => void
}

interface SearchResult {
  display_name: string
  lat: string
  lon: string
}

const DEFAULT_LAT = 11.5564
const DEFAULT_LNG = 104.9282

export function GpsMapPicker({
  latitude,
  longitude,
  radiusMeters,
  onChange,
}: GpsMapPickerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<LeafletNS.Map | null>(null)
  const markerRef = React.useRef<LeafletNS.Marker | null>(null)
  const circleRef = React.useRef<LeafletNS.Circle | null>(null)
  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const [query, setQuery] = React.useState("")
  const [searching, setSearching] = React.useState(false)
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [searchError, setSearchError] = React.useState<string | null>(null)

  const initialLat = latitude ?? DEFAULT_LAT
  const initialLng = longitude ?? DEFAULT_LNG

  React.useEffect(() => {
    let cancelled = false
    let mapInstance: LeafletNS.Map | null = null

    async function initMap() {
      if (!containerRef.current) return
      const L = (await import("leaflet")).default
      if (cancelled || !containerRef.current) return

      mapInstance = L.map(containerRef.current, {
        center: [initialLat, initialLng],
        zoom: (radiusMeters || 100) <= 20 ? 18 : 16,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(mapInstance)

      const pinIcon = L.divIcon({
        className: "",
        html: `<div style="width:26px;height:26px;border-radius:9999px;background:#5865F2;border:3px solid #ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;"><div style="width:6px;height:6px;border-radius:9999px;background:#ffffff;"></div></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      })

      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        icon: pinIcon,
      }).addTo(mapInstance)

      const circle = L.circle([initialLat, initialLng], {
        radius: radiusMeters || 100,
        color: "#5865F2",
        fillColor: "#5865F2",
        fillOpacity: 0.16,
        weight: 2,
      }).addTo(mapInstance)

      marker.on("dragend", () => {
        const pos = marker.getLatLng()
        const lat = Number(pos.lat.toFixed(6))
        const lng = Number(pos.lng.toFixed(6))
        circle.setLatLng([lat, lng])
        onChangeRef.current(lat, lng)
      })

      mapInstance.on("click", (e: LeafletNS.LeafletMouseEvent) => {
        const lat = Number(e.latlng.lat.toFixed(6))
        const lng = Number(e.latlng.lng.toFixed(6))
        marker.setLatLng([lat, lng])
        circle.setLatLng([lat, lng])
        onChangeRef.current(lat, lng)
      })

      mapRef.current = mapInstance
      markerRef.current = marker
      circleRef.current = circle
    }

    void initMap()

    return () => {
      cancelled = true
      mapInstance?.remove()
      mapRef.current = null
      markerRef.current = null
      circleRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external lat/lng/radius updates onto the map
  React.useEffect(() => {
    if (!mapRef.current || !markerRef.current || !circleRef.current) return
    const lat = latitude ?? DEFAULT_LAT
    const lng = longitude ?? DEFAULT_LNG
    const cur = markerRef.current.getLatLng()
    if (Math.abs(cur.lat - lat) > 0.000001 || Math.abs(cur.lng - lng) > 0.000001) {
      markerRef.current.setLatLng([lat, lng])
      circleRef.current.setLatLng([lat, lng])
      mapRef.current.panTo([lat, lng], { animate: true })
    }
    circleRef.current.setRadius(radiusMeters || 100)
  }, [latitude, longitude, radiusMeters])

  const selectCoordinates = (lat: number, lng: number) => {
    const fixedLat = Number(lat.toFixed(6))
    const fixedLng = Number(lng.toFixed(6))
    onChange(fixedLat, fixedLng)
    if (mapRef.current && markerRef.current && circleRef.current) {
      markerRef.current.setLatLng([fixedLat, fixedLng])
      circleRef.current.setLatLng([fixedLat, fixedLng])
      mapRef.current.setView([fixedLat, fixedLng], 17, { animate: true })
    }
  }

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) return
    setSearchError(null)
    setResults([])

    // Support direct "lat, lng" or Google Maps URL "@lat,lng"
    const coordMatch = trimmed.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/)
    if (coordMatch) {
      const lat = Number(coordMatch[1])
      const lng = Number(coordMatch[2])
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        selectCoordinates(lat, lng)
        return
      }
    }

    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=5`,
        { headers: { Accept: "application/json" } }
      )
      if (!res.ok) throw new Error("Location lookup failed")
      const data = (await res.json()) as SearchResult[]
      if (!Array.isArray(data) || data.length === 0) {
        setSearchError("No matching place found. Try a broader name or click directly on the map.")
      } else {
        setResults(data)
      }
    } catch {
      setSearchError("Unable to search places right now. Click anywhere on the map to drop the pin.")
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-2.5 rounded-[0.625rem] border border-border/60 bg-background/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <RiSearchLine className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void handleSearch()
              }
            }}
            placeholder="Search place, address, Google Maps @lat,lng, or click map..."
            className="pl-8 text-xs font-mono"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={searching}
          onClick={() => void handleSearch()}
        >
          {searching ? (
            <RiLoader4Line className="mr-1 size-3.5 animate-spin" />
          ) : (
            <RiSearchLine className="mr-1 size-3.5" />
          )}
          Find Place
        </Button>
      </div>

      {searchError && (
        <p className="text-[11px] font-mono text-amber-400">{searchError}</p>
      )}

      {results.length > 0 && (
        <div className="max-h-36 overflow-y-auto rounded-md border border-border/60 bg-card divide-y divide-border/40">
          {results.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                selectCoordinates(Number(item.lat), Number(item.lon))
                setResults([])
              }}
              className="flex w-full items-start gap-2 px-2.5 py-1.5 text-left text-[11px] font-mono hover:bg-muted/60 transition-colors"
            >
              <RiMapPinLine className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span className="line-clamp-2">{item.display_name}</span>
            </button>
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-lg border border-border/60 z-0"
      />

      <p className="text-[10px] font-mono text-muted-foreground">
        Click anywhere on the map or drag the blue pin to pick your workplace location. The shaded circle shows the {radiusMeters || 100}m check-in radius.
      </p>
    </div>
  )
}
