import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["guest", "host", "admin"], default: "guest" },
}, { timestamps: true });

const inventoryUnitSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  image: { type: String, required: true },
  price: { type: Number, required: true, min: 1 },
  maxGuests: { type: Number, required: true, min: 1 },
  availableFrom: { type: Date, required: true },
  availableUntil: { type: Date, required: true },
});
inventoryUnitSchema.path("availableUntil").validate(function (value) {
  return value > this.availableFrom;
}, "Availability end date must be after the start date.");

const listingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  type: { type: String, enum: ["homes", "experiences", "services"], default: "homes" },
  location: { type: String, required: true, trim: true },
  coordinates: { lat: { type: Number, default: 0 }, lng: { type: Number, default: 0 } },
  price: { type: Number, required: true, min: 1 },
  unit: { type: String, default: "night" },
  maxGuests: { type: Number, default: 2, min: 1 },
  images: [{ type: String }],
  inventory: { type: [inventoryUnitSchema], default: [] },
  amenities: [{ type: String }],
  host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  averageRating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  bookingVersion: { type: Number, default: 0 },
}, { timestamps: true });

const bookingSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
  unitId: { type: mongoose.Schema.Types.ObjectId, required: true },
  unitName: { type: String, required: true },
  unitImage: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 1 },
  priceUnit: { type: String, required: true },
  guest: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  guests: { type: Number, required: true, min: 1 },
  totalPrice: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["confirmed", "cancelled", "completed"], default: "confirmed" },
}, { timestamps: true });
bookingSchema.index({ listing: 1, unitId: 1, startDate: 1, endDate: 1, status: 1 });

const cartHoldSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
  unitId: { type: mongoose.Schema.Types.ObjectId, required: true },
  unitName: { type: String, required: true },
  unitImage: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 1 },
  priceUnit: { type: String, required: true },
  guest: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  guests: { type: Number, required: true, min: 1 },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });
cartHoldSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
cartHoldSchema.index({ listing: 1, unitId: 1, startDate: 1, endDate: 1, expiresAt: 1 });

const reviewSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true, maxlength: 1200 },
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
export const Listing = mongoose.model("Listing", listingSchema);
export const Booking = mongoose.model("Booking", bookingSchema);
export const CartHold = mongoose.model("CartHold", cartHoldSchema);
export const Review = mongoose.model("Review", reviewSchema);
