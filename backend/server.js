import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const SAAVN_BASE_URL = 'https://saavn.sumit.co/api';

// Middleware
app.use(cors());
app.use(express.json());

// Redis Client Setup
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis successfully'));

// Connect to Redis
await redisClient.connect().catch(console.error);

// Generic Proxy Route Handler with Redis Caching
app.get('/api/*', async (req, res) => {
  const path = req.originalUrl.replace('/api', '');
  const cacheKey = `saavn_api:${path}`;

  try {
    // 1. Check Redis Cache
    let cachedData = null;
    try {
      cachedData = await redisClient.get(cacheKey);
    } catch (redisError) {
      console.warn(`Redis get error: ${redisError.message}`);
    }
    
    if (cachedData) {
      console.log(`[Cache Hit] ${path}`);
      return res.json(JSON.parse(cachedData));
    }

    // 2. Cache Miss - Fetch from Saavn API
    console.log(`[Cache Miss] Fetching from ${SAAVN_BASE_URL}${path}`);
    const response = await axios.get(`${SAAVN_BASE_URL}${path}`);
    const data = response.data;

    // 3. Save to Redis
    // We will cache searches for 5 minutes, and song details for 30 minutes
    let ttl = 300; // default 5 minutes
    if (path.startsWith('/songs/') || path.startsWith('/playlists?id=')) {
        ttl = 1800; // 30 minutes for details
    }

    try {
      await redisClient.setEx(cacheKey, ttl, JSON.stringify(data));
    } catch (redisError) {
      console.warn(`Redis set error: ${redisError.message}`);
    }

    // 4. Send Response
    res.json(data);

  } catch (error) {
    console.error(`Error fetching ${path}:`, error.message);
    res.status(500).json({ success: false, message: 'Error fetching data from upstream API' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
