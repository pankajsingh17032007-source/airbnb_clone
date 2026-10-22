import { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, ArrowRight, CalendarDays, Compass, Heart, House, MapPin, Menu, Search, ShoppingCart, SlidersHorizontal, Sparkles, Star, UserRound, X } from "lucide-react";
import { indiaCityGuides } from "./india-city-guides.js";
import { indiaDestinations } from "./india-destinations.js";
import "./src.css";
import "./inventory.css";

const MapView = lazy(() => import("./MapView.jsx"));
const emptyInventory = [];

const previewListings = [
  { _id: "preview-paros", type: "homes", location: "Paros, Greece", title: "The little white house by the sea", description: "Slow mornings, sea air, and a sunlit terrace on the coast of Paros.", price: 184, unit: "night", maxGuests: 4, averageRating: 4.98, reviewCount: 126, coordinates: { lat: 37.0853, lng: 25.1486 }, images: ["https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1000&q=85"], amenities: ["Sea view", "Kitchen", "Wifi"] },
  { _id: "preview-jtree", type: "homes", location: "Joshua Tree, United States", title: "Desert hideaway under the stars", description: "A quiet, design-led cabin with long desert views and a private deck.", price: 219, unit: "night", maxGuests: 2, averageRating: 4.91, reviewCount: 82, coordinates: { lat: 34.1347, lng: -116.3131 }, images: ["https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=85"], amenities: ["Desert view", "Fire pit", "Kitchen"] },
  { _id: "preview-ubud", type: "homes", location: "Ubud, Indonesia", title: "Jungle canopy, open-air living", description: "Wake to the sounds of the forest in this open-air Ubud retreat.", price: 136, unit: "night", maxGuests: 3, averageRating: 4.94, reviewCount: 64, coordinates: { lat: -8.5069, lng: 115.2625 }, images: ["https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1000&q=85"], amenities: ["Jungle view", "Pool", "Wifi"] },
  { _id: "preview-amalfi", type: "homes", location: "Amalfi Coast, Italy", title: "A balcony above the blue", description: "A bright coastal home with room for everyone and the sea just below.", price: 278, unit: "night", maxGuests: 5, averageRating: 4.97, reviewCount: 143, coordinates: { lat: 40.6281, lng: 14.484 }, images: ["https://images.unsplash.com/photo-1534237710431-e2fc698436d0?auto=format&fit=crop&w=1000&q=85"], amenities: ["Ocean view", "Balcony", "Kitchen"] },
  { _id: "preview-lisbon", type: "experiences", location: "Lisbon, Portugal", title: "After-dark fado & hidden taverns", description: "Walk the old lanes, hear live fado, and taste neighborhood favorites.", price: 58, unit: "person", maxGuests: 8, averageRating: 4.96, reviewCount: 93, coordinates: { lat: 38.7223, lng: -9.1393 }, images: ["https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=85"], amenities: ["Local guide", "Food included"] },
  { _id: "preview-kyoto", type: "experiences", location: "Kyoto, Japan", title: "Tea, stillness & a Kyoto garden", description: "A mindful tea ritual in a small garden with a local tea host.", price: 76, unit: "person", maxGuests: 6, averageRating: 4.99, reviewCount: 208, coordinates: { lat: 35.0116, lng: 135.7681 }, images: ["https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=85"], amenities: ["Tea tasting", "Garden"] },
  { _id: "preview-bali", type: "services", location: "Bali, Indonesia", title: "A slow morning sound bath", description: "Ease into the day with a private sound bath surrounded by tropical greenery.", price: 42, unit: "person", maxGuests: 4, averageRating: 5, reviewCount: 55, coordinates: { lat: -8.4095, lng: 115.1889 }, images: ["https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=1000&q=85"], amenities: ["Mats provided", "Outdoor"] },
  { _id: "preview-paris", type: "services", location: "Paris, France", title: "A Parisian portrait walk", description: "A gentle photo walk through beautiful corners of the city with a local photographer.", price: 95, unit: "session", maxGuests: 3, averageRating: 4.97, reviewCount: 41, coordinates: { lat: 48.8566, lng: 2.3522 }, images: ["https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1000&q=85"], amenities: ["Photographer", "Edited photos"] },
];

const categories = [
  { id: "all", label: "All stays", icon: Compass },
  { id: "homes", label: "Homes", icon: House },
  { id: "experiences", label: "Experiences", icon: Sparkles },
  { id: "services", label: "Services", icon: Sparkles },
];
const cityPreviewImages = [
  "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1000&q=85",
];

async function cityImageUrl(place) {
  const pageTitle = place.wikiTitle || place.name;
  const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`);
  if (!response.ok) return null;
  const summary = await response.json();
  return summary.thumbnail?.source || summary.originalimage?.source || null;
}

function findIndiaDestination(query) {
  const normalized = query.trim().toLocaleLowerCase().replace(/\s*,?\s*india$/i, "").replace(/\s+/g, " ");
  const aliases = { delhi: "new delhi", bombay: "mumbai", calcutta: "kolkata", madras: "chennai" };
  const target = aliases[normalized] || normalized;
  return indiaDestinations.find((place) => place.name.toLocaleLowerCase() === target) || null;
}

function cityPreviewListings(place, type = "all", cityImage = null) {
  const guide = indiaCityGuides[place.name];
  if (!guide) return [];
  const ideas = [
    { type: "homes", title: guide.home[0], description: guide.home[1], price: 82, unit: "night", maxGuests: 3, image: cityImage || cityPreviewImages[0], amenities: ["Local neighborhood", "Wifi"] },
    { type: "experiences", title: guide.experience[0], description: guide.experience[1], price: 34, unit: "person", maxGuests: 6, image: cityImage || cityPreviewImages[1], amenities: ["Local host", "Small group"] },
    { type: "services", title: guide.service[0], description: guide.service[1], price: 46, unit: "session", maxGuests: 3, image: cityImage || cityPreviewImages[2], amenities: ["Local provider", place.state] },
  ];
  return ideas.filter((idea) => type === "all" || idea.type === type).map((idea) => ({
    ...idea,
    _id: `preview-city-${place.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${idea.type}`,
    location: `${place.name}, India`,
    averageRating: 0,
    reviewCount: 0,
    images: [idea.image],
    host: { name: "Local guide" },
    isCityPreview: true,
  }));
}

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

async function request(path, options = {}) {
  const token = localStorage.getItem("roam-token");
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function formatDate(value) {
  const valueDate = typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : value;
  const date = new Date(typeof valueDate === "string" ? `${valueDate}T12:00:00` : valueDate);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function stayNights(startDate, endDate) {
  return Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000));
}

function cartLineTotal(hold) {
  return hold.unitPrice * (hold.priceUnit === "night" ? stayNights(hold.startDate, hold.endDate) : hold.guests);
}

function App() {
  const [listings, setListings] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [cityImage, setCityImage] = useState(null);
  const [offline, setOffline] = useState(false);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [guests, setGuests] = useState("");
  const [page, setPage] = useState("explore");
  const [mapOpen, setMapOpen] = useState(false);
  const [saved, setSaved] = useState(() => readStorage("roam-saved", []));
  const [user, setUser] = useState(() => readStorage("roam-user", null));
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartNow, setCartNow] = useState(Date.now());
  const [dashboard, setDashboard] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);

  const loadListings = async (filters = {}) => {
    const params = new URLSearchParams();
    const selectedPlace = Object.hasOwn(filters, "city") ? filters.city : selectedCity;
    const searchTerm = filters.q ?? selectedPlace?.name;
    if (filters.type && filters.type !== "all") params.set("type", filters.type);
    if (searchTerm) params.set("q", searchTerm);
    if (filters.guests) params.set("guests", filters.guests);
    if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
    if (filters.startDate && filters.endDate) { params.set("startDate", filters.startDate); params.set("endDate", filters.endDate); }
    try {
      const result = await request(`/listings?${params}`);
      setListings(result.length || !selectedPlace ? result : cityPreviewListings(selectedPlace, filters.type, cityImage?.name === selectedPlace.name ? cityImage.url : null));
      setOffline(false);
    } catch {
      const needle = filters.q?.toLowerCase();
      setListings(selectedPlace ? cityPreviewListings(selectedPlace, filters.type, cityImage?.name === selectedPlace.name ? cityImage.url : null) : previewListings.filter((listing) =>
        (!filters.type || filters.type === "all" || listing.type === filters.type)
        && (!needle || `${listing.title} ${listing.location} ${listing.description}`.toLowerCase().includes(needle))
        && (!filters.guests || listing.maxGuests >= Number(filters.guests))
        && (!filters.maxPrice || listing.price <= Number(filters.maxPrice)),
      ));
      setOffline(true);
    }
  };

  useEffect(() => { loadListings(); }, []);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(""), 3000);
  };

  const changePage = async (nextPage) => {
    setPage(nextPage);
    setMapOpen(false);
    if (nextPage !== "explore") {
      setSelectedCity(null);
      setCityImage(null);
    }
    if (nextPage === "wishlist") await loadListings({ city: null });
    if (nextPage === "cart" && user) {
      try { setCart(await request("/cart/holds")); } catch (error) { notify(error.message); }
    }
    if (nextPage === "trips" && user) {
      try { setBookings(await request("/bookings/mine")); } catch (error) { notify(error.message); }
    }
    if (nextPage === "host" && user) {
      try { setDashboard(await request("/host/dashboard")); } catch (error) { notify(error.message); }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitSearch = (event) => {
    event.preventDefault();
    if ((startDate && !endDate) || (!startDate && endDate) || (startDate && endDate && startDate >= endDate)) {
      notify("Choose a check-in and check-out date in the right order.");
      return;
    }
    const destination = findIndiaDestination(query);
    if (destination) {
      selectDestination(destination);
      return;
    }
    setPage("explore");
    setSelectedCity(null);
    setCityImage(null);
    loadListings({ type: category, q: query.trim(), guests, startDate, endDate, city: null });
  };

  const selectDestination = (place) => {
    setPage("explore");
    setSelectedCity(place);
    setCityImage(null);
    setCategory("all");
    setQuery(place.name);
    loadListings({ type: "all", q: place.name, guests, city: place });
    cityImageUrl(place).then((url) => {
      if (!url) return;
      setCityImage({ name: place.name, url });
      setListings((current) => current.map((listing) => listing.isCityPreview && listing.location === `${place.name}, India` ? { ...listing, images: [url] } : listing));
    }).catch(() => {});
  };

  const toggleSaved = (listing) => {
    setSaved((current) => {
      const next = current.includes(listing._id) ? current.filter((id) => id !== listing._id) : [...current, listing._id];
      localStorage.setItem("roam-saved", JSON.stringify(next));
      return next;
    });
  };

  const openDetails = async (listing) => {
    setSelectedListing(listing);
    setReviews([]);
    setModal({ type: "details", listing });
    if (!listing._id.startsWith("preview-")) {
      try { setReviews(await request(`/listings/${listing._id}/reviews`)); } catch (error) { notify(error.message); }
    }
  };

  const openAuth = (mode = "login") => setModal({ type: "auth", mode });

  const handleAuth = async (event) => {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const mode = modal.mode;
    try {
      const result = await request(`/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password"), role: form.get("role") }),
      });
      localStorage.setItem("roam-token", result.token);
      localStorage.setItem("roam-user", JSON.stringify(result.user));
      setUser(result.user);
      setModal(null);
      notify(`Welcome, ${result.user.name.split(" ")[0]}.`);
    } catch (error) { notify(error.message); }
    finally { setBusy(false); }
  };

  const addToCart = async (event) => {
    event.preventDefault();
    if (!user) { openAuth("login"); notify("Sign in to reserve a room or service."); return; }
    if (offline || selectedListing._id.startsWith("preview-")) { notify("Connect MongoDB and use a host listing to reserve this unit."); return; }
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const hold = await request("/cart/holds", { method: "POST", body: JSON.stringify({ listingId: selectedListing._id, unitId: form.get("unitId"), startDate: form.get("startDate"), endDate: form.get("endDate"), guests: Number(form.get("guests")) }) });
      setCart((current) => [hold, ...current.filter((item) => item._id !== hold._id)]);
      setModal(null);
      notify("Reserved in your cart for 5 minutes.");
    } catch (error) { notify(error.message); }
    finally { setBusy(false); }
  };
  const bookListing = addToCart;

  const removeCartHold = async (holdId) => {
    try {
      await request(`/cart/holds/${holdId}`, { method: "DELETE" });
      setCart((current) => current.filter((hold) => hold._id !== holdId));
    } catch (error) { notify(error.message); }
  };

  const checkoutCart = async () => {
    if (!cart.length || busy) return;
    setBusy(true);
    try {
      const confirmed = await request("/bookings/checkout", { method: "POST", body: JSON.stringify({ holdIds: cart.map((hold) => hold._id) }) });
      setCart([]);
      setBookings((current) => [...confirmed, ...current]);
      setPage("trips");
      notify("Your bookings are confirmed.");
    } catch (error) {
      notify(error.message);
      try { setCart(await request("/cart/holds")); } catch { setCart([]); }
    } finally { setBusy(false); }
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setCart((current) => {
        const active = current.filter((hold) => new Date(hold.expiresAt).getTime() > now);
        return active.length === current.length ? current : active;
      });
      if (page === "cart") setCartNow(now);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [page]);

  const cancelBooking = async (id) => {
    try {
      await request(`/bookings/${id}/cancel`, { method: "PATCH" });
      setBookings((current) => current.map((booking) => booking._id === id ? { ...booking, status: "cancelled" } : booking));
      notify("Booking cancelled.");
    } catch (error) { notify(error.message); }
  };

  const postReview = async (event, booking) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await request(`/listings/${booking.listing._id}/reviews`, { method: "POST", body: JSON.stringify({ bookingId: booking._id, rating: Number(form.get("rating")), comment: form.get("comment") }) });
      notify("Your review is live. Thanks for sharing the story.");
      event.currentTarget.reset();
      loadListings({ type: category, q: query, guests });
    } catch (error) { notify(error.message); }
  };

  const createListing = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const listing = Object.fromEntries(form.entries());
    const editing = modal.type === "edit-listing";
    listing.inventory = form.getAll("unitName").map((name, index) => ({
      name: String(name).trim(),
      image: form.getAll("unitImage")[index],
      price: Number(form.getAll("unitPrice")[index]),
      maxGuests: Number(form.getAll("unitGuests")[index]),
      availableFrom: form.getAll("unitFrom")[index],
      availableUntil: form.getAll("unitUntil")[index],
    }));
    listing.price = Math.min(...listing.inventory.map((unit) => unit.price));
    listing.maxGuests = Math.max(...listing.inventory.map((unit) => unit.maxGuests));
    listing.images = listing.inventory.map((unit) => unit.image);
    listing.unit = listing.type === "homes" ? "night" : listing.type === "experiences" ? "person" : "session";
    listing.coordinates = { lat: Number(listing.lat), lng: Number(listing.lng) };
    delete listing.lat; delete listing.lng;
    delete listing.unitName; delete listing.unitImage; delete listing.unitPrice;
    delete listing.unitGuests; delete listing.unitFrom; delete listing.unitUntil;
    try {
      await request(editing ? `/listings/${modal.listing._id}` : "/listings", { method: editing ? "PATCH" : "POST", body: JSON.stringify(listing) });
      setModal(null);
      notify(editing ? "Your listing is updated." : "Your place is now listed.");
      const result = await request("/host/dashboard");
      setDashboard(result);
      await loadListings({ type: category, q: query, guests });
    } catch (error) { notify(error.message); }
  };

  const deleteListing = async (listing) => {
    if (!window.confirm(`Remove “${listing.title}” from your listings?`)) return;
    try {
      await request(`/listings/${listing._id}`, { method: "DELETE" });
      setDashboard(await request("/host/dashboard"));
      await loadListings({ type: category, q: query, guests });
      notify("Listing removed.");
    } catch (error) { notify(error.message); }
  };

  const visibleListings = page === "wishlist" ? listings.filter((item) => saved.includes(item._id)) : listings;

  return (
    <>
      <header className="topbar">
        <button className="wordmark" onClick={() => changePage("explore")} aria-label="Roam home"><span className="wordmark-symbol">r</span><span>roam<span className="wordmark-period">.</span></span></button>
        <form className="search-dock" onSubmit={submitSearch}>
          <label className="search-destination"><span>Where to?</span><input list="india-city-options" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search destinations" /><datalist id="india-city-options">{indiaDestinations.map((place) => <option key={place.name} value={place.name} />)}</datalist></label>
          <label><span>Check in</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label><span>Check out</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <label className="search-guests"><span>Guests</span><select value={guests} onChange={(event) => setGuests(event.target.value)}><option value="">Add guests</option>{[1, 2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n} guests</option>)}</select></label>
          <button className="search-submit" aria-label="Search stays"><Search size={17} /></button>
        </form>
        <div className="top-actions">
          {user?.role === "host" || user?.role === "admin" ? <button className="host-action" onClick={() => changePage("host")}>Host dashboard</button> : <button className="host-action" onClick={() => user ? notify("Switch to a host account to publish a listing.") : openAuth("register")}>Become a host</button>}
        </div>
      </header>

      <nav className="category-bar" aria-label="Listing categories">
        <div className="category-scroll">{categories.map(({ id, label, icon: Icon }) => <button key={id} className={`category-tab ${category === id ? "active" : ""}`} onClick={() => { setCategory(id); loadListings({ type: id, q: selectedCity?.name || query, guests, city: selectedCity }); }}><Icon size={19} strokeWidth={1.6} /><span>{label}</span></button>)}</div>
        <button className={`map-toggle ${mapOpen ? "active" : ""}`} onClick={() => setMapOpen((value) => !value)}><MapPin size={16} />{mapOpen ? "Hide map" : "Show map"}</button>
      </nav>

      <main className="page-shell">
        {offline && <div className="offline-note"><span className="offline-dot" /><strong className="offline-label">Preview mode</strong><span>Connect MongoDB to enable live search, accounts and bookings.</span><button onClick={() => openAuth("register")}>Set up an account <ArrowRight size={14} /></button></div>}

        {page === "cart" && <CartPage user={user} cart={cart} now={cartNow} busy={busy} onSignIn={() => openAuth()} onRemove={removeCartHold} onCheckout={checkoutCart} />}

        {page === "explore" && <>
          <section className="intro-row"><div><p className="eyebrow"><span className="eyebrow-star">✳</span> MADE FOR THE WAY YOU WANDER</p><h1>Somewhere,<br className="mobile-break" /> just for <em>you.</em></h1><p className="intro-copy">Homes with a little soul. People with a story. Find the kind of place that makes a trip feel like yours.</p></div><div className="intro-aside"><span className="aside-number">01 <span>/ 03</span></span><span className="aside-line" /><p>Go where the good<br />stories happen.</p></div></section>
          <div className="listing-heading"><div><p className="section-overline">{selectedCity ? `${selectedCity.state.toUpperCase()} · CITY GUIDE` : "A GOOD PLACE TO BEGIN"}</p><h2>{selectedCity ? `${category === "all" ? "Stay, explore & unwind in" : `${category} in`} ${selectedCity.name}` : category === "all" ? "Places to wander" : `Explore ${category}`}</h2></div><button className="filter-trigger" onClick={() => setModal({ type: "filters" })}><SlidersHorizontal size={16} /> Filters</button></div>
          {selectedCity && visibleListings.some((listing) => listing.isCityPreview) && <p className="city-preview-note">City guide picks are examples; real listings appear as local hosts add them.</p>}
          {mapOpen && <Suspense fallback={<div className="map-loading" role="status">Preparing the India map…</div>}><MapView listings={listings} onOpenListing={openDetails} onSelectDestination={selectDestination} /></Suspense>}
          <section className="listing-grid" aria-live="polite">{visibleListings.length ? visibleListings.map((listing, index) => <ListingCard key={listing._id} listing={listing} saved={saved.includes(listing._id)} onSave={() => toggleSaved(listing)} onOpen={() => openDetails(listing)} index={index} />) : <div className="empty-results"><Compass size={27} /><h3>No saved places yet</h3><p>Keep the ones you love close with the heart button.</p><button onClick={() => changePage("explore")}>Explore stays</button></div>}</section>
        </>}

        {page === "wishlist" && <><section className="subpage-head"><p className="section-overline">YOUR LITTLE BLACK BOOK</p><h1>Saved for later<span>.</span></h1><p>All the places you want to come back to.</p></section><section className="listing-grid">{visibleListings.length ? visibleListings.map((listing, index) => <ListingCard key={listing._id} listing={listing} saved onSave={() => toggleSaved(listing)} onOpen={() => openDetails(listing)} index={index} />) : <div className="empty-results"><Heart size={27} /><h3>Start collecting moments</h3><p>Tap the heart on anything you love and it’ll be waiting here.</p><button onClick={() => changePage("explore")}>Find somewhere</button></div>}</section></>}

        {page === "trips" && <><section className="subpage-head"><p className="section-overline">YOUR NEXT CHAPTER</p><h1>Trips<span>.</span></h1><p>Your confirmed stays, all in one place.</p></section>{!user ? <SignInPrompt onSignIn={() => openAuth()} /> : bookings.length ? <div className="booking-list">{bookings.map((booking) => <article className="booking-row" key={booking._id}><img src={booking.unitImage || booking.listing?.images?.[0]} alt={booking.unitName || ""} /><div className="booking-copy"><span className={`status-label ${booking.status}`}>{booking.status}</span><h3>{booking.listing?.location}</h3><p>{booking.unitName} · {formatDate(booking.startDate)} — {formatDate(booking.endDate)} · {booking.guests} guests</p><p>${booking.totalPrice} total · {booking.listing?.title}</p></div><div className="booking-row-actions">{booking.status === "confirmed" && new Date(booking.startDate) > new Date() && <button className="text-button" onClick={() => cancelBooking(booking._id)}>Cancel</button>}{booking.status !== "cancelled" && new Date(booking.endDate) < new Date() && <form className="review-form" onSubmit={(event) => postReview(event, booking)}><select name="rating" aria-label="Review rating">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}</select><input name="comment" placeholder="Leave a review" required /><button title="Submit review"><ArrowRight size={16} /></button></form>}</div></article>)}</div> : <SignInPrompt onSignIn={() => openAuth()} message="No booked stays just yet. Your next story is out there." />}</>}

        {page === "host" && <><section className="subpage-head host-page-head"><div><p className="section-overline">YOUR PLACE IN THE WORLD</p><h1>Host dashboard<span>.</span></h1><p>Keep an eye on your places and the people staying in them.</p></div><button className="primary-button" onClick={() => setModal({ type: "new-listing" })}>＋ Add a listing</button></section>{dashboard ? <><div className="stat-grid"><div><span>Active places</span><strong>{dashboard.stats.listingCount}</strong></div><div><span>Bookings</span><strong>{dashboard.stats.bookingCount}</strong></div><div><span>Booked value</span><strong>${dashboard.stats.revenue.toLocaleString()}</strong></div></div><h2 className="dashboard-subhead">Your places</h2><div className="host-list">{dashboard.listings.map((listing) => <article className="host-row" key={listing._id}><img src={listing.images?.[0]} alt="" /><div><p className="section-overline">{listing.type} · {listing.location}</p><h3>{listing.title}</h3><p>${listing.price} / {listing.unit} · Up to {listing.maxGuests} guests</p></div><div className="host-row-actions"><span className="host-rating"><Star size={15} fill="currentColor" /> {listing.averageRating || "New"}</span><button className="text-button" onClick={() => setModal({ type: "edit-listing", listing })}>Edit</button><button className="text-button" onClick={() => deleteListing(listing)}>Remove</button></div></article>)}</div><h2 className="dashboard-subhead">Recent bookings</h2>{dashboard.bookings.length ? dashboard.bookings.map((booking) => <div className="host-booking" key={booking._id}><span>{booking.listing?.title}</span><span>{booking.guest?.name}</span><span>{formatDate(booking.startDate)} — {formatDate(booking.endDate)}</span><strong>${booking.totalPrice}</strong></div>) : <p className="muted-copy">Your first booking will show up here.</p>}</> : <SignInPrompt onSignIn={() => openAuth()} message="Sign in with your host account to manage your places." />}</>}
      </main>

      <footer className="site-footer"><button className="wordmark footer-brand" onClick={() => changePage("explore")}><span className="wordmark-symbol">r</span><span>roam<span className="wordmark-period">.</span></span></button><span>Somewhere is closer than you think.</span><small>© 2026 roam stays · Built as a full-stack learning project</small></footer>

      <nav className="bottom-nav" aria-label="Main navigation">
        <button className={page === "explore" ? "active" : ""} onClick={() => changePage("explore")}><Compass /><span>Explore</span></button>
        <button className={page === "wishlist" ? "active" : ""} onClick={() => changePage("wishlist")}><Heart /><span>Wishlist</span></button>
        <button className={page === "trips" ? "active" : ""} onClick={() => changePage("trips")}><CalendarDays /><span>Trips</span></button>
        <button className={page === "cart" ? "active" : ""} onClick={() => changePage("cart")}><ShoppingCart /><span>Cart{cart.length ? ` (${cart.length})` : ""}</span></button>
        {(user?.role === "host" || user?.role === "admin") && <button className={page === "host" ? "active" : ""} onClick={() => changePage("host")}><House /><span>Hosting</span></button>}
        <button onClick={() => user ? setModal({ type: "account" }) : openAuth("login")}><UserRound /><span>{user ? "Account" : "Log in"}</span></button>
      </nav>

      {modal && <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><section className={`modal-panel ${modal.type === "details" ? "details-panel" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-top"><span className="modal-kicker">ROAM, AT YOUR OWN PACE</span><button className="icon-button" onClick={() => setModal(null)} aria-label="Close"><X size={19} /></button></div>
        {modal.type === "auth" && <><h2 id="modal-title">{modal.mode === "register" ? "Come on in." : "Welcome back."}</h2><p className="modal-copy">{modal.mode === "register" ? "Make room for somewhere new." : "Your next chapter is waiting."}</p><form className="modal-form" onSubmit={handleAuth}>{modal.mode === "register" && <><label>Your name<input name="name" placeholder="What should we call you?" required /></label><label>Account type<select name="role"><option value="guest">I'm here to travel</option><option value="host">I have a place to share</option></select></label></>}<label>Email address<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" minLength="8" autoComplete={modal.mode === "register" ? "new-password" : "current-password"} required /></label><button className="primary-button wide-button" disabled={busy}>{busy ? "One moment…" : modal.mode === "register" ? "Create account" : "Sign in"}</button></form><p className="switch-auth">{modal.mode === "register" ? "Already know your way around?" : "New around here?"} <button onClick={() => setModal({ ...modal, mode: modal.mode === "register" ? "login" : "register" })}>{modal.mode === "register" ? "Sign in" : "Create an account"}</button></p></>}
        {modal.type === "details" && <><div className="details-image"><img src={modal.listing.images?.[0]} alt={modal.listing.title} /><span>{modal.listing.type}</span></div><div className="details-body"><div className="details-head"><div><p className="section-overline">{modal.listing.location}</p><h2 id="modal-title">{modal.listing.title}</h2></div><span className="detail-rating"><Star size={16} fill="currentColor" /> {modal.listing.averageRating || "New"} <small>({modal.listing.reviewCount || 0})</small></span></div><p className="details-description">{modal.listing.description}</p><p className="details-host"><span className="account-avatar">{(modal.listing.host?.name || "R").slice(0, 1)}</span> Hosted by {modal.listing.host?.name || "a local host"} · {modal.listing.maxGuests} guests</p>{modal.listing.amenities?.length > 0 && <div className="amenity-row">{modal.listing.amenities.map((amenity) => <span key={amenity}>{amenity}</span>)}</div>}<div className="reviews-block"><h3>Guest notes <span>{modal.listing.reviewCount || 0} reviews</span></h3>{reviews.length ? reviews.slice(0, 3).map((review) => <article className="review-item" key={review._id}><strong>{review.author?.name} <span>· <Star size={12} fill="currentColor" /> {review.rating}</span></strong><p>{review.comment}</p></article>) : <p className="muted-copy">{offline ? "Reviews appear when the API is connected." : "Be the first to share a note after a stay."}</p>}</div><form className="booking-form" onSubmit={bookListing}><div className="booking-form-head"><strong>${modal.listing.price} <span>/ {modal.listing.unit}</span></strong><span>No payment collected in this project</span></div><div className="booking-inputs"><label>Check in<input type="date" name="startDate" min={new Date().toISOString().slice(0, 10)} defaultValue={startDate} required /></label><label>Check out<input type="date" name="endDate" min={new Date().toISOString().slice(0, 10)} defaultValue={endDate} required /></label><label>Guests<select name="guests" defaultValue={guests || "1"}>{Array.from({ length: modal.listing.maxGuests || 2 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select></label></div><button className="primary-button wide-button" disabled={busy || modal.listing._id.startsWith("preview-")}>{modal.listing._id.startsWith("preview-") ? "Connect database to book" : busy ? "Checking dates…" : "Request to book"}</button></form></div></>}
        {modal.type === "filters" && <><h2 id="modal-title">A few good filters.</h2><p className="modal-copy">Narrow in on what feels right.</p><form className="modal-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const selectedGuests = form.get("guests"); setGuests(selectedGuests); loadListings({ type: category, q: query, guests: selectedGuests, maxPrice: form.get("maxPrice") }); setModal(null); }}><label>Maximum price<input name="maxPrice" type="number" min="1" placeholder="Any price" /></label><label>Guests<select name="guests" defaultValue={guests}><option value="">Any number</option>{[1, 2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n} guests</option>)}</select></label><button className="primary-button wide-button">Show places</button></form></>}
        {(modal.type === "new-listing" || modal.type === "edit-listing") && <><h2 id="modal-title">{modal.type === "edit-listing" ? "Tend to your listing." : "Share your somewhere."}</h2><p className="modal-copy">Good hosting starts with a thoughtful listing.</p><form className="modal-form listing-form" onSubmit={createListing}><label>Listing title<input name="title" defaultValue={modal.listing?.title || ""} required /></label><label>What makes it special?<textarea name="description" rows="3" defaultValue={modal.listing?.description || ""} required /></label><div className="form-split"><label>Category<select name="type" defaultValue={modal.listing?.type || "homes"}><option value="homes">Home</option><option value="experiences">Experience</option><option value="services">Service</option></select></label><label>Price<input name="price" type="number" min="1" defaultValue={modal.listing?.price || ""} required /></label></div><div className="form-split"><label>Price unit<input name="unit" defaultValue={modal.listing?.unit || "night"} required /></label><label>Max guests<input name="maxGuests" type="number" min="1" defaultValue={modal.listing?.maxGuests || 2} required /></label></div><label>Location<input name="location" placeholder="City, country" defaultValue={modal.listing?.location || ""} required /></label><label>Image URL<input name="image" type="url" placeholder="https://…" defaultValue={modal.listing?.images?.[0] || ""} required /></label><div className="form-split"><label>Latitude<input name="lat" type="number" step="any" defaultValue={modal.listing?.coordinates?.lat || ""} required /></label><label>Longitude<input name="lng" type="number" step="any" defaultValue={modal.listing?.coordinates?.lng || ""} required /></label></div><button className="primary-button wide-button">{modal.type === "edit-listing" ? "Save changes" : "Publish listing"}</button></form></>}
        {modal.type === "account" && <><h2 id="modal-title">{user.name}</h2><p className="modal-copy">{user.email} · {user.role}</p><div className="account-links"><button onClick={() => { setModal(null); changePage("trips"); }}><CalendarDays /> Your trips <ArrowRight /></button>{user.role === "host" && <button onClick={() => { setModal(null); changePage("host"); }}><House /> Host dashboard <ArrowRight /></button>}<button onClick={() => { localStorage.removeItem("roam-token"); localStorage.removeItem("roam-user"); setUser(null); setModal(null); notify("You have signed out."); }}><ArrowLeft /> Sign out <ArrowRight /></button></div></>}
        {modal.type === "details" && <div className="details-body unit-booking-wrap"><UnitBookingForm key={selectedListing?._id} listing={selectedListing} startDate={startDate} endDate={endDate} guests={guests} busy={busy} onSubmit={addToCart} /></div>}
        {(modal.type === "new-listing" || modal.type === "edit-listing") && <HostInventoryForm key={modal.listing?._id || "new-listing"} listing={modal.listing} busy={busy} onSubmit={createListing} />}
      </section></div>}
      <div className={`toast ${toast ? "visible" : ""}`} role="status">{toast}</div>
    </>
  );
}

function ListingCard({ listing, saved, onSave, onOpen, index }) {
  return <article className="listing-card" style={{ "--card-order": index }}><div className="listing-photo"><button className="photo-open" onClick={onOpen} aria-label={`View ${listing.title}`}><img src={listing.images?.[0]} alt={listing.title} loading="lazy" /></button><span className="listing-type">{listing.isCityPreview ? "CITY SAMPLE" : listing.type === "homes" ? "STAY" : listing.type === "experiences" ? "GO DO" : "TAKE TIME"}</span><button className={`save-button ${saved ? "saved" : ""}`} onClick={onSave} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}><Heart size={20} fill={saved ? "currentColor" : "none"} /></button>{index === 0 && !listing.isCityPreview && <span className="photo-note"><Sparkles size={12} /> A guest favorite</span>}</div><button className="card-copy" onClick={onOpen}><span className="card-location">{listing.location}<span><Star size={13} fill="currentColor" /> {listing.averageRating || "New"}</span></span><span className="card-title">{listing.title}</span><span className="card-description">{listing.description}</span><span className="card-price"><strong>${listing.price}</strong> / {listing.unit}{listing.reviewCount ? <span> · {listing.reviewCount} reviews</span> : null}</span></button></article>;
}

function SignInPrompt({ onSignIn, message = "Sign in to see your upcoming and past stays." }) {
  return <div className="empty-results"><UserRound size={28} /><h3>Your trips live here</h3><p>{message}</p><button onClick={onSignIn}>Sign in to continue</button></div>;
}

function UnitBookingForm({ listing, startDate, endDate, guests, busy, onSubmit }) {
  const inventory = listing?.inventory || emptyInventory;
  const [availableInventory, setAvailableInventory] = useState(inventory);
  const [selectedUnitId, setSelectedUnitId] = useState(String(inventory[0]?._id || ""));
  const [selectedStart, setSelectedStart] = useState(startDate || "");
  const [selectedEnd, setSelectedEnd] = useState(endDate || "");
  const [guestCount, setGuestCount] = useState(Number(guests) || 1);
  useEffect(() => {
    if (!listing?._id || listing._id.startsWith("preview-") || !selectedStart || !selectedEnd || selectedStart >= selectedEnd) {
      setAvailableInventory(inventory);
      return undefined;
    }
    const controller = new AbortController();
    const query = new URLSearchParams({ startDate: selectedStart, endDate: selectedEnd, guests: String(guestCount) });
    request(`/listings/${listing._id}?${query}`, { signal: controller.signal })
      .then((result) => setAvailableInventory(result.inventory || []))
      .catch((error) => {
        if (error.name !== "AbortError") setAvailableInventory(inventory);
      });
    return () => controller.abort();
  }, [listing?._id, selectedStart, selectedEnd, guestCount]);
  useEffect(() => {
    if (!availableInventory.some((unit) => String(unit._id) === selectedUnitId)) setSelectedUnitId(String(availableInventory[0]?._id || ""));
  }, [availableInventory, selectedUnitId]);
  if (!availableInventory.length) return <div className="unit-availability-empty"><h3>{inventory.length ? "No units available for those dates" : "No reservable rooms or services yet"}</h3><p>{inventory.length ? "Try another date range or guest count." : "Hosts can add units with their own photos and availability dates."}</p></div>;
  const today = new Date().toISOString().slice(0, 10);
  const selectedUnit = availableInventory.find((unit) => String(unit._id) === selectedUnitId) || availableInventory[0];
  return <form className="unit-booking-form" onSubmit={onSubmit}>
    <div className="booking-form-head"><strong>Choose a room or service</strong><span>Each unit has its own availability and guest limit</span></div>
    <div className="unit-choice-grid">{availableInventory.map((unit, index) => <label className="unit-choice" key={unit._id}>
      <input type="radio" name="unitId" value={unit._id} checked={String(unit._id) === selectedUnitId} onChange={() => setSelectedUnitId(String(unit._id))} required />
      <img src={unit.image} alt={unit.name} />
      <span className="unit-choice-copy"><strong>{unit.name}</strong><small>Up to {unit.maxGuests} guests · ${unit.price} / {listing.unit}</small><small>{formatDate(unit.availableFrom)} — {formatDate(unit.availableUntil)}</small></span>
    </label>)}</div>
    <div className="booking-inputs"><label>Check in<input type="date" name="startDate" min={today} value={selectedStart} onChange={(event) => setSelectedStart(event.target.value)} required /></label><label>Check out<input type="date" name="endDate" min={selectedStart || today} value={selectedEnd} onChange={(event) => setSelectedEnd(event.target.value)} required /></label><label>Guests<select name="guests" value={guestCount} onChange={(event) => setGuestCount(Number(event.target.value))}>{Array.from({ length: selectedUnit.maxGuests || 1 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}</select></label></div>
    <button className="primary-button wide-button" disabled={busy || listing._id.startsWith("preview-")}>{listing._id.startsWith("preview-") ? "Connect database to reserve" : busy ? "Holding this unit…" : "Add to cart · hold 5 minutes"}</button>
  </form>;
}

function HostInventoryForm({ listing, busy, onSubmit }) {
  const [unitCount, setUnitCount] = useState(Math.max(1, listing?.inventory?.length || 1));
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return <form className="modal-form inventory-editor" onSubmit={onSubmit}>
    <label>Listing title<input name="title" defaultValue={listing?.title || ""} required /></label>
    <label>Describe this place or service<textarea name="description" rows="3" defaultValue={listing?.description || ""} required /></label>
    <div className="form-split"><label>Type<select name="type" defaultValue={listing?.type || "homes"}><option value="homes">Stay</option><option value="experiences">Experience</option><option value="services">Service</option></select></label><label>Location<input name="location" placeholder="City, country" defaultValue={listing?.location || ""} required /></label></div>
    <div className="form-split"><label>Latitude<input name="lat" type="number" step="any" defaultValue={listing?.coordinates?.lat ?? ""} required /></label><label>Longitude<input name="lng" type="number" step="any" defaultValue={listing?.coordinates?.lng ?? ""} required /></label></div>
    <div className="inventory-editor-heading"><div><strong>Rooms and service units</strong><span>Every unit has its own photo, price, guest limit, and dates.</span></div><button className="outline-button" type="button" onClick={() => setUnitCount((count) => count + 1)}>＋ Add unit</button></div>
    {Array.from({ length: unitCount }, (_, index) => {
      const unit = listing?.inventory?.[index];
      return <fieldset className="inventory-unit-editor" key={index}><legend>Unit {index + 1}</legend><label>Room or service name<input name="unitName" defaultValue={unit?.name || ""} placeholder="Queen room, massage session…" required /></label><label>Photo URL<input name="unitImage" type="url" defaultValue={unit?.image || ""} placeholder="https://…" required /></label><div className="form-split"><label>Price<input name="unitPrice" type="number" min="1" defaultValue={unit?.price || ""} required /></label><label>Guests per unit<input name="unitGuests" type="number" min="1" defaultValue={unit?.maxGuests || 2} required /></label></div><div className="form-split"><label>Available from<input name="unitFrom" type="date" min={today} defaultValue={unit?.availableFrom?.slice(0, 10) || today} required /></label><label>Available until<input name="unitUntil" type="date" min={tomorrow} defaultValue={unit?.availableUntil?.slice(0, 10) || ""} required /></label></div></fieldset>;
    })}
    <button className="primary-button wide-button" disabled={busy}>{busy ? "Saving…" : listing ? "Save inventory" : "Publish listing"}</button>
  </form>;
}

function CartPage({ user, cart, now, busy, onSignIn, onRemove, onCheckout }) {
  const clock = now;
    <div className="inventory-editor-heading"><div><strong>Rooms and service units</strong><span>Every unit has its own photo, price, guest limit, and dates.</span></div><div className="inventory-editor-actions"><button className="outline-button" type="button" onClick={() => setUnitCount((count) => count + 1)}>＋ Add unit</button><button className="text-button" type="button" disabled={unitCount <= 1} onClick={() => setUnitCount((count) => Math.max(1, count - 1))}>Remove last</button></div></div>
  if (!user) return <><section className="subpage-head"><p className="section-overline">HELD FOR A LITTLE WHILE</p><h1>Your cart<span>.</span></h1><p>Rooms and services you’re deciding on.</p></section><SignInPrompt onSignIn={onSignIn} message="Sign in to see and manage your held rooms and services." /></>;
  const activeHolds = cart.filter((hold) => new Date(hold.expiresAt).getTime() > Math.max(now, clock));
  const total = activeHolds.reduce((sum, hold) => sum + cartLineTotal(hold), 0);
  return <>
    <section className="subpage-head cart-heading"><div><p className="section-overline">HELD FOR FIVE MINUTES</p><h1>Your cart<span>.</span></h1><p>Available rooms and services are reserved while the clock runs.</p></div>{activeHolds.length > 0 && <button className="primary-button" onClick={onCheckout} disabled={busy}>Confirm · ${total.toLocaleString()}</button>}</section>
    {activeHolds.length ? <div className="cart-list">{activeHolds.map((hold) => {
      const secondsLeft = Math.max(0, Math.ceil((new Date(hold.expiresAt).getTime() - clock) / 1000));
      return <article className="cart-item" key={hold._id}>
        <img src={hold.unitImage} alt={hold.unitName} />
        <div className="cart-item-copy"><span className="section-overline">{hold.listing?.location} · {hold.guests} guests</span><h3>{hold.listing?.title}</h3><p>{hold.unitName} · {formatDate(hold.startDate)} — {formatDate(hold.endDate)}</p><p>${hold.unitPrice}{hold.priceUnit === "night" ? ` × ${stayNights(hold.startDate, hold.endDate)} nights` : ` × ${hold.guests} guests`} · ${cartLineTotal(hold)} total</p></div>
        <div className="cart-item-actions"><span className="hold-countdown">{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} left</span><button className="text-button" onClick={() => onRemove(hold._id)}>Remove</button></div>
      </article>;
    })}<div className="cart-total"><span>Subtotal</span><strong>${total.toLocaleString()}</strong><button className="primary-button" onClick={onCheckout} disabled={busy}>{busy ? "Confirming…" : "Confirm bookings"}</button></div></div> : <div className="empty-results"><ShoppingCart size={28} /><h3>Your cart is clear</h3><p>Available rooms and services you add will be held here for five minutes.</p></div>}
  </>;
}

createRoot(document.getElementById("root")).render(<App />);