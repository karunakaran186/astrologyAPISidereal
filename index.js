const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const swe = require('swisseph');

const app = express();
app.use(bodyParser.json());
const port = process.env.PORT || 3000;

// Set Swiss Ephemeris path
swe.swe_set_ephe_path(path.join(__dirname, 'ephe'));

// City to lat/lon map
const cities = {
  delhi: { lat: 28.6139, lon: 77.2090 },
  mumbai: { lat: 19.0760, lon: 72.8777 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  hyderabad: { lat: 17.3850, lon: 78.4867 },
  pune: { lat: 18.5204, lon: 73.8567 }
};

// Planet list
const PLANETS = [
  { id: swe.SE_SUN, name: 'Sun' },
  { id: swe.SE_MOON, name: 'Moon' },
  { id: swe.SE_MERCURY, name: 'Mercury' },
  { id: swe.SE_VENUS, name: 'Venus' },
  { id: swe.SE_MARS, name: 'Mars' },
  { id: swe.SE_JUPITER, name: 'Jupiter' },
  { id: swe.SE_SATURN, name: 'Saturn' },
  { id: swe.SE_URANUS, name: 'Uranus' },
  { id: swe.SE_NEPTUNE, name: 'Neptune' },
  { id: swe.SE_PLUTO, name: 'Pluto' },
  { id: swe.SE_MEAN_NODE, name: 'Rahu' }
];

// API endpoint
app.post('/horoscope', (req, res) => {
  const { date, time, location } = req.body;

  if (!date || !time || !location) {
    return res.status(400).json({ error: 'Missing date, time or location' });
  }

  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const utcHour = hour + minute / 60;
  const cityKey = location.toLowerCase();

  const coords = cities[cityKey];
  if (!coords) {
    return res.status(400).json({ error: 'Unsupported location' });
  }

  const jd = swe.swe_julday(year, month, day, utcHour, swe.SE_GREG_CAL);
  swe.swe_set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);

  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SIDEREAL;
  const results = [];

  for (const planet of PLANETS) {
    const result = swe.swe_calc_ut(jd, planet.id, flags);
    if (result.error) {
      continue;
    }

    // Safely check for each property before calling toFixed()
    const longitude = result.longitude ? result.longitude.toFixed(6) : 'N/A';
    const speed = result.speed ? result.speed.toFixed(6) : 'N/A';
    const retrograde = result.speed < 0;
    const rightAscension = result.rectascension ? result.rectascension.toFixed(6) : 'N/A';
    const declination = result.declination ? result.declination.toFixed(6) : 'N/A';

    results.push({
      planet: planet.name,
      longitude: longitude,
      speed: speed,
      retrograde: retrograde,
      rightAscension: rightAscension,
      declination: declination
    });
  }

  // Add Ketu manually (opposite of Rahu)
  const rahu = results.find(p => p.planet === 'Rahu');
  if (rahu) {
    const ketuLongitude = (parseFloat(rahu.longitude) + 180) % 360;
    results.push({
      planet: 'Ketu',
      longitude: ketuLongitude.toFixed(6),
      speed: rahu.speed,
      retrograde: rahu.retrograde,
      rightAscension: 'N/A',
      declination: 'N/A'
    });
  }

  res.json({
    input: { date, time, location },
    coordinates: coords,
    julianDay: jd,
    siderealPositions: results
  });
});

app.listen(port, () => {
  console.log(`✅ Horoscope API running at http://localhost:${port}`);
});
