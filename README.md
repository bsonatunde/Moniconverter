# Moniconverter - PDF Tools Application

A comprehensive PDF tools web application for converting, editing, organizing, and securing PDF files.

## 🚀 Features

### Convert Files
- **Image to PDF**: Convert JPG, PNG images to PDF
- **Office to PDF**: Convert Word, Excel, PowerPoint files to PDF
- **HTML to PDF**: Convert HTML files to PDF
- **PDF to Image**: Convert PDF pages to JPG images
- **OCR**: Extract text from images using advanced OCR technology

### Organize PDFs
- **Merge PDFs**: Combine multiple PDF files into one
- **Split PDFs**: Separate PDF into individual pages or custom ranges
- **Extract Pages**: Extract specific pages from PDF
- **Remove Pages**: Remove unwanted pages from PDF

### Edit PDFs
- **Rotate Pages**: Rotate PDF pages by 90°, 180°, or 270°
- **Add Watermarks**: Add custom text watermarks with opacity and positioning
- **Page Numbers**: Add customizable page numbers to your PDFs
- **Compress PDF**: Reduce file size while maintaining quality

### Security Tools
- **Protect PDF**: Add password protection with custom permissions
- **Unlock PDF**: Remove password protection from PDFs
- **Digital Signature**: Add digital signatures (demo implementation)
- **Compare PDFs**: Compare two PDFs for differences

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **PDF-lib** for PDF manipulation
- **Multer** for file uploads
- **Sharp** for image processing
- **Tesseract.js** for OCR
- **Mammoth** for Word document processing
- **XLSX** for Excel processing
- **HTML-PDF** for HTML to PDF conversion

### Frontend
- **React.js** with modern hooks
- **Material-UI** for beautiful, responsive design
- **React Router** for navigation
- **Axios** for API communication
- **React Dropzone** for file uploads

## 🚀 Deployment Guide

### Backend Deployment (Render)

1. **Create a Render Account**
   - Go to [render.com](https://render.com) and sign up
   - Connect your GitHub account

2. **Deploy Backend**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Configure the service:
     - **Name**: `moniconverter-api`
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
   - Add environment variables:
     - `NODE_ENV`: `production`
     - `PORT`: `10000`
   - Click "Create Web Service"

3. **Get Your API URL**
   - After deployment, copy the service URL (e.g., `https://moniconverter-api.onrender.com`)

### Frontend Deployment (Vercel)

1. **Create a Vercel Account**
   - Go to [vercel.com](https://vercel.com) and sign up
   - Connect your GitHub account

2. **Update API URL**
   - In `client/vercel.json`, replace `https://moniconverter-api.onrender.com` with your actual Render API URL

3. **Deploy Frontend**
   - Click "New Project" on Vercel dashboard
   - Import your GitHub repository
   - Configure the project:
     - **Framework Preset**: `Create React App`
     - **Root Directory**: `client`
   - Click "Deploy"

4. **Update CORS (Optional)**
   - In your Render service, update the CORS origins to include your Vercel domain

## 🌐 Live Demo

- **Frontend**: [https://moniconverter.vercel.app](https://moniconverter.vercel.app)
- **Backend API**: [https://moniconverter-api.onrender.com](https://moniconverter-api.onrender.com)

## 📁 Project Structure

```
moniconverter/
├── server/                 # Backend Node.js/Express
│   ├── index.js           # Main server file
│   ├── routes/            # API routes
│   └── uploads/           # File uploads directory
├── client/                # Frontend React app
│   ├── src/
│   ├── public/
│   └── vercel.json        # Vercel configuration
├── render.yaml            # Render deployment config
└── package.json
```

## 🚀 Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd moniconverter
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

## 📧 Contact

- **Email**: onatunde.samuel@gmail.com
- **GitHub**: [bsonatunde](https://github.com/bsonatunde)
- **LinkedIn**: [Bolaji Onatunde](https://www.linkedin.com/in/bolaji-onatunde-b42130100/)
- **Portfolio**: [bsonat.onrender.com](https://bsonat.onrender.com/)

---

**Built with ❤️ by Bolaji Onatunde**
