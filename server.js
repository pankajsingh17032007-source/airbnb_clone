import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Booking, CartHold, Listing, Review, User } from "./models.js";
import { bookingTotal, dateRangesOverlap, unitMatchesRequest, validDateRange } from "./booking-rules.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN;
const jwtSecret = process.env.JWT_SECRET;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: clientOrigin ? clientOrigin.split(",") : process.env.NODE_ENV === "production" ? false : true }));
app.use(express.json({ limit: "1mb" }));

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Sign in to continue." });
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ error: "You do not have permission to do that." });
}

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

async function availableUnits(listing, startDate, endDate, guests, session, excludedHoldIds = []) {
  const units = listing.inventory.filter((unit) => unitMatchesRequest(unit, startDate, endDate, guests || 1));
  if (!units.length) return [];
  const query = {
    listing: listing._id,
    unitId: { $in: units.map((unit) => unit._id) },
  };
  const bookingsQuery = startDate && endDate
    ? Booking.find({ ...query, status: { $in: ["confirmed", "completed"] } }).select("unitId")
    : null;
  const legacyBookingsQuery = startDate && endDate
    ? Booking.find({ listing: listing._id, unitId: { $exists: false }, status: { $in: ["confirmed", "completed"] }, startDate: { $lt: endDate }, endDate: { $gt: startDate } }).select("_id")
    : null;
  const holdsQuery = CartHold.find({ ...query, expiresAt: { $gt: new Date() }, ...(excludedHoldIds.length ? { _id: { $nin: excludedHoldIds } } : {}) }).select("unitId");
  if (startDate && endDate) {
    Object.assign(query, { startDate: { $lt: endDate }, endDate: { $gt: startDate } });
    bookingsQuery.where({ startDate: { $lt: endDate }, endDate: { $gt: startDate } });
  }
  if (session) {
    bookingsQuery?.session(session);
    legacyBookingsQuery?.session(session);
    holdsQuery.session(session);
  }
  const [bookings, legacyBookings, holds] = await Promise.all([bookingsQuery ? bookingsQuery.lean() : [], legacyBookingsQuery ? legacyBookingsQuery.lean() : [], holdsQuery.lean()]);
  if (legacyBookings.length) return [];
  const occupied = new Set([...bookings, ...holds].map((reservation) => String(reservation.unitId)));
  return units.filter((unit) => !occupied.has(String(unit._id)));
}

function inventoryListing(listing, inventory) {
  const firstUnit = inventory[0];
  return {
    ...listing,
    inventory,
    price: firstUnit?.price ?? listing.price,
    maxGuests: inventory.length ? Math.max(...inventory.map((unit) => unit.maxGuests)) : listing.maxGuests,
    images: firstUnit ? [firstUnit.image] : listing.images,
  };
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || "") || !password || password.length < 8) {
      return res.status(400).json({ error: "Enter a name, valid email, and password with at least 8 characters." });
    }
    if (role && !["guest", "host"].includes(role)) return res.status(400).json({ error: "Choose guest or host as your account type." });
    const user = await User.create({ name: name.trim(), email, passwordHash: await bcrypt.hash(password, 12), role: role || "guest" });
    const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: "7d" });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) { next(error); }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() });
    if (!user || !await bcrypt.compare(req.body.password || "", user.passwordHash)) return res.status(401).json({ error: "Email or password is incorrect." });
    const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: "7d" });
    res.json({ token, user: publicUser(user) });
  } catch (error) { next(error); }
});

app.get("/api/listings", async (req, res, next) => {
  try {
    const filter = {};
    if (["homes", "experiences", "services"].includes(req.query.type)) filter.type = req.query.type;
    if (req.query.guests) filter.maxGuests = { $gte: Number(req.query.guests) };
    if (req.query.maxPrice && Number.isFinite(Number(req.query.maxPrice))) filter.price = { $lte: Number(req.query.maxPrice) };
    if (req.query.q) {
      const query = String(req.query.q).slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = ["title", "description", "location"].map((field) => ({ [field]: { $regex: query, $options: "i" } }));
    }
    if (req.query.startDate || req.query.endDate) {
      if (!validDateRange(req.query.startDate, req.query.endDate)) return res.status(400).json({ error: "Provide a valid check-in and check-out date range." });
    }
    const found = await Listing.find(filter).populate("host", "name").sort({ createdAt: -1 }).limit(100).lean();
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const listings = await Promise.all(found.map(async (listing) => inventoryListing(
      listing,
      await availableUnits(listing, startDate, endDate, req.query.guests),
    )));
    res.json(listings.filter((listing) => listing.inventory.length > 0));
  } catch (error) { next(error); }
});

app.get("/api/listings/:id", async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id).populate("host", "name").lean();
    if (!listing) return res.status(404).json({ error: "Listing not found." });
    if (req.query.startDate || req.query.endDate) {
      if (!validDateRange(req.query.startDate, req.query.endDate)) return res.status(400).json({ error: "Provide a valid check-in and check-out date range." });
    }
    const inventory = await availableUnits(listing, req.query.startDate ? new Date(req.query.startDate) : null, req.query.endDate ? new Date(req.query.endDate) : null, req.query.guests);
    res.json(inventoryListing(listing, inventory));
  } catch (error) { next(error); }
});

app.post("/api/listings", authenticate, requireRole("host", "admin"), async (req, res, next) => {
  try {
    if (!Array.isArray(req.body.inventory) || req.body.inventory.length === 0) return res.status(400).json({ error: "Add at least one room or service unit with availability." });
    const inventory = req.body.inventory;
    const listing = await Listing.create({
      ...req.body,
      price: Math.min(...inventory.map((unit) => Number(unit.price))),
      maxGuests: Math.max(...inventory.map((unit) => Number(unit.maxGuests))),
      images: inventory.map((unit) => unit.image),
      host: req.user.id,
    });
    res.status(201).json(listing);
  } catch (error) { next(error); }
});

app.patch("/api/listings/:id", authenticate, requireRole("host", "admin"), async (req, res, next) => {
  try {
    const editableFields = ["title", "description", "type", "location", "coordinates", "price", "unit", "maxGuests", "images", "amenities", "inventory"];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => editableFields.includes(key)));
    if (updates.inventory) {
      const [activeHold, futureBooking] = await Promise.all([
        CartHold.exists({ listing: req.params.id, expiresAt: { $gt: new Date() } }),
        Booking.exists({ listing: req.params.id, status: "confirmed", endDate: { $gt: new Date() } }),
      ]);
      if (activeHold || futureBooking) return res.status(409).json({ error: "Inventory cannot be changed while units are held or booked." });
      if (!updates.inventory.length) return res.status(400).json({ error: "A listing needs at least one available unit." });
      updates.price = Math.min(...updates.inventory.map((unit) => Number(unit.price)));
      updates.maxGuests = Math.max(...updates.inventory.map((unit) => Number(unit.maxGuests)));
      updates.images = updates.inventory.map((unit) => unit.image);
    }
    const listing = await Listing.findOneAndUpdate({ _id: req.params.id, ...(req.user.role === "admin" ? {} : { host: req.user.id }) }, { $set: updates }, { new: true, runValidators: true });
    if (!listing) return res.status(404).json({ error: "Listing not found or not managed by you." });
    res.json(listing);
  } catch (error) { next(error); }
});

app.delete("/api/listings/:id", authenticate, requireRole("host", "admin"), async (req, res, next) => {
  try {
    const [activeHold, futureBooking] = await Promise.all([
      CartHold.exists({ listing: req.params.id, expiresAt: { $gt: new Date() } }),
      Booking.exists({ listing: req.params.id, status: "confirmed", endDate: { $gt: new Date() } }),
    ]);
    if (activeHold || futureBooking) return res.status(409).json({ error: "A listing cannot be removed while units are held or booked." });
    const listing = await Listing.findOneAndDelete({ _id: req.params.id, ...(req.user.role === "admin" ? {} : { host: req.user.id }) });
    if (!listing) return res.status(404).json({ error: "Listing not found or not managed by you." });
    res.json({ deleted: true });
  } catch (error) { next(error); }
});

app.get("/api/bookings/mine", authenticate, async (req, res, next) => {
  try {
    const bookings = await Booking.find({ guest: req.user.id }).populate("listing").sort({ startDate: 1 });
    res.json(bookings);
  } catch (error) { next(error); }
});

app.get("/api/cart/holds", authenticate, async (req, res, next) => {
  try {
    const holds = await CartHold.find({ guest: req.user.id, expiresAt: { $gt: new Date() } }).populate("listing").sort({ expiresAt: 1 });
    res.json(holds);
  } catch (error) { next(error); }
});

app.post("/api/cart/holds", authenticate, async (req, res, next) => {
  const { listingId, unitId, startDate, endDate, guests } = req.body;
  if (!validDateRange(startDate, endDate) || new Date(startDate) < new Date(new Date().toDateString())) return res.status(400).json({ error: "Choose valid future check-in and check-out dates." });
  const guestCount = Number(guests);
  if (!Number.isInteger(guestCount) || guestCount < 1) return res.status(400).json({ error: "Choose at least one guest." });
  let session;
  try {
    session = await mongoose.startSession();
    let hold;
    await session.withTransaction(async () => {
      const listing = await Listing.findByIdAndUpdate(listingId, { $inc: { bookingVersion: 1 } }, { new: true, session });
      if (!listing) throw Object.assign(new Error("Listing not found."), { status: 404 });
      const freeUnits = await availableUnits(listing, new Date(startDate), new Date(endDate), guestCount, session);
      const unit = freeUnits.find((candidate) => String(candidate._id) === String(unitId));
      if (!unit) throw Object.assign(new Error("That room or service is no longer available for those dates."), { status: 409 });
      [hold] = await CartHold.create([{
        listing: listing._id,
        unitId: unit._id,
        unitName: unit.name,
        unitImage: unit.image,
        unitPrice: unit.price,
        priceUnit: listing.unit,
        guest: req.user.id,
        startDate,
        endDate,
        guests: guestCount,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      }], { session });
    });
    res.status(201).json(await hold.populate("listing"));
  } catch (error) { next(error); }
  finally { await session?.endSession(); }
});

app.delete("/api/cart/holds/:id", authenticate, async (req, res, next) => {
  try {
    const hold = await CartHold.findOneAndDelete({ _id: req.params.id, guest: req.user.id });
    if (!hold) return res.status(404).json({ error: "Cart hold not found or already expired." });
    res.json({ removed: true });
  } catch (error) { next(error); }
});

app.post("/api/bookings/checkout", authenticate, async (req, res, next) => {
  const holdIds = [...new Set((Array.isArray(req.body.holdIds) ? req.body.holdIds : []).map(String))];
  if (!holdIds.length || holdIds.length > 20) return res.status(400).json({ error: "Choose between 1 and 20 cart items to confirm." });
  let session;
  try {
    session = await mongoose.startSession();
    let confirmedBookings = [];
    await session.withTransaction(async () => {
      const now = new Date();
      const holds = await CartHold.find({ _id: { $in: holdIds }, guest: req.user.id, expiresAt: { $gt: now } }).session(session);
      if (holds.length !== holdIds.length) throw Object.assign(new Error("A cart hold expired. Refresh your cart and try again."), { status: 409 });

      const listingIds = [...new Set(holds.map((hold) => String(hold.listing)))].sort();
      const listingById = new Map();
      for (const listingId of listingIds) {
        const listing = await Listing.findByIdAndUpdate(listingId, { $inc: { bookingVersion: 1 } }, { new: true, session });
        if (!listing) throw Object.assign(new Error("A listing in your cart no longer exists."), { status: 409 });
        listingById.set(listingId, listing);
      }

      for (let index = 0; index < holds.length; index++) {
        const hold = holds[index];
        const listing = listingById.get(String(hold.listing));
        const unit = listing.inventory.id(hold.unitId);
        if (!unit || unit.maxGuests < hold.guests || unit.availableFrom > hold.startDate || unit.availableUntil < hold.endDate) {
          throw Object.assign(new Error("A cart item no longer matches its available dates or guest limit."), { status: 409 });
        }
        const freeUnits = await availableUnits(listing, hold.startDate, hold.endDate, hold.guests, session, holdIds);
        if (!freeUnits.some((candidate) => String(candidate._id) === String(hold.unitId))) {
          throw Object.assign(new Error("A cart item is no longer available for those dates."), { status: 409 });
        }
        for (const other of holds.slice(index + 1)) {
          if (String(other.listing) === String(hold.listing) && String(other.unitId) === String(hold.unitId)
            && dateRangesOverlap(other.startDate, other.endDate, hold.startDate, hold.endDate)) {
            throw Object.assign(new Error("The same room or service is in your cart twice for overlapping dates."), { status: 409 });
          }
        }
      }

      if (holds.some((hold) => hold.expiresAt <= new Date())) {
        throw Object.assign(new Error("A cart hold expired before checkout completed. Please reserve the unit again."), { status: 409 });
      }

      confirmedBookings = await Booking.create(holds.map((hold) => {
        const unit = listingById.get(String(hold.listing)).inventory.id(hold.unitId);
        return {
          listing: hold.listing,
          unitId: hold.unitId,
          unitName: unit.name,
          unitImage: unit.image,
          unitPrice: unit.price,
          priceUnit: listingById.get(String(hold.listing)).unit,
          guest: req.user.id,
          startDate: hold.startDate,
          endDate: hold.endDate,
          guests: hold.guests,
          totalPrice: bookingTotal(unit.price, hold.startDate, hold.endDate, listingById.get(String(hold.listing)).unit, hold.guests),
        };
      }), { session });
      await CartHold.deleteMany({ _id: { $in: holdIds }, guest: req.user.id }).session(session);
    });
    await Promise.all(confirmedBookings.map((booking) => booking.populate("listing")));
    res.status(201).json(confirmedBookings);
  } catch (error) { next(error); }
  finally { await session?.endSession(); }
});

app.patch("/api/bookings/:id/cancel", authenticate, async (req, res, next) => {
  try {
    const booking = await Booking.findOneAndUpdate({ _id: req.params.id, guest: req.user.id, status: "confirmed", startDate: { $gt: new Date() } }, { status: "cancelled" }, { new: true });
    if (!booking) return res.status(404).json({ error: "Upcoming booking not found." });
    res.json(booking);
  } catch (error) { next(error); }
});

app.get("/api/listings/:id/reviews", async (req, res, next) => {
  try {
    res.json(await Review.find({ listing: req.params.id }).populate("author", "name").sort({ createdAt: -1 }));
  } catch (error) { next(error); }
});

app.post("/api/listings/:id/reviews", authenticate, async (req, res, next) => {
  try {
    const { rating, comment, bookingId } = req.body;
    if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5 || !comment?.trim()) return res.status(400).json({ error: "Add a rating from 1 to 5 and a comment." });
    const booking = await Booking.findOne({ _id: bookingId, listing: req.params.id, guest: req.user.id, status: { $in: ["confirmed", "completed"] }, endDate: { $lt: new Date() } });
    if (!booking) return res.status(403).json({ error: "Reviews are available after a completed stay." });
    const review = await Review.create({ listing: req.params.id, booking: booking._id, author: req.user.id, rating: Number(rating), comment: comment.trim() });
    const aggregate = await Review.aggregate([{ $match: { listing: new mongoose.Types.ObjectId(req.params.id) } }, { $group: { _id: "$listing", averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } }]);
    await Listing.findByIdAndUpdate(req.params.id, { averageRating: Number(aggregate[0].averageRating.toFixed(2)), reviewCount: aggregate[0].reviewCount });
    res.status(201).json(await review.populate("author", "name"));
  } catch (error) { next(error); }
});

app.get("/api/host/dashboard", authenticate, requireRole("host", "admin"), async (req, res, next) => {
  try {
    const listings = await Listing.find(req.user.role === "admin" ? {} : { host: req.user.id }).lean();
    const ids = listings.map(({ _id }) => _id);
    const bookings = await Booking.find({ listing: { $in: ids } }).populate("listing", "title location").populate("guest", "name email").sort({ startDate: -1 });
    const revenue = bookings.filter(({ status }) => status !== "cancelled").reduce((sum, booking) => sum + booking.totalPrice, 0);
    res.json({ listings, bookings, stats: { listingCount: listings.length, bookingCount: bookings.length, revenue } });
  } catch (error) { next(error); }
});

const __filename = fileURLToPath(import.meta.url);
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
}

app.use((error, _req, res, _next) => {
  if (error.code === 11000) return res.status(409).json({ error: "That account or review already exists." });
  if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({ error: error.message });
  console.error(error);
  res.status(error.status || 500).json({ error: error.status ? error.message : "Something went wrong. Please try again." });
});

if (!jwtSecret) throw new Error("JWT_SECRET is required. Copy .env.example to .env and set a secret.");
await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/roam");
app.listen(port, () => console.log(`roam API listening on http://localhost:${port}`));
