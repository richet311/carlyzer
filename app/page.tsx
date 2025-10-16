"use client";

import { useState } from "react";
import FileUploader from "@/components/FileUploader";
import VehicleAnalyzer from "@/components/VehicleAnalyzer";

/*
 Main page component for Carlyzer application
 Handles the core user flow: file upload -> vehicle detection -> results display
*/
export default function Home() {
  // State management for uploaded file (image or video)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");

  /*
   Handler for file uploads from FileUploader component
   Creates object URL for rendering and passes file to analyzer
   */
  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    // Create a local URL for the uploaded file to display in browser
    const url = URL.createObjectURL(file);
    setFileUrl(url);
  };

  /*
   Handler for URL-based file input
   Allows users to analyze media from external sources
   */
  const handleUrlInput = (url: string) => {
    setFileUrl(url);
    setUploadedFile(null);
  };

  /*
   Reset handler to clear current analysis and return to upload screen
  */
  const handleReset = () => {
    if (fileUrl && uploadedFile) {
      URL.revokeObjectURL(fileUrl); // Clean up memory
    }
    setUploadedFile(null);
    setFileUrl("");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header Section */}
      <header className="border-b border-blue-800/30 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:drop-shadow-[0_0_40px_rgba(168,85,247,0.6)] transition-all duration-300">
                  Carlyzer
                </span>
              </h1>
            </div>
            <div className="hidden md:flex items-center space-x-2 text-sm text-blue-300">
              <span className="px-3 py-1 bg-blue-900/30 rounded-full">
                AI-Powered
              </span>
              <span className="px-3 py-1 bg-purple-900/30 rounded-full">
                Free to Use
              </span>
            </div>
          </div>
          <p className="text-gray-300 mt-2 text-sm md:text-base">
            Advanced vehicle detection and analysis using TensorFlow.js
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-8">
        {!fileUrl ? (
          /* Upload Interface - Shown when no file is selected */
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                Detect & Analyze Vehicles
              </h2>
              <p className="text-gray-300 text-lg">
                Upload an image or video, or provide a URL to start analyzing
                vehicles
              </p>
            </div>

            <FileUploader
              onFileUpload={handleFileUpload}
              onUrlInput={handleUrlInput}
            />

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 backdrop-blur-sm rounded-xl p-6 border border-blue-700/30">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Object Detection
                </h3>
                <p className="text-gray-300">
                  Powered by COCO-SSD model for accurate vehicle detection in
                  images and video frames
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-sm rounded-xl p-6 border border-purple-700/30">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-7 h-7 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    {/* Car body */}
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l1.5-4.5C7 7 8.5 6 10 6h4c1.5 0 3 1 3.5 2.5L19 13M5 13v4a1 1 0 001 1h1m12-5v4a1 1 0 01-1 1h-1M5 13h14"
                    />
                    {/* Wheels */}
                    <circle cx="8" cy="18" r="2" strokeWidth={1.5} />
                    <circle cx="16" cy="18" r="2" strokeWidth={1.5} />
                    {/* Windows */}
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 13V9.5c0-.5.5-1 1-1h4c.5 0 1 .5 1 1V13"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Vehicle Analysis
                </h3>
                <p className="text-gray-300">
                  Extracts color and identifies detected vehicles
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 backdrop-blur-sm rounded-xl p-6 border border-green-700/30">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Privacy First
                </h3>
                <p className="text-gray-300">
                  All processing happens in your browser. No data is sent to
                  external servers
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Analysis Interface - Shown when file is uploaded */
          <VehicleAnalyzer
            fileUrl={fileUrl}
            file={uploadedFile}
            onReset={handleReset}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-blue-800/30 bg-black/20 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-gray-400 text-sm">
            <p>
              Built with Next.js, React, TypeScript, TensorFlow.js & Tailwind
              CSS
            </p>
            <p className="mt-2">
              100% Free • Client-Side Processing • Open Source
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
