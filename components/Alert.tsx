"use client";

import { useEffect } from "react";

/*
 Props interface for Alert component
 */
interface AlertProps {
  message: string;
  type?: "warning" | "error" | "info" | "success";
  onClose: () => void;
}

/*
 Alert Component
 */
export default function Alert({
  message,
  type = "warning",
  onClose,
}: AlertProps) {
  // Auto-close after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    warning: {
      bg: "bg-yellow-900/90",
      border: "border-yellow-500",
      icon: "text-yellow-400",
      text: "text-yellow-100",
    },
    error: {
      bg: "bg-red-900/90",
      border: "border-red-500",
      icon: "text-red-400",
      text: "text-red-100",
    },
    info: {
      bg: "bg-blue-900/90",
      border: "border-blue-500",
      icon: "text-blue-400",
      text: "text-blue-100",
    },
    success: {
      bg: "bg-green-900/90",
      border: "border-green-500",
      icon: "text-green-400",
      text: "text-green-100",
    },
  };

  const style = colors[type];

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div
        className={`${style.bg} ${style.border} backdrop-blur-sm border-l-4 rounded-lg p-4 shadow-2xl max-w-md`}
      >
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${style.icon}`}>
            {type === "warning" && (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
            {type === "error" && (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            {type === "info" && (
              <svg
                className="w-6 h-6"
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
            )}
            {type === "success" && (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>
          <div className={`ml-3 flex-1 ${style.text}`}>
            <p className="text-sm font-medium whitespace-pre-line">{message}</p>
          </div>
          <button
            onClick={onClose}
            className={`ml-3 flex-shrink-0 ${style.icon} hover:opacity-75 transition-opacity`}
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
