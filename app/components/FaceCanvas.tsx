"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Application, Assets, Container, Graphics, Point, Sprite, Text, Texture } from "pixi.js";
import { HAT_LEFT_POINT, HAT_RIGHT_POINT } from "../constants";

export type FaceDetectionResult = faceapi.WithFaceLandmarks<
  { detection: faceapi.FaceDetection },
  faceapi.FaceLandmarks68
>;

interface FaceCanvasProps {
  image: HTMLImageElement;
  filename: string;
  onError?: (error: string) => void;
  onFacesDetected?: (results: FaceDetectionResult[]) => void;
  onReset: () => void;
}

async function detectFaces(
  image: HTMLImageElement
): Promise<FaceDetectionResult[]> {
  // Try to detect all faces first
  const faces = await faceapi
    .detectAllFaces(
      image,
      new faceapi.SsdMobilenetv1Options({
        minConfidence: 0.5,
      })
    )
    .withFaceLandmarks();

  if (faces && faces.length > 0) {
    return faces;
  }

  // Fallback to single face detection with lower confidence threshold
  const singleFace = await faceapi
    .detectSingleFace(
      image,
      new faceapi.SsdMobilenetv1Options({
        minConfidence: Number.MIN_VALUE,
        maxResults: 1,
      })
    )
    .withFaceLandmarks();

  if (!singleFace) {
    throw new Error("No faces detected");
  }

  return [singleFace];
}

function createHatPoints(face: FaceDetectionResult): { left: Point; right: Point } {
  const landmarks = face.landmarks.positions;

  // Get cheek points for extrapolation
  // Left cheek: points 0 and 1 (point 0 is outer, point 1 is inner)
  // Right cheek: points 15 and 16 (point 15 is inner, point 16 is outer)
  const leftCheek0 = landmarks[0];
  const leftCheek1 = landmarks[1];
  const rightCheek15 = landmarks[15];
  const rightCheek16 = landmarks[16];

  // Extrapolate point "-1" from left cheek (0 and 1)
  // Direction: from point 1 to point 0, continue 1.5x the distance
  const leftDx = leftCheek0.x - leftCheek1.x;
  const leftDy = leftCheek0.y - leftCheek1.y;
  const leftDist = Math.sqrt(leftDx * leftDx + leftDy * leftDy);
  const leftPoint = new Point(
    leftCheek0.x + (leftDx / leftDist) * leftDist * 1.5,
    leftCheek0.y + (leftDy / leftDist) * leftDist * 1.5
  );

  // Extrapolate point "17" from right cheek (15 and 16)
  // Direction: from point 15 to point 16, continue 1.5x the distance
  const rightDx = rightCheek16.x - rightCheek15.x;
  const rightDy = rightCheek16.y - rightCheek15.y;
  const rightDist = Math.sqrt(rightDx * rightDx + rightDy * rightDy);
  const rightPoint = new Point(
    rightCheek16.x + (rightDx / rightDist) * rightDist * 1.5,
    rightCheek16.y + (rightDy / rightDist) * rightDist * 1.5
  );

  return { left: leftPoint, right: rightPoint };
}

export default function FaceCanvas({ image, filename, onError, onFacesDetected, onReset }: FaceCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixiAppRef = useRef<Application | null>(null);
  const debugContainerRef = useRef<Container | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleDownload = useCallback(async () => {
    const canvas = canvasRef.current;
    const pixiApp = pixiAppRef.current;
    const debugContainer = debugContainerRef.current;
    if (!canvas || !pixiApp) return;

    // Hide debug graphics for the download
    const debugWasVisible = debugContainer?.visible ?? false;
    if (debugContainer) {
      debugContainer.visible = false;
    }

    // Force PIXI to render before capturing
    pixiApp.render();

    // Create a temporary canvas to composite both canvases
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    // Draw the base image canvas
    ctx.drawImage(canvas, 0, 0);

    // Draw the PIXI canvas on top
    const pixiCanvas = pixiApp.canvas as HTMLCanvasElement;
    ctx.drawImage(pixiCanvas, 0, 0);

    // Restore debug visibility
    if (debugContainer) {
      debugContainer.visible = debugWasVisible;
      pixiApp.render();
    }

    if (navigator.share && navigator.canShare) {
      // On iOS, use the Web Share API to trigger the native share sheet
      // which allows saving to Photos
      try {
        const blob = await new Promise<Blob>((resolve, reject) => {
          tempCanvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error("Failed to create blob"));
          }, "image/png");
        });

        const file = new File([blob], `${filename}-hatted.png`, { type: "image/png" });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
          });
          return;
        }
      } catch (err) {
        // If share was cancelled or failed, fall through to open in new tab
        if (err instanceof Error && err.name === "AbortError") {
          return; // User cancelled, do nothing
        }
      }

      // Fallback for iOS: open image in new tab so user can long-press to save
      const dataUrl = tempCanvas.toDataURL("image/png");
      window.open(dataUrl, "_blank");
    } else {
      // Desktop: use traditional download
      const link = document.createElement("a");
      link.download = `${filename}-hatted.png`;
      link.href = tempCanvas.toDataURL("image/png");
      link.click();
    }
  }, [filename]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    let pixiApp: Application | null = null;

    const processImage = async () => {
      try {
        setIsLoading(true);
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get canvas context");

        // Set canvas size and draw image
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);

        // Detect all faces
        const faces = await detectFaces(image);
        onFacesDetected?.(faces);
        setIsLoading(false);

        // Initialize PIXI app
        pixiApp = new Application();
        await pixiApp.init({
          width: image.width,
          height: image.height,
          backgroundAlpha: 0,
        });

        pixiAppRef.current = pixiApp;

        // Style and position the PIXI canvas to overlay
        // Both canvases need identical sizing so they scale together
        const pixiCanvas = pixiApp.canvas as HTMLCanvasElement;
        pixiCanvas.style.position = "absolute";
        pixiCanvas.style.top = "0";
        pixiCanvas.style.left = "0";
        pixiCanvas.style.width = "100%";
        pixiCanvas.style.height = "100%";
        pixiCanvas.style.pointerEvents = "none";
        containerRef.current!.appendChild(pixiCanvas);

        // Debug container to hold all debug graphics
        const debugContainer = new Container();
        debugContainer.visible = false;
        debugContainerRef.current = debugContainer;
        pixiApp.stage.addChild(debugContainer);

        const debugGraphics = new Graphics();
        debugContainer.addChild(debugGraphics);

        // Load the santa hat texture
        const hatTexture = await Assets.load<Texture>(`santa_hat.webp`);

        // Process each detected face
        for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
          const face = faces[faceIndex];

          // Debug: Draw face bounding box
          const { x, y, width, height } = face.detection.box;
          debugGraphics.rect(x, y, width, height);
          debugGraphics.stroke({ color: 0xff0000, width: 3 });

          // Debug: Draw all 68 face landmarks
          const landmarks = face.landmarks.positions;
          for (let i = 0; i < landmarks.length; i++) {
            const point = landmarks[i];
            debugGraphics.circle(point.x, point.y, 3);
            debugGraphics.fill({ color: 0x00ff00 });

            // Draw landmark index
            const label = new Text({
              text: String(i),
              style: { fontSize: 10, fill: 0xffff00 },
            });
            label.x = point.x + 4;
            label.y = point.y - 10;
            debugContainer.addChild(label);
          }

          // Get the left and right hat points on the face
          const hatPoints = createHatPoints(face);

          // Debug: Draw hat points
          debugGraphics.circle(hatPoints.left.x, hatPoints.left.y, 5);
          debugGraphics.fill({ color: 0x00ffff });
          debugGraphics.stroke({ color: 0x0000ff, width: 2 });
          const leftLabel = new Text({
            text: `L${faceIndex}`,
            style: { fontSize: 12, fill: 0xffffff },
          });
          leftLabel.x = hatPoints.left.x + 8;
          leftLabel.y = hatPoints.left.y - 6;
          debugContainer.addChild(leftLabel);

          debugGraphics.circle(hatPoints.right.x, hatPoints.right.y, 5);
          debugGraphics.fill({ color: 0x00ffff });
          debugGraphics.stroke({ color: 0x0000ff, width: 2 });
          const rightLabel = new Text({
            text: `R${faceIndex}`,
            style: { fontSize: 12, fill: 0xffffff },
          });
          rightLabel.x = hatPoints.right.x + 8;
          rightLabel.y = hatPoints.right.y - 6;
          debugContainer.addChild(rightLabel);

          // Calculate the distance and angle between face hat points
          const faceDx = hatPoints.right.x - hatPoints.left.x;
          const faceDy = hatPoints.right.y - hatPoints.left.y;
          const faceDistance = Math.sqrt(faceDx * faceDx + faceDy * faceDy);
          const faceAngle = Math.atan2(faceDy, faceDx);

          // Calculate the distance and angle between hat brim points in the image
          const brimDx = HAT_RIGHT_POINT[0] - HAT_LEFT_POINT[0];
          const brimDy = HAT_RIGHT_POINT[1] - HAT_LEFT_POINT[1];
          const brimDistance = Math.sqrt(brimDx * brimDx + brimDy * brimDy);
          const brimAngle = Math.atan2(brimDy, brimDx);

          // Calculate scale and rotation
          const scale = faceDistance / brimDistance;
          const rotation = faceAngle - brimAngle;

          // Create the hat sprite
          const hatSprite = new Sprite(hatTexture);

          // Set the pivot to the left brim point so it rotates/scales around that point
          hatSprite.pivot.set(HAT_LEFT_POINT[0], HAT_LEFT_POINT[1]);

          // Position the sprite so the left brim aligns with the left face point
          hatSprite.position.set(hatPoints.left.x, hatPoints.left.y);

          // Apply scale and rotation
          hatSprite.scale.set(scale);
          hatSprite.rotation = rotation;

          pixiApp.stage.addChild(hatSprite);
        }
      } catch (err) {
        setIsLoading(false);
        onError?.(err instanceof Error ? err.message : String(err));
      }
    };

    processImage();

    return () => {
      if (pixiApp) {
        pixiApp.destroy(true);
        pixiAppRef.current = null;
      }
    };
  }, [image, onError, onFacesDetected]);

  // Toggle debug visibility
  useEffect(() => {
    if (debugContainerRef.current) {
      debugContainerRef.current.visible = showDebug;
    }
  }, [showDebug]);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
      >
        <canvas
          ref={canvasRef}
          className="block max-h-[500px] max-w-full"
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
              <span className="text-sm font-medium text-white">Detecting faces...</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="rounded-full border border-zinc-300 px-6 py-2.5 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Upload New Image
        </button>
        <button
          onClick={handleDownload}
          className="rounded-full bg-red-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-red-700"
        >
          Download Image
        </button>
        <label className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 dark:border-zinc-700">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Debug</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={showDebug}
              onChange={(e) => setShowDebug(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-5 w-9 rounded-full bg-zinc-300 transition-colors peer-checked:bg-yellow-500 dark:bg-zinc-600" />
            <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
          </div>
        </label>
      </div>
    </div>
  );
}

