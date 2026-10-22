import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, ScaleControl } from "maplibre-gl";
import { Compass, MapPin, RotateCcw } from "lucide-react";
import { indiaDestinations } from "./india-destinations.js";
import "maplibre-gl/dist/maplibre-gl.css";

const indiaBounds = [[68, 6], [98, 36]];

export default function MapView({ listings, onOpenListing, onSelectDestination }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const openListingRef = useRef(onOpenListing);
  const selectDestinationRef = useRef(onSelectDestination);
  const stayMarkersRef = useRef([]);
  const destinationMarkersRef = useRef([]);
  const [selectedPlace, setSelectedPlace] = useState(null);

  useEffect(() => {
    openListingRef.current = onOpenListing;
    selectDestinationRef.current = onSelectDestination;
  }, [onOpenListing, onSelectDestination]);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          openmap: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors",
          },
        },
        layers: [{ id: "openmap", type: "raster", source: "openmap" }],
      },
      center: [82.5, 22],
      zoom: 3.1,
      pitch: 48,
      bearing: -5,
      maxPitch: 78,
      minZoom: 2,
      maxZoom: 16,
      projection: { type: "globe" },
      renderWorldCopies: false,
      cooperativeGestures: true,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");

    map.fitBounds(indiaBounds, { padding: 70, maxZoom: 3.2, duration: 0 });
    indiaDestinations.forEach((place) => {
        const element = document.createElement("button");
        element.type = "button";
        element.className = "globe-marker destination-marker";
        element.setAttribute("aria-label", `${place.name}, ${place.state}: ${place.kind}`);
        element.title = `${place.name}, ${place.state}`;
        element.innerHTML = "";
        element.addEventListener("click", () => {
          setSelectedPlace(place);
          selectDestinationRef.current(place);
          map.flyTo({ center: [place.lng, place.lat], zoom: 7.2, pitch: 58, bearing: -12, duration: 1200, essential: true });
        });
        const marker = new Marker({ element, anchor: "bottom" })
          .setLngLat([place.lng, place.lat])
          .addTo(map);
        destinationMarkersRef.current.push(marker);
    });
    map.resize();

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      stayMarkersRef.current.forEach((marker) => marker.remove());
      destinationMarkersRef.current.forEach((marker) => marker.remove());
      stayMarkersRef.current = [];
      destinationMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    stayMarkersRef.current.forEach((marker) => marker.remove());
    stayMarkersRef.current = listings.filter((listing) => listing.coordinates?.lat && listing.coordinates?.lng).map((listing) => {
        const element = document.createElement("button");
        element.type = "button";
        element.className = "globe-marker stay-marker";
        element.setAttribute("aria-label", `Open ${listing.title}, ${listing.location}`);
        element.textContent = `$${listing.price}`;
        element.addEventListener("click", () => openListingRef.current(listing));
        return new Marker({ element, anchor: "bottom" })
          .setLngLat([listing.coordinates.lng, listing.coordinates.lat])
          .addTo(map);
    });
    return () => stayMarkersRef.current.forEach((marker) => marker.remove());
  }, [listings]);

  const resetView = () => {
    setSelectedPlace(null);
    mapRef.current?.easeTo({ center: [82.5, 22], zoom: 3.1, pitch: 48, bearing: -5, duration: 900 });
  };

  return (
    <section className="map-frame" aria-label="Interactive 3D map of India and available stays">
      <div className="globe-map" ref={containerRef} />
      <div className="map-summary"><span className="map-summary-mark"><Compass size={16} /></span><span><strong>India, wide open</strong><small>{indiaDestinations.length} destinations · {listings.length} stays</small></span></div>
      <span className="map-mode"><span /> 3D GLOBE</span>
      <button className="map-reset" type="button" onClick={resetView} aria-label="Reset map view" title="Reset map view"><RotateCcw size={16} /></button>
      {selectedPlace && <aside className="destination-card" aria-live="polite">
        <button className="destination-card-close" type="button" onClick={() => setSelectedPlace(null)} aria-label="Close destination details">×</button>
        <span className="destination-card-kicker"><MapPin size={12} /> {selectedPlace.state}</span>
        <h3>{selectedPlace.name}</h3>
        <p>{selectedPlace.kind}</p>
      </aside>}
      <span className="map-credit">Map data &copy; OpenStreetMap contributors</span>
    </section>
  );
}
