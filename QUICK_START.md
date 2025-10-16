# Quick Start Guide

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Open in Browser
Navigate to `http://localhost:3000`

---

## Testing the Application

### Using Local Files

The most reliable way to test the application is with local files:

1. Download sample vehicle images or videos
2. Use the "Upload File" button or drag-and-drop
3. Click "Detect Vehicles" for images, or use video controls for videos
4. View results in the detection panel

### Using URL Input

To analyze media from external sources:

1. Click "Use URL Instead"
2. Paste a URL to an image or video
3. Click "Analyze"

**Note**: URL uploads require CORS headers from the source. If color detection shows "Unknown" or falls back to default colors, this is likely a CORS issue. Download the file locally instead.

---

## Understanding the Results

### Detection Display

Each detected vehicle shows:
- Vehicle type (car, truck, bus, etc.)
- Detection confidence percentage
- Extracted color with visual swatch
- Bounding box on the image

### Console Output

For debugging, open the browser console (F12) to see detailed logs:

```
Loading COCO-SSD model...
Model loaded successfully
Starting vehicle detection...
Detected 3 vehicles
```

During color analysis, you'll see:
```
Sampling vehicle region: 150x80 from bbox 300x200
Analyzing 12000 pixels for color...
Valid pixels for color analysis: 8500
Color detected: Red (RGB: 185, 45, 38) - Hex: #b92d26
```

---

## CORS and Color Detection

### What is CORS?

Cross-Origin Resource Sharing (CORS) is a security feature that restricts how browsers access resources from different domains. When analyzing colors, the application needs to read pixel data from the image, which requires CORS headers.

### When CORS Causes Issues

If you see these symptoms:
- Colors showing as "Unknown"
- Console error: "SecurityError" or "CORS issue"
- Fallback colors being used

The source URL doesn't allow pixel-level access.

### Fallback Colors

When pixel analysis fails, these defaults are used:
- Cars: Silver
- Buses: Yellow
- Trucks: White
- Motorcycles: Black
- Bicycles: Blue

### Solution

Download the image and use local file upload instead of URL input.

---

## Sample Test URLs

These URLs are CORS-friendly and work well for testing:

**Single Vehicles:**
```
https://images.unsplash.com/photo-1614200187524-dc4b892acf16
https://images.unsplash.com/photo-1583121274602-3e2820c69888
https://images.unsplash.com/photo-1552519507-da3b142c6e3d
https://images.unsplash.com/photo-1549317661-bd32c8ce0db2
https://images.unsplash.com/photo-1617531653332-bd46c24f2068
```

**Multiple Vehicles:**
```
https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg
```

---

## Video Analysis

### Controls

- **Detect Current Frame**: Analyze the current paused frame
- **Auto-Detect While Playing**: Continuously detect vehicles as the video plays
- **Stop Auto-Detect**: Stop continuous detection

### Timestamps

Each detection in a video includes a timestamp showing when the detection occurred (HH:MM:SS.MS format).

### Best Practices

- Use videos with clear, well-lit vehicles
- 720p or 1080p resolution recommended
- Shorter videos (under 2 minutes) process faster
- MP4 format is most compatible

---

## Color Detection Accuracy

Expected accuracy varies by scenario:

| Scenario | Expected Accuracy | Notes |
|----------|------------------|-------|
| Bright solid colors | 80-90% | Red, blue, yellow in daylight |
| Grayscale vehicles | 85-95% | White, black, silver |
| Dark colors | 65-75% | Navy, dark green, dark red |
| Metallic paint | 60-70% | Pearl, metallic finishes |
| Multi-color vehicles | 40-50% | Picks dominant color |
| Dirty vehicles | 30-40% | May appear brown or gray |

### Factors Affecting Accuracy

- Image quality and resolution
- Lighting conditions
- Vehicle angle and visibility
- Paint finish (matte vs metallic)
- Shadows and reflections

---

## Common Console Messages

### Normal Operation
```
Loading COCO-SSD model...
Model loaded successfully
Starting vehicle detection...
Detected 1 vehicles
```

### Successful Color Detection
```
Sampling vehicle region: 150x80 from bbox 300x200
Valid pixels for color analysis: 8500
Color detected: Red (RGB: 185, 45, 38) - Hex: #b92d26
```

### Warnings (Non-Critical)
```
Not enough valid pixels for color analysis
```
This means color detection failed for this vehicle, but the vehicle was still detected.

### CORS Errors
```
Error drawing image to canvas: SecurityError
This is likely a CORS issue. Using fallback color detection.
```
The URL doesn't allow pixel access. Use local file upload instead.

---

## Troubleshooting

### Colors Show as "Gray" or "Unknown"

1. Check if the vehicle is actually gray or silver
2. Open console and look for warnings about pixel analysis
3. Try a different image with better lighting
4. If using URL, try local file upload instead

### No Vehicles Detected

1. Ensure vehicles are clearly visible in the image
2. Try images with larger, closer vehicles
3. Check that the model loaded successfully (console message)
4. Verify the image format is supported (JPG, PNG, WebP)

### Model Not Loading

1. Check internet connection (model downloads from CDN)
2. Verify WebGL is enabled in browser
3. Try a different browser (Chrome/Edge recommended)
4. Clear browser cache and reload

### Video Not Playing

1. Verify video format (MP4 most compatible)
2. Check browser codec support
3. Try a different video file
4. For URLs, ensure the source allows embedding

---

## Tips for Best Results

### Image Selection
- Use high-resolution images (1280x720 or higher)
- Ensure good lighting conditions
- Vehicles should be clearly visible
- Side or 3/4 view works best

### Testing Strategy
1. Start with bright, solid-colored vehicles
2. Test grayscale vehicles (white, black, silver)
3. Try multi-vehicle scenes
4. Test edge cases (dirty vehicles, shadows, angles)

### Understanding Results
- Colors are approximate, not exact matches
- The goal is visual differentiation, not precision
- Some variation is normal and expected
- Check console logs for detailed analysis data

---

## Success Checklist

Before reporting issues, verify:
- [ ] Browser console is open and showing logs
- [ ] "Model loaded successfully" message appears
- [ ] Detection logs appear when analyzing
- [ ] Tried both local upload and URL (if applicable)
- [ ] Tested with multiple different images

---

## Getting Help

If you encounter persistent issues, gather this information:

1. Console output (copy/paste the logs)
2. Browser name and version
3. Image source (local file or URL)
4. Expected vs actual results
5. Screenshot if relevant

Check the TESTING_GUIDE.md for more detailed debugging procedures.
