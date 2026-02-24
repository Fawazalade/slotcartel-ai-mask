// server.ts - Express backend for mask processing
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { processImageWithMask } from './services/maskProcessor';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // Default 10MB

// Middleware
app.use(cors({
  origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP allowed.'));
      return;
    }
    cb(null, true);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Main processing endpoint
app.post('/api/process-mask', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { landmarks, maskType, prompt, solidColor } = req.body;

    if (!landmarks) {
      return res.status(400).json({ error: 'Face landmarks required' });
    }

    // Parse landmarks (sent as JSON string from frontend)
    const parsedLandmarks = JSON.parse(landmarks);

    // Process the image
    const result = await processImageWithMask({
      imagePath: req.file.path,
      landmarks: parsedLandmarks,
      maskType: maskType || 'full-face',
      prompt: prompt || null,
      solidColor: solidColor || '#000000',
    });

    res.json({
      success: true,
      resultUrl: result.url,
      processingTime: result.processingTime,
    });

  } catch (error) {
    console.error('[API Error]:', error);
    res.status(500).json({
      error: 'Image processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Mask engine backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
