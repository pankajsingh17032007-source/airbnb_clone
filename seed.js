import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Listing, User } from "./models.js";

const demoListings = [
  { title: "The little white house by the sea", description: "Slow mornings, sea air, and a sunlit terrace on the coast of Paros.", type: "homes", location: "Paros, Greece", coordinates: { lat: 37.0853, lng: 25.1486 }, price: 184, maxGuests: 4, images: ["https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=85"], amenities: ["Sea view", "Kitchen", "Wifi"] },
  { title: "Desert hideaway under the stars", description: "A quiet, design-led cabin with long desert views and a private deck.", type: "homes", location: "Joshua Tree, United States", coordinates: { lat: 34.1347, lng: -116.3131 }, price: 219, maxGuests: 2, images: ["https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85"], amenities: ["Desert view", "Fire pit", "Kitchen"] },
  { title: "Jungle canopy, open-air living", description: "Wake to the sounds of the forest in this open-air Ubud retreat.", type: "homes", location: "Ubud, Indonesia", coordinates: { lat: -8.5069, lng: 115.2625 }, price: 136, maxGuests: 3, images: ["https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=85"], amenities: ["Jungle view", "Pool", "Wifi"] },
  { title: "A balcony above the blue", description: "A bright coastal home with room for everyone and the sea just below.", type: "homes", location: "Amalfi Coast, Italy", coordinates: { lat: 40.6281, lng: 14.484 }, price: 278, maxGuests: 5, images: ["https://images.unsplash.com/photo-1534237710431-e2fc698436d0?auto=format&fit=crop&w=1200&q=85"], amenities: ["Ocean view", "Balcony", "Kitchen"] },
  { title: "After-dark fado & hidden taverns", description: "Walk the old lanes, hear live fado, and taste neighborhood favorites.", type: "experiences", location: "Lisbon, Portugal", coordinates: { lat: 38.7223, lng: -9.1393 }, price: 58, unit: "person", maxGuests: 8, images: ["https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85"], amenities: ["Local guide", "Food included"] },
  { title: "Tea, stillness & a Kyoto garden", description: "A mindful tea ritual in a small garden with a local tea host.", type: "experiences", location: "Kyoto, Japan", coordinates: { lat: 35.0116, lng: 135.7681 }, price: 76, unit: "person", maxGuests: 6, images: ["https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=85"], amenities: ["Tea tasting", "Garden"] },
  { title: "Tacos, murals & a local's city", description: "Discover colorful streets, neighborhood taquerias, and the artists behind them.", type: "experiences", location: "Mexico City, Mexico", coordinates: { lat: 19.4326, lng: -99.1332 }, price: 64, unit: "person", maxGuests: 8, images: ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85"], amenities: ["Local guide", "Tastings"] },
  { title: "Souk stories & supper at home", description: "Shop the old medina, then share a home-cooked meal with a local host.", type: "experiences", location: "Marrakech, Morocco", coordinates: { lat: 31.6295, lng: -7.9811 }, price: 82, unit: "person", maxGuests: 6, images: ["https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1200&q=85"], amenities: ["Dinner", "Local guide"] },
  { title: "A slow morning sound bath", description: "Ease into the day with a private sound bath surrounded by tropical greenery.", type: "services", location: "Bali, Indonesia", coordinates: { lat: -8.4095, lng: 115.1889 }, price: 42, unit: "person", maxGuests: 4, images: ["https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=1200&q=85"], amenities: ["Mats provided", "Outdoor"] },
  { title: "A Parisian portrait walk", description: "A gentle photo walk through beautiful corners of the city with a local photographer.", type: "services", location: "Paris, France", coordinates: { lat: 48.8566, lng: 2.3522 }, price: 95, unit: "session", maxGuests: 3, images: ["https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=85"], amenities: ["Photographer", "Edited photos"] },
  { title: "Get ready, feel like yourself", description: "A relaxed, in-room styling and makeup session for a special day out.", type: "services", location: "New York, United States", coordinates: { lat: 40.7128, lng: -74.006 }, price: 110, unit: "session", maxGuests: 2, images: ["https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=85"], amenities: ["In-home service", "Personalized"] },
  { title: "Beachside yoga, just for you", description: "A private, all-levels yoga session timed for the soft light of morning.", type: "services", location: "Tulum, Mexico", coordinates: { lat: 20.2114, lng: -87.4654 }, price: 55, unit: "session", maxGuests: 5, images: ["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=85"], amenities: ["Mats provided", "Beach"] },
];

if (!process.env.MONGODB_URI || !process.env.SEED_HOST_PASSWORD) {
  throw new Error("Set MONGODB_URI and SEED_HOST_PASSWORD before seeding demo data.");
}

await mongoose.connect(process.env.MONGODB_URI);
const email = (process.env.SEED_HOST_EMAIL || "host@roam.demo").toLowerCase();
const host = await User.findOneAndUpdate(
  { email },
  { $setOnInsert: { name: "Roam Host", email, passwordHash: await bcrypt.hash(process.env.SEED_HOST_PASSWORD, 12), role: "host" } },
  { upsert: true, new: true, setDefaultsOnInsert: true },
);
for (const listing of demoListings) {
  let saved = await Listing.findOne({ title: listing.title, host: host._id });
  if (!saved) saved = await Listing.create({ ...listing, host: host._id });
  if (!saved.inventory.length) {
    await Listing.updateOne({ _id: saved._id }, { $set: { inventory: [{
      name: listing.type === "homes" ? "Entire place" : "Private session",
      image: listing.images[0],
      price: listing.price,
      maxGuests: listing.maxGuests,
      availableFrom: new Date("2025-01-01T00:00:00.000Z"),
      availableUntil: new Date("2035-01-01T00:00:00.000Z"),
    }] } });
  }
}
console.log(`Demo host: ${email}. Seeded ${demoListings.length} listings.`);
await mongoose.disconnect();
