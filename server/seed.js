
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Hotel = require("./models/Hotel");
const RoomCategory = require("./models/RoomCategory");
const Room = require("./models/Room");
const SeasonalPrice = require("./models/SeasonalPrice");
const Setting = require("./models/Setting");
const { parseDay } = require("./utils/dates");

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;

const people = [
  { name: "Admin", email: "admin@hotelpro.com", password: "admin123", phone: "9999999999", userType: "Admin" },
  { name: "Sana Front Desk", email: "staff@hotelpro.com", password: "staff123", phone: "9888888888", userType: "Staff", department: "Front desk" },
  { name: "Ravi Housekeeping", email: "housekeeping@hotelpro.com", password: "staff123", phone: "9777777777", userType: "Staff", department: "Housekeeping" },
  { name: "Demo Guest", email: "guest@hotelpro.com", password: "guest123", phone: "9666666666", userType: "Ordinary" },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hotelpro");
    await Setting.get();

    for (const p of people) {
      if (!(await User.findOne({ email: p.email }))) {
        await User.create({ ...p, password: await bcrypt.hash(p.password, 10), emailVerified: true });
        console.log(`Created ${p.userType}: ${p.email} / ${p.password}`);
      }
    }

    let hotel = await Hotel.findOne({ name: "HotelPro Grand" });
    if (!hotel) {
      hotel = await Hotel.create({
        name: "HotelPro Grand",
        address: "12 MG Road",
        city: "Indore",
        phone: "0731-000000",
        email: "stay@hotelpro.com",
        description: "Our flagship property in the city centre.",
        amenities: ["Wi-Fi", "Breakfast", "Parking", "Gym"],
      });
    }

    const cats = {};
    for (const c of [
      { name: "Standard", description: "Comfortable everyday rooms" },
      { name: "Family", description: "Extra space for 3-4 guests" },
      { name: "Suite", description: "Separate living area and premium amenities" },
    ]) {
      cats[c.name] = (await RoomCategory.findOne({ name: c.name })) || (await RoomCategory.create(c));
    }

    const rooms = [
      { roomNumber: 101, maxCount: 2, rentPerDay: 1500, type: "Non-Delux", category: "Standard", description: "Queen bed, city view and work desk.", photos: [img("photo-1631049307264-da0ec9d70304")], amenities: ["Wi-Fi", "AC", "TV"] },
      { roomNumber: 102, maxCount: 3, rentPerDay: 2200, type: "Non-Delux", category: "Family", description: "Twin beds plus sofa bed, ideal for small families.", photos: [img("photo-1618773928121-c32242e63f39")], amenities: ["Wi-Fi", "AC", "TV", "Mini fridge"] },
      { roomNumber: 201, maxCount: 2, rentPerDay: 3500, type: "Delux", category: "Standard", description: "King bed with private balcony.", photos: [img("photo-1590490360182-c33d57733427")], amenities: ["Wi-Fi", "AC", "TV", "Balcony"] },
      { roomNumber: 202, maxCount: 4, rentPerDay: 4800, type: "Delux", category: "Family", description: "Two king beds and a large seating area.", photos: [img("photo-1611892440504-42a792e24d32")], amenities: ["Wi-Fi", "AC", "TV", "Bathtub"] },
      { roomNumber: 301, maxCount: 4, rentPerDay: 6000, type: "Delux", category: "Suite", description: "Panoramic suite with living room and dining area.", photos: [img("photo-1578683010236-d716f9a3f461")], amenities: ["Wi-Fi", "AC", "TV", "Bathtub", "Lounge"] },
    ];
    for (const r of rooms) {
      if (!(await Room.findOne({ roomNumber: r.roomNumber }))) {
        await Room.create({ ...r, category: cats[r.category]._id, hotel: hotel._id });
        console.log("Added room", r.roomNumber);
      }
    }

    if (!(await SeasonalPrice.findOne({ name: "Year-end peak" }))) {
      await SeasonalPrice.create({ name: "Year-end peak", startDate: parseDay("2026-12-20"), endDate: parseDay("2027-01-05"), adjustmentPercent: 25, roomType: "All" });
      console.log("Added seasonal rule: Year-end peak (+25%)");
    }

    console.log("Seed complete");
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
