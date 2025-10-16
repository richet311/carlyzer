"use client";

import { useEffect, useRef, useState } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";
import Alert from "./Alert";
import FileUploader from "./FileUploader";

interface DetectedVehicle {
  id: number;
  class: string;
  score: number;
  bbox: [number, number, number, number];
  color?: string;
  analysis?: VehicleAnalysis;
  debugImage?: string;
}

interface VehicleAnalysis {
  vehicleType: string;
  confidence: number;
  color: string;
  colorHex: string;
  colorConfidence: number;
  colorMethod: "api-ai" | "pixel-analysis" | "fallback";
  debugInfo?: string;
}

interface VehicleAnalyzerProps {
  fileUrl: string;
  file: File | null;
  onReset: () => void;
}

export default function VehicleAnalyzer({
  fileUrl: initialFileUrl,
  file: initialFile,
  onReset,
}: VehicleAnalyzerProps) {
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [detectedVehicles, setDetectedVehicles] = useState<DetectedVehicle[]>(
    []
  );
  const [isVideo, setIsVideo] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showUploader, setShowUploader] = useState(false);
  const [fileUrl, setFileUrl] = useState(initialFileUrl);
  const [file, setFile] = useState<File | null>(initialFile);
  const [hasAttemptedDetection, setHasAttemptedDetection] = useState(false);
  const [continuousDetection, setContinuousDetection] = useState(false);
  const [lastDetectionTimestamp, setLastDetectionTimestamp] = useState<
    string | null
  >(null);

  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const continuousDetectionRef = useRef<boolean>(false);

  // Format video time as HH:MM:SS or MM:SS
  const formatVideoTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log("Loading COCO-SSD model...");
        const loadedModel = await cocoSsd.load({
          base: "mobilenet_v2",
        });
        setModel(loadedModel);
        setLoading(false);
        console.log("Model loaded successfully");
      } catch (error) {
        console.error("Error loading model:", error);
        setLoading(false);
      }
    };

    loadModel();
  }, []);

  useEffect(() => {
    if (file) {
      setIsVideo(file.type.startsWith("video/"));
    }
  }, [file]);

  // Handle new file upload
  const handleFileUpload = (newFile: File) => {
    // Clean up previous URL if it was from a local file
    if (fileUrl && file) {
      URL.revokeObjectURL(fileUrl);
    }

    // Stop any ongoing video detection
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setFile(newFile);
    const url = URL.createObjectURL(newFile);
    setFileUrl(url);
    setShowUploader(false);
    setDetectedVehicles([]);
    setAnalyzing(false);
    setIsVideo(newFile.type.startsWith("video/"));
    setHasAttemptedDetection(false);
    setContinuousDetection(false);
    continuousDetectionRef.current = false; // Reset ref
    setLastDetectionTimestamp(null);
  };

  // Handle URL input
  const handleUrlInput = (url: string) => {
    // Clean up previous URL if it was from a local file
    if (fileUrl && file) {
      URL.revokeObjectURL(fileUrl);
    }

    // Stop any ongoing video detection
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setFileUrl(url);
    setFile(null);
    setShowUploader(false);
    setDetectedVehicles([]);
    setAnalyzing(false);
    setHasAttemptedDetection(false);
    setContinuousDetection(false);
    continuousDetectionRef.current = false; // Reset ref
    setLastDetectionTimestamp(null);

    // Determine if URL is video based on extension
    const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv"];
    const isVideoUrl = videoExtensions.some((ext) =>
      url.toLowerCase().includes(ext)
    );
    setIsVideo(isVideoUrl);
  };

  // Handle "Try Another Analysis" button click
  const handleTryAnother = () => {
    // Stop video detection if running
    if (isVideo && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaRef.current && mediaRef.current instanceof HTMLVideoElement) {
      mediaRef.current.pause();
    }

    setShowUploader(true);
    // Don't clear results yet, keep visible until new upload
    setAnalyzing(false);
    setContinuousDetection(false);
    continuousDetectionRef.current = false; // Reset ref
  };

  const getFallbackColor = (
    vehicleType: string
  ): {
    color: string;
    colorHex: string;
    confidence: number;
    method: "fallback";
  } => {
    const colorMap: { [key: string]: { color: string; colorHex: string } } = {
      car: { color: "Silver", colorHex: "#C0C0C0" },
      truck: { color: "White", colorHex: "#FFFFFF" },
      bus: { color: "Yellow", colorHex: "#FFD700" },
      motorcycle: { color: "Black", colorHex: "#333333" },
      bicycle: { color: "Blue", colorHex: "#4169E1" },
      airplane: { color: "White", colorHex: "#F5F5F5" },
      boat: { color: "White", colorHex: "#FAFAFA" },
      train: { color: "Gray", colorHex: "#808080" },
    };

    const fallback = colorMap[vehicleType.toLowerCase()] || {
      color: "Gray",
      colorHex: "#808080",
    };

    return { ...fallback, confidence: 0.3, method: "fallback" };
  };

  const rgbToHsl = (
    r: number,
    g: number,
    b: number
  ): [number, number, number] => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / diff + 2) / 6;
          break;
        case b:
          h = ((r - g) / diff + 4) / 6;
          break;
      }
    }

    return [h * 360, s, l];
  };

  const getAdvancedColorName = (r: number, g: number, b: number): string => {
    const [h, s, l] = rgbToHsl(r, g, b);

    // Very dark colors
    if (l < 0.12) return "Black";

    // Very light colors
    if (l > 0.88 && s < 0.15) return "White";

    // Low saturation colors (grayscale spectrum)
    if (s < 0.08) {
      if (l > 0.85) return "Pearl White";
      if (l > 0.75) return "Silver";
      if (l > 0.65) return "Light Gray";
      if (l > 0.55) return "Medium Gray";
      if (l > 0.45) return "Gray";
      if (l > 0.35) return "Dark Gray";
      if (l > 0.25) return "Charcoal";
      return "Black";
    }

    // BROWN/TAN
    if (s >= 0.08 && s < 0.4 && h >= 15 && h < 55) {
      if (l > 0.7) return "Cream";
      if (l > 0.6) return "Beige";
      if (l > 0.5) return "Tan";
      if (l > 0.4) return "Light Brown";
      if (l > 0.3) return "Brown";
      if (l > 0.2) return "Dark Brown";
      return "Chocolate";
    }

    // RED SPECTRUM
    if ((h >= 340 || h < 20) && s >= 0.12) {
      if (l > 0.75) return "Light Pink";
      if (l > 0.65) return "Rose";
      if (l > 0.55) return "Light Red";
      if (l > 0.45) return "Red";
      if (l > 0.35) return "Crimson";
      if (l > 0.25) return "Dark Red";
      return "Maroon";
    }

    // PINK/MAGENTA
    if (h >= 300 && h < 340 && s >= 0.15) {
      if (l > 0.75) return "Light Pink";
      if (l > 0.65) return "Pink";
      if (l > 0.55) return "Hot Pink";
      if (l > 0.45) return "Fuchsia";
      if (l > 0.35) return "Magenta";
      return "Deep Pink";
    }

    // ORANGE SPECTRUM
    if (h >= 10 && h < 40 && s >= 0.2) {
      if (l > 0.75) return "Peach";
      if (l > 0.65) return "Light Orange";
      if (l > 0.55) return "Orange";
      if (l > 0.45) return "Burnt Orange";
      if (l > 0.35) return "Dark Orange";
      return "Rust";
    }

    // YELLOW SPECTRUM
    if (h >= 40 && h < 70 && s >= 0.2) {
      if (l > 0.8) return "Cream";
      if (l > 0.7) return "Light Yellow";
      if (l > 0.6) return "Yellow";
      if (l > 0.5) return "Gold";
      if (l > 0.4) return "Mustard";
      return "Amber";
    }

    // GREEN SPECTRUM
    if (h >= 70 && h < 170 && s >= 0.1) {
      if (h >= 70 && h < 90) {
        if (l > 0.7) return "Lime";
        if (l > 0.6) return "Light Green";
        if (l > 0.5) return "Green";
        if (l > 0.4) return "Forest Green";
        return "Dark Green";
      }
      if (h >= 90 && h < 120) {
        if (l > 0.7) return "Mint Green";
        if (l > 0.6) return "Light Green";
        if (l > 0.5) return "Green";
        if (l > 0.4) return "Emerald";
        return "Dark Green";
      }
      if (h >= 120 && h < 150) {
        if (l > 0.7) return "Seafoam";
        if (l > 0.6) return "Light Green";
        if (l > 0.5) return "Teal";
        if (l > 0.4) return "Green";
        return "Dark Teal";
      }
      if (h >= 150 && h < 170) {
        if (l > 0.6) return "Turquoise";
        if (l > 0.5) return "Cyan";
        if (l > 0.4) return "Teal";
        return "Dark Teal";
      }
    }

    // BLUE SPECTRUM
    if (h >= 170 && h < 260 && s >= 0.15) {
      if (h >= 170 && h < 200) {
        if (l > 0.7) return "Light Blue";
        if (l > 0.6) return "Sky Blue";
        if (l > 0.5) return "Blue";
        if (l > 0.4) return "Royal Blue";
        if (l > 0.3) return "Navy";
        return "Dark Navy";
      }
      if (h >= 200 && h < 230) {
        if (l > 0.7) return "Light Blue";
        if (l > 0.6) return "Blue";
        if (l > 0.5) return "Cobalt";
        if (l > 0.4) return "Blue";
        if (l > 0.3) return "Navy";
        return "Midnight Blue";
      }
      if (h >= 230 && h < 260) {
        if (l > 0.7) return "Periwinkle";
        if (l > 0.6) return "Light Blue";
        if (l > 0.5) return "Blue";
        if (l > 0.4) return "Indigo";
        return "Dark Blue";
      }
    }

    // PURPLE SPECTRUM
    if (h >= 260 && h < 300 && s >= 0.15) {
      if (h >= 260 && h < 280) {
        if (l > 0.7) return "Lavender";
        if (l > 0.6) return "Light Purple";
        if (l > 0.5) return "Purple";
        if (l > 0.4) return "Violet";
        return "Dark Purple";
      }
      if (h >= 280 && h < 300) {
        if (l > 0.7) return "Light Purple";
        if (l > 0.6) return "Purple";
        if (l > 0.5) return "Plum";
        if (l > 0.4) return "Purple";
        return "Dark Purple";
      }
    }

    // Fallback for any missed colors
    return "Mixed";
  };

  /* 
    Extract and analyze with multiple region strategies
  */
  const extractDominantColorWithDebug = async (
    imageElement: HTMLImageElement | HTMLVideoElement,
    bbox: [number, number, number, number],
    vehicleType: string = "car"
  ): Promise<{
    color: string;
    colorHex: string;
    confidence: number;
    method: "api-ai" | "pixel-analysis" | "fallback";
    debugImage?: string;
    debugInfo?: string;
  }> => {
    try {
      const [x, y, width, height] = bbox;

      console.log("=== COLOR DETECTION DEBUG ===");
      console.log(`Original bbox: x=${x}, y=${y}, w=${width}, h=${height}`);
      console.log(
        `Image size: ${
          imageElement instanceof HTMLImageElement
            ? imageElement.naturalWidth
            : (imageElement as HTMLVideoElement).videoWidth
        } x ${
          imageElement instanceof HTMLImageElement
            ? imageElement.naturalHeight
            : (imageElement as HTMLVideoElement).videoHeight
        }`
      );

      // COCO-SSD bbox
      const strategies = [
        {
          name: "Full Vehicle (Adjusted)",
          region: {
            x: x,
            y: Math.max(0, y - height * 0.3), // UP 30% of height
            w: width,
            h: height * 1.3, // Make taller to compensate
          },
        },
        {
          name: "Upper Body Area",
          region: {
            x: x + width * 0.05,
            y: Math.max(0, y - height * 0.05), // UP 5% of height (lowered for better centering)
            w: width * 0.9,
            h: height * 0.8, // Taller to capture more of the car
          },
        },
        {
          name: "Main Body Panel",
          region: {
            x: x + width * 0.1,
            y: y, // No vertical adjustment (lowered for better centering)
            w: width * 0.8,
            h: height * 0.7, // Taller to capture more of the car
          },
        },
      ];

      let bestResult: any = null;
      let debugImages: string[] = [];

      for (const strategy of strategies) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        const { x: cropX, y: cropY, w: cropW, h: cropH } = strategy.region;

        canvas.width = cropW;
        canvas.height = cropH;

        try {
          ctx.drawImage(
            imageElement,
            cropX,
            cropY,
            cropW,
            cropH,
            0,
            0,
            cropW,
            cropH
          );

          const debugImageUrl = canvas.toDataURL("image/jpeg", 0.9);
          debugImages.push(debugImageUrl);

          // Analyze pixels from this region
          const imageData = ctx.getImageData(0, 0, cropW, cropH);
          const data = imageData.data;

          const colorCounts: { [key: string]: number } = {};
          let totalValidPixels = 0;

          // Sample every 2nd pixel for better coverage - focus on MAJORITY color
          for (let i = 0; i < data.length; i += 8) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            const brightness = (r + g + b) / 3;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;

            // Include almost all pixels to get majority color filter
            if (
              a > 50 && // low alpha threshold
              brightness > 2 && // low brightness threshold
              brightness < 255 // all brightness levels
            ) {
              const colorName = getAdvancedColorName(r, g, b);
              colorCounts[colorName] = (colorCounts[colorName] || 0) + 1;
              totalValidPixels++;
            }
          }

          console.log(`\n${strategy.name}:`);
          console.log(`  Valid pixels: ${totalValidPixels}`);
          console.log(`  Color distribution:`, colorCounts);

          // Find dominant color
          let dominantColor = "Unknown";
          let maxCount = 0;

          // Sort colors by count to get the most dominant
          const sortedColors = Object.entries(colorCounts).sort(
            (a, b) => b[1] - a[1]
          );

          if (sortedColors.length > 0) {
            // Skip black/dark colors if there are significant colored pixels
            const blackColors = ["Black", "Dark Gray", "Charcoal", "Mixed"];
            const coloredPixels = sortedColors.filter(
              ([color]) => !blackColors.includes(color)
            );
            const totalColoredPixels = coloredPixels.reduce(
              (sum, [, count]) => sum + count,
              0
            );

            // Prefer colored over black when more than 30% of total significant pixels
            if (
              totalColoredPixels > totalValidPixels * 0.3 &&
              coloredPixels.length > 0
            ) {
              dominantColor = coloredPixels[0][0];
              maxCount = coloredPixels[0][1];
              console.log(
                `  Prioritizing colored pixels: ${dominantColor} (${maxCount}) over black`
              );
            } else {
              // Fall back to most common color
              dominantColor = sortedColors[0][0];
              maxCount = sortedColors[0][1];
            }

            // If the top color is "Mixed", try the second most common color
            if (dominantColor === "Mixed" && sortedColors.length > 1) {
              dominantColor = sortedColors[1][0];
              maxCount = sortedColors[1][1];
            }
          }

          // Confidence calculation
          const confidence =
            totalValidPixels > 50
              ? Math.min(maxCount / totalValidPixels, 0.95)
              : 0.4;

          console.log(
            `  Result: ${dominantColor} (${(confidence * 100).toFixed(
              1
            )}% confidence)`
          );

          // Keep best result
          if (!bestResult || confidence > bestResult.confidence) {
            bestResult = {
              color: dominantColor,
              colorHex: getColorHex(dominantColor),
              confidence,
              method: "pixel-analysis" as const,
              debugImage: debugImageUrl,
              debugInfo: `Strategy: ${
                strategy.name
              }, Pixels: ${totalValidPixels}, Top colors: ${Object.entries(
                colorCounts
              )
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([c, n]) => `${c}(${n})`)
                .join(", ")}`,
            };
          }
        } catch (error) {
          console.error(`Error with ${strategy.name}:`, error);
        }
      }

      if (bestResult && bestResult.confidence > 0.2) {
        console.log(
          `\nFinal Result: ${bestResult.color} using ${bestResult.debugInfo}`
        );
        return bestResult;
      }

      // Sample center criteria
      console.log("\nTrying simple center sampling fallback...");
      try {
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const centerW = Math.max(20, Math.floor(width * 0.4));
        const centerH = Math.max(20, Math.floor(height * 0.3));
        const centerSampleX = centerX - centerW / 2;
        const centerSampleY = centerY - centerH / 2;

        const fallbackCanvas = document.createElement("canvas");
        const fallbackCtx = fallbackCanvas.getContext("2d");
        if (fallbackCtx) {
          fallbackCanvas.width = centerW;
          fallbackCanvas.height = centerH;

          fallbackCtx.drawImage(
            imageElement,
            centerSampleX,
            centerSampleY,
            centerW,
            centerH,
            0,
            0,
            centerW,
            centerH
          );

          const imageData = fallbackCtx.getImageData(0, 0, centerW, centerH);
          const data = imageData.data;

          const colorCounts: { [key: string]: number } = {};
          let totalPixels = 0;

          // Every 4th pixel sampling
          for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Include almost everything
            if (a > 30 && (r + g + b) / 3 > 1) {
              const colorName = getAdvancedColorName(r, g, b);
              colorCounts[colorName] = (colorCounts[colorName] || 0) + 1;
              totalPixels++;
            }
          }

          console.log(
            `Fallback sampling: ${totalPixels} pixels, colors:`,
            colorCounts
          );

          if (totalPixels > 5) {
            // Apply same priority to fallback
            const sortedColors = Object.entries(colorCounts).sort(
              (a, b) => b[1] - a[1]
            );
            const blackColors = ["Black", "Dark Gray", "Charcoal", "Mixed"];
            const coloredPixels = sortedColors.filter(
              ([color]) => !blackColors.includes(color)
            );
            const totalColoredPixels = coloredPixels.reduce(
              (sum, [, count]) => sum + count,
              0
            );

            let dominantColor = "Unknown";
            let maxCount = 0;

            // If significant colored pixels, prefer colored over black
            if (
              totalColoredPixels > totalPixels * 0.3 &&
              coloredPixels.length > 0
            ) {
              dominantColor = coloredPixels[0][0];
              maxCount = coloredPixels[0][1];
              console.log(
                `Fallback prioritizing colored pixels: ${dominantColor} (${maxCount}) over black`
              );
            } else {
              // Fall back to most common color
              dominantColor = sortedColors[0][0];
              maxCount = sortedColors[0][1];
            }

            if (dominantColor !== "Unknown") {
              console.log(`Fallback success: ${dominantColor}`);
              return {
                color: dominantColor,
                colorHex: getColorHex(dominantColor),
                confidence: 0.3,
                method: "pixel-analysis" as const,
                debugImage: fallbackCanvas.toDataURL("image/jpeg", 0.9),
                debugInfo: `Fallback center sampling: ${dominantColor}`,
              };
            }
          }
        }
      } catch (fallbackError) {
        console.error("Fallback sampling failed:", fallbackError);
      }

      // Final fallback
      console.log("\nUsing final fallback color");
      return {
        ...getFallbackColor(vehicleType),
        debugImage: debugImages[0],
        debugInfo: "All strategies failed, using fallback",
      };
    } catch (error) {
      console.error("Color extraction error:", error);
      return {
        ...getFallbackColor(vehicleType),
        debugInfo: `Error: ${error}`,
      };
    }
  };

  const getColorHex = (colorName: string): string => {
    const colorMap: { [key: string]: string } = {
      // Grayscale spectrum
      "Pearl White": "#F8F8FF",
      White: "#FFFFFF",
      Silver: "#C0C0C0",
      "Light Gray": "#D3D3D3",
      "Medium Gray": "#A9A9A9",
      Gray: "#808080",
      "Dark Gray": "#505050",
      Charcoal: "#36454F",
      Black: "#1C1C1C",

      // Brown/Tan spectrum
      Cream: "#FFFDD0",
      Beige: "#F5F5DC",
      Tan: "#D2B48C",
      "Light Brown": "#CD853F",
      Brown: "#8B4513",
      "Dark Brown": "#654321",
      Chocolate: "#7B3F00",

      // Red spectrum
      "Light Pink": "#FFB6C1",
      Rose: "#FF69B4",
      "Light Red": "#FF6B6B",
      Red: "#DC143C",
      Crimson: "#DC143C",
      "Dark Red": "#8B0000",
      Maroon: "#800000",

      // Pink/Magenta spectrum
      Pink: "#FFC0CB",
      "Hot Pink": "#FF1493",
      Fuchsia: "#FF00FF",
      Magenta: "#FF00FF",
      "Deep Pink": "#FF1493",

      // Orange spectrum
      Peach: "#FFCBA4",
      "Light Orange": "#FFA500",
      Orange: "#FF8C00",
      "Burnt Orange": "#CC5500",
      "Dark Orange": "#FF8C00",
      Rust: "#B7410E",

      // Yellow spectrum
      "Light Yellow": "#FFFFE0",
      Yellow: "#FFD700",
      Gold: "#FFD700",
      Mustard: "#FFDB58",
      Amber: "#FFBF00",

      // Green spectrum
      Lime: "#00FF00",
      "Mint Green": "#98FB98",
      "Light Green": "#90EE90",
      Green: "#228B22",
      "Forest Green": "#228B22",
      Emerald: "#50C878",
      Seafoam: "#9FE2BF",
      Teal: "#008080",
      "Dark Teal": "#003D3D",
      Turquoise: "#40E0D0",
      Cyan: "#00FFFF",
      "Dark Green": "#006400",

      // Blue spectrum
      "Sky Blue": "#87CEEB",
      "Light Blue": "#ADD8E6",
      Blue: "#4169E1",
      "Royal Blue": "#4169E1",
      Cobalt: "#0047AB",
      Navy: "#000080",
      "Dark Navy": "#000080",
      "Midnight Blue": "#191970",
      Periwinkle: "#CCCCFF",
      Indigo: "#4B0082",
      "Dark Blue": "#00008B",

      // Purple spectrum
      Lavender: "#E6E6FA",
      "Light Purple": "#DDA0DD",
      Purple: "#800080",
      Violet: "#8A2BE2",
      Plum: "#DDA0DD",
      "Dark Purple": "#4B0082",

      // Fallback
      Mixed: "#808080",
    };

    return colorMap[colorName] || "#808080";
  };

  /*
   Standardizes image size for consistent detection
   Resizes images to a standard resolution while maintaining aspect ratio
   */
  const standardizeImage = (
    imageElement: HTMLImageElement,
    targetWidth: number = 800,
    targetHeight: number = 600
  ): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    // Calculate new dimensions while maintaining aspect ratio
    const aspectRatio = imageElement.naturalWidth / imageElement.naturalHeight;
    let newWidth = targetWidth;
    let newHeight = targetHeight;

    if (aspectRatio > targetWidth / targetHeight) {
      // Image is wider than target aspect ratio
      newHeight = targetWidth / aspectRatio;
    } else {
      // Image is taller than target aspect ratio
      newWidth = targetHeight * aspectRatio;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;

    // Fill with white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, newWidth, newHeight);

    // Draw the resized image
    ctx.drawImage(imageElement, 0, 0, newWidth, newHeight);

    console.log(
      `Image standardized: ${imageElement.naturalWidth}x${imageElement.naturalHeight} → ${newWidth}x${newHeight}`
    );

    return canvas;
  };

  const performVehicleAnalysis = async (
    imageElement: HTMLImageElement | HTMLVideoElement,
    detection: cocoSsd.DetectedObject
  ): Promise<VehicleAnalysis> => {
    const vehicleType =
      detection.class.charAt(0).toUpperCase() + detection.class.slice(1);

    const colorData = await extractDominantColorWithDebug(
      imageElement,
      detection.bbox,
      detection.class
    );

    return {
      vehicleType,
      confidence: Math.round(detection.score * 100),
      color: colorData.color,
      colorHex: colorData.colorHex,
      colorConfidence: Math.round(colorData.confidence * 100),
      colorMethod: colorData.method,
      debugInfo: colorData.debugInfo,
    };
  };

  const detectVehiclesInImage = async () => {
    if (!model || !mediaRef.current) return;

    setAnalyzing(true);
    console.log("Starting vehicle detection...");

    const imageElement = mediaRef.current as HTMLImageElement;
    if (!imageElement.complete || imageElement.naturalWidth === 0) {
      await new Promise((resolve) => {
        imageElement.onload = resolve;
        imageElement.onerror = resolve;
      });
    }

    try {
      // Standardize image size for consistent detection
      let detectionTarget: HTMLImageElement | HTMLVideoElement = imageElement;
      let standardizedCanvas: HTMLCanvasElement | null = null;

      if (imageElement instanceof HTMLImageElement) {
        standardizedCanvas = standardizeImage(imageElement);
        console.log("Using standardized image for detection");
      }

      // Use canvas directly for detection if standardized, otherwise use original image
      const predictions = standardizedCanvas
        ? await model.detect(standardizedCanvas as any) // Type assertion for canvas
        : await model.detect(detectionTarget);
      console.log("Raw predictions:", predictions);

      const vehicleClasses = [
        "car",
        "truck",
        "bus",
        "motorcycle",
        "bicycle",
        "airplane",
        "boat",
        "train",
      ];

      const vehiclesPromises = predictions
        .filter((pred) => vehicleClasses.includes(pred.class))
        .map(async (detection, index) => {
          // Adjust bbox coordinates if we used standardized image
          let adjustedBbox = detection.bbox;
          let colorDetectionTarget = imageElement;

          if (standardizedCanvas && imageElement instanceof HTMLImageElement) {
            // Calculate scale factors
            const scaleX = imageElement.naturalWidth / standardizedCanvas.width;
            const scaleY =
              imageElement.naturalHeight / standardizedCanvas.height;

            // Adjust bbox coordinates back to original image size
            adjustedBbox = [
              detection.bbox[0] * scaleX,
              detection.bbox[1] * scaleY,
              detection.bbox[2] * scaleX,
              detection.bbox[3] * scaleY,
            ] as [number, number, number, number];

            console.log(`Adjusted bbox: ${detection.bbox} → ${adjustedBbox}`);
          }

          const colorData = await extractDominantColorWithDebug(
            colorDetectionTarget,
            adjustedBbox,
            detection.class
          );

          const analysis = await performVehicleAnalysis(colorDetectionTarget, {
            ...detection,
            bbox: adjustedBbox,
          });

          return {
            id: index,
            class: detection.class,
            score: detection.score,
            bbox: adjustedBbox,
            color: analysis.colorHex,
            analysis,
            debugImage: colorData.debugImage,
          };
        });

      const vehicles = await Promise.all(vehiclesPromises);

      if (vehicles.length === 0) {
        setAlertMessage("No vehicles detected in this image.");
        setShowAlert(true);
      }

      setDetectedVehicles(vehicles);
      drawBoundingBoxes(vehicles);
    } catch (error) {
      console.error("Error during detection:", error);
      setAlertMessage(
        "An error occurred during detection. Please try another image."
      );
      setShowAlert(true);
    }

    setAnalyzing(false);
    setHasAttemptedDetection(true);
  };

  // Detect vehicles in current video frame (works for both paused and playing)
  const detectCurrentVideoFrame = async () => {
    if (!model || !mediaRef.current || !isVideo) return;

    const videoElement = mediaRef.current as HTMLVideoElement;

    // Capture the current video timestamp
    const currentTime = videoElement.currentTime;
    const formattedTime = formatVideoTime(currentTime);
    setLastDetectionTimestamp(formattedTime);

    try {
      const predictions = await model.detect(videoElement);
      const vehicleClasses = [
        "car",
        "truck",
        "bus",
        "motorcycle",
        "bicycle",
        "airplane",
        "boat",
        "train",
      ];

      const vehiclesPromises = predictions
        .filter((pred) => vehicleClasses.includes(pred.class))
        .map(async (detection, index) => {
          const analysis = await performVehicleAnalysis(
            videoElement,
            detection
          );
          return {
            id: index,
            class: detection.class,
            score: detection.score,
            bbox: detection.bbox,
            color: analysis.colorHex,
            analysis,
          };
        });

      const vehicles = await Promise.all(vehiclesPromises);

      if (vehicles.length === 0) {
        setAlertMessage("No vehicles detected in this frame.");
        setShowAlert(true);
      }

      setDetectedVehicles(vehicles);
      drawBoundingBoxes(vehicles);
      setHasAttemptedDetection(true);
    } catch (error) {
      console.error("Error during video detection:", error);
      setAlertMessage("An error occurred during detection.");
      setShowAlert(true);
    }
  };

  // Continuous detection loop for real-time video analysis
  const detectVehiclesInVideo = async () => {
    if (!model || !mediaRef.current || !isVideo) return;

    const videoElement = mediaRef.current as HTMLVideoElement;

    // Stop if video ended
    if (videoElement.ended) {
      setAnalyzing(false);
      setContinuousDetection(false);
      continuousDetectionRef.current = false;
      return;
    }

    // Stop if continuous mode was turned off (use ref to avoid closure issue)
    if (!continuousDetectionRef.current) {
      setAnalyzing(false);
      return;
    }

    // Stop if video is paused
    if (videoElement.paused) {
      setAnalyzing(false);
      return;
    }

    setCurrentFrame((prev) => prev + 1);

    try {
      await detectCurrentVideoFrame();
    } catch (error) {
      console.error("Error during continuous video detection:", error);
      // Don't stop the loop on error, just continue
    }

    // Continue the loop - use ref to check current state
    if (
      continuousDetectionRef.current &&
      !videoElement.paused &&
      !videoElement.ended &&
      model &&
      mediaRef.current
    ) {
      animationFrameRef.current = requestAnimationFrame(detectVehiclesInVideo);
    }
  };

  const drawBoundingBoxes = (vehicles: DetectedVehicle[]) => {
    const canvas = canvasRef.current;
    const media = mediaRef.current;

    if (!canvas || !media) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width =
      media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
    canvas.height =
      media instanceof HTMLVideoElement
        ? media.videoHeight
        : media.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    vehicles.forEach((vehicle, index) => {
      const [x, y, width, height] = vehicle.bbox;

      const boxColor = `hsl(${index * 137.5}, 70%, 50%)`;

      // Draw main bounding box
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      const label = `${vehicle.class} ${Math.round(vehicle.score * 100)}%`;
      ctx.font = "16px Arial";
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = boxColor;
      ctx.fillRect(x, y - 25, textWidth + 10, 25);

      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, x + 5, y - 7);
    });
  };

  const handleMediaLoad = () => {
    // Images auto-detect on load, videos require manual detection
    if (!isVideo) {
      detectVehiclesInImage();
    }
  };

  // Detect current frame manually
  const handleDetectCurrentFrame = async () => {
    if (!isVideo || !mediaRef.current) return;
    setAnalyzing(true);
    await detectCurrentVideoFrame();
    setAnalyzing(false);
  };

  // Toggle continuous real-time detection
  const toggleContinuousDetection = () => {
    if (!isVideo || !mediaRef.current) return;
    const videoElement = mediaRef.current as HTMLVideoElement;

    if (continuousDetection) {
      // Stop continuous detection
      setContinuousDetection(false);
      continuousDetectionRef.current = false;
      setAnalyzing(false);

      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    } else {
      // Start continuous detection
      // Ensure any previous animation frame is cancelled
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }

      setContinuousDetection(true);
      continuousDetectionRef.current = true;
      setAnalyzing(true);
      setHasAttemptedDetection(true);

      // Ensure video is playing
      if (videoElement.paused) {
        videoElement
          .play()
          .then(() => {
            detectVehiclesInVideo();
          })
          .catch((error) => {
            console.error("Error playing video:", error);
            setContinuousDetection(false);
            continuousDetectionRef.current = false;
            setAnalyzing(false);
            setShowAlert(true);
            setAlertMessage(
              "Could not start video playback for auto-detection. Try playing the video manually first."
            );
          });
      } else {
        // Video is already playing, start detection
        detectVehiclesInVideo();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Clear canvas when fileUrl changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [fileUrl]);

  // Listen for video pause/play events to manage continuous detection
  useEffect(() => {
    if (!isVideo || !mediaRef.current) return;

    const videoElement = mediaRef.current as HTMLVideoElement;

    const handlePause = () => {
      if (continuousDetection) {
        // Don't turn off continuous mode, just pause detection
        // User can resume by playing again
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setAnalyzing(false);
      }
    };

    const handlePlay = () => {
      if (continuousDetection) {
        // Resume detection when video plays
        setAnalyzing(true);
        detectVehiclesInVideo();
      }
    };

    videoElement.addEventListener("pause", handlePause);
    videoElement.addEventListener("play", handlePlay);

    return () => {
      videoElement.removeEventListener("pause", handlePause);
      videoElement.removeEventListener("play", handlePlay);
    };
    
  }, [isVideo, continuousDetection]);

  return (
    <div className="max-w-7xl mx-auto">
      {showAlert && (
        <Alert
          message={alertMessage}
          type="warning"
          onClose={() => setShowAlert(false)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onReset}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span>Back</span>
        </button>

        {loading && (
          <div className="flex items-center space-x-2 text-blue-400">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading AI Model...</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-600">
            <h2 className="text-2xl font-bold text-white mb-4">
              {isVideo ? "Video Analysis" : "Image Analysis"}
            </h2>

            <div className="relative bg-black rounded-lg overflow-hidden">
              {isVideo ? (
                <video
                  ref={mediaRef as React.RefObject<HTMLVideoElement>}
                  src={fileUrl}
                  controls
                  className="w-full h-auto"
                  onLoadedData={handleMediaLoad}
                  crossOrigin="anonymous"
                />
              ) : (
                <img
                  ref={mediaRef as React.RefObject<HTMLImageElement>}
                  src={fileUrl}
                  alt="Uploaded content"
                  className="w-full h-auto"
                  onLoad={handleMediaLoad}
                  crossOrigin="anonymous"
                />
              )}

              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />

              {(loading || analyzing) && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white font-semibold">
                      {loading ? "Loading Model..." : "Analyzing Vehicles..."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {!showUploader && !loading && (
              <>
                {/* Image Detection Controls */}
                {!isVideo && !hasAttemptedDetection && (
                  <button
                    onClick={detectVehiclesInImage}
                    disabled={analyzing}
                    className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Detect Vehicles
                  </button>
                )}

                {/* Video Detection Controls */}
                {isVideo && (
                  <div className="mt-4 space-y-3">
                    {/* Status Badge - Always visible when continuous detection is active */}
                    {continuousDetection && (
                      <div className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-900/30 border border-red-500/50 rounded-lg animate-pulse">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-red-300 text-sm font-semibold">
                          AUTO-DETECTION RUNNING
                        </span>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleDetectCurrentFrame}
                        disabled={analyzing && !continuousDetection}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Detect Current Frame
                      </button>
                      <button
                        onClick={toggleContinuousDetection}
                        disabled={false}
                        className={`flex-1 px-6 py-3 text-white font-semibold rounded-lg transition-all shadow-lg relative ${
                          continuousDetection
                            ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                            : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        }`}
                      >
                        {continuousDetection
                          ? "⏹ Stop Auto-Detect"
                          : "▶ Auto-Detect While Playing"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                      {continuousDetection
                        ? "🔴 Auto-detection active - click Stop to pause detection"
                        : "Pause video at any frame and click 'Detect Current Frame' or enable auto-detection"}
                    </p>
                  </div>
                )}

                {/* Try Another Analysis Button */}
                {hasAttemptedDetection && !analyzing && (
                  <button
                    onClick={handleTryAnother}
                    className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-lg"
                  >
                    Try Another Analysis
                  </button>
                )}
              </>
            )}

            {showUploader && (
              <div className="mt-6">
                <FileUploader
                  onFileUpload={handleFileUpload}
                  onUrlInput={handleUrlInput}
                />
                <button
                  onClick={() => setShowUploader(false)}
                  className="w-full mt-4 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-600 sticky top-4">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <svg
                className="w-6 h-6 mr-2 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Detection Results
            </h3>

            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-lg p-4 border border-blue-700/30">
                <div className="text-3xl font-bold text-white mb-1">
                  {detectedVehicles.length}
                </div>
                <div className="text-sm text-gray-300">
                  Vehicle{detectedVehicles.length !== 1 ? "s" : ""} Detected
                </div>
                {isVideo && lastDetectionTimestamp && (
                  <div className="mt-3 pt-3 border-t border-blue-700/30">
                    <div className="flex items-center justify-center space-x-2 text-xs text-blue-300">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-semibold">Timestamp:</span>
                      <span className="font-mono bg-blue-900/40 px-2 py-1 rounded">
                        {lastDetectionTimestamp}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {detectedVehicles.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No vehicles detected yet</p>
                  <p className="text-sm mt-1">
                    {isVideo
                      ? "Play the video to start detection"
                      : "Click 'Detect Vehicles' to analyze"}
                  </p>
                </div>
              ) : (
                detectedVehicles.map((vehicle, index) => (
                  <div
                    key={vehicle.id}
                    className="bg-gray-900/60 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                          style={{
                            backgroundColor: vehicle.color || "#808080",
                          }}
                        ></div>
                        <span className="font-semibold text-white capitalize">
                          {vehicle.analysis?.vehicleType || vehicle.class} #
                          {index + 1}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-1 bg-green-900/40 text-green-300 rounded-full">
                        {Math.round(vehicle.score * 100)}%
                      </span>
                    </div>

                    {vehicle.analysis && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Type:</span>
                          <span className="text-white font-medium capitalize">
                            {vehicle.class}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Color:</span>
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-4 h-4 rounded border border-gray-500"
                              style={{
                                backgroundColor: vehicle.analysis.colorHex,
                              }}
                            ></div>
                            <span className="text-white font-medium">
                              {vehicle.analysis.color}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Color Accuracy:</span>
                          <span
                            className={`text-xs font-medium ${
                              vehicle.analysis.colorConfidence > 70
                                ? "text-green-400"
                                : vehicle.analysis.colorConfidence > 40
                                ? "text-yellow-400"
                                : "text-orange-400"
                            }`}
                          >
                            {vehicle.analysis.colorConfidence}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
