"use client";

import { useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import { MODEL_PATH } from "../constants";
import Dropzone from "./Dropzone";
import FaceCanvas from "./FaceCanvas";

export default function Hatter() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [filename, setFilename] = useState<string>("");

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_PATH),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
        ]);
        setModelsLoaded(true);
      } catch (error) {
        setError(`Failed to load models: ${error}`);
      }
    };
    loadModels();
  }, []);

  const handleImageLoad = (img: HTMLImageElement, name: string) => {
    setImage(img);
    setFilename(name);
  };

  if (!image) {
    return <Dropzone onImageLoad={handleImageLoad} />;
  }

  if (!modelsLoaded) {
    return (
      <div className="flex h-80 w-full flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <svg
          className="h-8 w-8 animate-spin text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Loading face detection models...
        </p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}
      <FaceCanvas
        image={image}
        filename={filename}
        onError={setError}
        onReset={() => setImage(null)}
      />
    </>
  );
}

