import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql2/promise";
import env from "dotenv";


const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// MySQL 
const db = await mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,           
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.DB_PORT,
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // radius of earth
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

//  GET /listSchools
app.get("/listSchools", async (req, res) => {
  const { latitude, longitude } = req.query;

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: "Invalid latitude or longitude" });
  }

  try {
    const [rows] = await db.execute("SELECT * FROM schools");

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    const sorted = rows.map((school) => ({
      ...school,
      distance: calculateDistance(userLat, userLon, school.latitude, school.longitude)
    })).sort((a, b) => a.distance - b.distance);

    res.status(200).json(sorted);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve schools!" });
  }
});

//  POST /addSchool
app.post("/addSchool", async (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  if (!name || !address || isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: "Invalid input!" });
  }

  try {
    const [result] = await db.execute(
      "INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)",
      [name, address, latitude, longitude]
    );

    res.status(201).json({
      message: "School added successfully!",
      schoolId: result.insertId  
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error!" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
