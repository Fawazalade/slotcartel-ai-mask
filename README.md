# 🎭 Slotcartel - AI Mask Engine

A full-stack web application for generating and applying 3D masks to facial images using MediaPipe FaceMesh for landmark detection, Three.js for 3D rendering, and AI-powered texture generation.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Three.js](https://img.shields.io/badge/Three.js-Latest-000000)

## 🌟 Features

### Core Functionality
- **Facial Landmark Detection**: Upload images to detect 468 precise facial landmarks using MediaPipe FaceMesh
- **3D Mask Rendering**: Apply pre-designed 3D masks (clown, hero, simple) to detected faces
- **Texture Generation**: AI-powered texture generation using Google Gemini for custom mask appearances
- **Real-time Processing**: Client-side processing with WebGL acceleration

### Backend API
- **Image Processing**: Process images with applied masks using Sharp
- **AI Integration**: Replicate API for advanced mask generation
- **RESTful Endpoints**: Express.js-based API with file upload support

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Frontend Setup

1. **Install dependencies:**
   
```
bash
   npm install
   
```

2. **Run the development server:**
   
```
bash
   npm run dev
   
```

3. **Open [http://localhost:3000](http://localhost:3000)** in your browser

### Backend Setup

1. **Navigate to backend directory:**
   
```
bash
   cd backend
   
```

2. **Install dependencies:**
   
```
bash
   npm install
   
```

3. **Configure environment variables:**
   Create a `.env` file in the `backend` directory:
   
```env
   PORT=3001
   MAX_FILE_SIZE=10485760
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   REPLICATE_API_TOKEN=your_replicate_token
   
```

4. **Start the backend server:**
   
```
bash
   npm run dev
   
```

5. **Backend runs on [http://localhost:3001](http://localhost:3001)**

## 📁 Project Structure

```
slotcartel/
├── src/                          # Next.js frontend source
│   ├── app/                      # Next.js app directory
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Main page with FaceMeshDetector
│   │   ├── globals.css            # Global styles
│   │   ├── api/                  # API routes
│   │   │   └── generate-texture/ # Texture generation API
│   │   └── invitation/           # Invitation pages
│   │       └── [slug]/           # Dynamic invitation routes
│   ├── components/               # React components
│   │   ├── FaceMeshDetector.tsx  # Image upload and landmark detection
│   │   ├── FaceMesh3D.tsx        # 3D mask rendering component
│   │   ├── MaskLoader.tsx        # Mask model loading utilities
│   │   └── MaskCompositor.tsx    # Mask composition handling
│   ├── hooks/                    # Custom React hooks
│   │   └── useTextureGeneration.ts  # Texture generation logic
│   ├── services/                 # Business logic services
│   │   ├── materialSystem.ts     # Material and shader management
│   │   ├── promptProcessor.ts    # AI prompt processing
│   │   ├── textureGenerator.ts   # Texture generation service
│   │   └── uvMapper.ts           # UV mapping utilities
│   └── utils/                    # Utility functions
│       ├── coordinates.ts        # Coordinate transformations
│       ├── landmarks.ts          # Landmark processing
│       ├── triangulation.ts      # Mesh triangulation
│       ├── maskTypes.ts          # Mask type definitions
│       ├── texture.ts            # Texture utilities
│       └── generateMaskImage.ts  # Mask image generation
├── public/
│   └── models/                   # 3D mask models
│       ├── clown-mask.obj        # Clown mask model
│       ├── hero-mask.glb         # Hero mask model
│       └── simple-mask.glb       # Simple mask model
├── backend/                      # Express.js backend
│   ├── server.ts                 # Main Express server
│   ├── services/
│   │   └── maskProcessor.ts      # Image processing service
│   ├── uploads/                  # Uploaded files directory
│   └── outputs/                  # Processed images directory
└── package.json                  # Frontend dependencies
```

## 🎮 Usage

1. **Upload an Image**: Click "Upload Image" to select a clear face photo
2. **Detect Landmarks**: The system automatically detects 468 facial landmarks
3. **Choose a Mask**: Select from available 3D masks (clown, hero, simple)
4. **Generate Texture**: Optionally use AI to generate custom textures
5. **View & Export**: See the masked result and download as needed

## 🔌 API Endpoints

### Backend API (Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/process-mask` | Process image with mask |

### Frontend API (Port 3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate-texture` | Generate AI texture |

## ✅ Current Status

| Feature | Status |
|---------|--------|
| Facial landmark detection | ✅ Complete |
| Image upload and processing | ✅ Complete |
| Landmark visualization | ✅ Complete |
| 3D mask rendering | ✅ Complete |
| JSON export functionality | ✅ Complete |
| AI texture generation | ✅ Complete |
| Backend API integration | ✅ Complete |
| Mask composition | ✅ Complete |

## 🛠️ Technologies Used

### Frontend
- **Next.js 16** - React framework
- **React 19** - UI library
- **TypeScript 5** - Type safety
- **MediaPipe FaceMesh** - Facial landmark detection
- **Three.js / React Three Fiber** - 3D rendering
- **Tailwind CSS 4** - Styling
- **WebGL** - Hardware acceleration

### Backend
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Sharp** - Image processing
- **Multer** - File upload handling
- **Replicate** - AI model hosting
- **Canvas** - Image manipulation

## 📝 Environment Variables

### Frontend (.env.local)
```
env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Backend (.env)
```
env
PORT=3001
MAX_FILE_SIZE=10485760
NEXT_PUBLIC_APP_URL=http://localhost:3000
REPLICATE_API_TOKEN=your_token_here
```

## 🤝 Contributing

This project is in active development. Feel free to contribute by:
1. Forking the repository
2. Creating a feature branch
3. Making your changes
4. Submitting a pull request

## 📄 License

This project is proprietary software. All rights reserved.

---

Built with ❤️ using Next.js, MediaPipe, Three.js, and AI
