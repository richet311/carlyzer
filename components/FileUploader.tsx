"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Alert from "./Alert";

/*
 Props interface for FileUploader component
 */
interface FileUploaderProps {
  onFileUpload: (file: File) => void;
  onUrlInput: (url: string) => void;
}

/*
 FileUploader Component
 Provides drag-and-drop file upload and URL input functionality
 Supports images (jpg, png, gif) and videos (mp4, webm, mov)
 */
export default function FileUploader({
  onFileUpload,
  onUrlInput,
}: FileUploaderProps) {
  const [urlInput, setUrlInput] = useState("");
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  /*
   Callback handler for dropped files
   Validates file type and passes to parent component
   */
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        onFileUpload(file);
      }
    },
    [onFileUpload]
  );

  /*
   Configure react-dropzone for file upload
   Accept images and videos only
   maxFiles: 1 file at a time
   */
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "video/*": [".mp4", ".webm", ".mov"],
    },
    maxFiles: 1,
    multiple: false,
  });

  /*
   Handler for URL submission
   Validates URL format and checks if it's an accessible image/video
   */
  const handleUrlSubmit = async () => {
    const url = urlInput.trim();

    if (!url) {
      setAlertMessage("Please enter a URL");
      setShowAlert(true);
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch (e) {
      setAlertMessage(
        "Invalid URL format. Please enter a valid URL (e.g., https://example.com/image.jpg)"
      );
      setShowAlert(true);
      return;
    }

    setIsLoadingUrl(true);

    // Check if the URL points to an image or video
    try {
      // Try to load as image first
      const isImage = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;

        // Timeout after 10 seconds
        setTimeout(() => resolve(false), 10000);
      });

      if (isImage) {
        onUrlInput(url);
        setIsLoadingUrl(false);
        return;
      }

      // Try to check if it's a video by extension or content type
      const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv"];
      const hasVideoExtension = videoExtensions.some((ext) =>
        url.toLowerCase().includes(ext)
      );

      if (hasVideoExtension) {
        // Assume it's a video and let the analyzer handle it
        onUrlInput(url);
        setIsLoadingUrl(false);
        return;
      }

      // If neither image nor video extension detected
      setAlertMessage(
        "Unable to load the URL. Please ensure:\n• The URL is a direct link to an image or video file\n• The file is publicly accessible\n• CORS is enabled on the server"
      );
      setShowAlert(true);
      setIsLoadingUrl(false);
    } catch (error) {
      setAlertMessage(
        "Failed to load the URL. The resource might be unavailable or blocked by CORS policy."
      );
      setShowAlert(true);
      setIsLoadingUrl(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Alert for URL errors */}
      {showAlert && (
        <Alert
          message={alertMessage}
          type="error"
          onClose={() => setShowAlert(false)}
        />
      )}
      {/* Mode Toggle Buttons */}
      <div className="flex justify-center space-x-4 mb-6">
        <button
          onClick={() => setUploadMode("file")}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            uploadMode === "file"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Upload File
        </button>
        <button
          onClick={() => setUploadMode("url")}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            uploadMode === "url"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Use URL
        </button>
      </div>

      {uploadMode === "file" ? (
        /* File Upload Dropzone */
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
            transition-all duration-300 ease-in-out
            ${
              isDragActive
                ? "border-blue-500 bg-blue-500/10 scale-105"
                : "border-gray-600 bg-gray-800/40 hover:border-blue-400 hover:bg-gray-800/60"
            }
          `}
        >
          <input {...getInputProps()} />

          {/* Upload Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
          </div>

          {isDragActive ? (
            <p className="text-xl text-blue-400 font-semibold">
              Drop your file here...
            </p>
          ) : (
            <>
              <p className="text-xl text-gray-200 font-semibold mb-2">
                Drag & drop your file here
              </p>
              <p className="text-gray-400 mb-4">or click to browse</p>
              <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500">
                <span className="px-3 py-1 bg-gray-700/50 rounded-full">
                  Images: JPG, PNG, GIF, WebP
                </span>
                <span className="px-3 py-1 bg-gray-700/50 rounded-full">
                  Videos: MP4, WebM, MOV
                </span>
              </div>
            </>
          )}
        </div>
      ) : (
        /* URL Input Section */
        <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl p-8 border border-gray-600">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
          </div>

          <h3 className="text-xl text-gray-200 font-semibold mb-4 text-center">
            Enter Image or Video URL
          </h3>

          <div className="flex gap-3">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
              placeholder="https://example.com/image.jpg"
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleUrlSubmit}
              disabled={isLoadingUrl}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
            >
              {isLoadingUrl ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Loading...
                </>
              ) : (
                "Analyze"
              )}
            </button>
          </div>

          <p className="text-gray-400 text-sm mt-4 text-center">
            Paste a direct link to an image or video file
          </p>
        </div>
      )}

      {/* Information Box */}
      <div className="mt-8 bg-blue-900/20 border border-blue-700/30 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <svg
            className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-gray-300">
            <p className="font-semibold text-white mb-1">How it works:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Upload an image or video containing vehicles</li>
              <li>
                Our AI model will detect vehicles and analyze their properties
              </li>
              <li>Get information about color, type, and visible features</li>
              <li>
                All processing happens locally in your browser - no data leaves
                your device
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
