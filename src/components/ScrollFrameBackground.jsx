import React, { useEffect, useRef, useCallback } from 'react';
import './ScrollFrameBackground.css';

const TOTAL_FRAMES = 238;
const FRAME_BASE_PATH = '/images/frames_bg01/frame_';
const FRAME_EXT = '.jpg';

function getFramePath(index) {
  const paddedIndex = String(index).padStart(3, '0');
  return `${FRAME_BASE_PATH}${paddedIndex}${FRAME_EXT}`;
}

export default function ScrollFrameBackground() {
  const canvasRef = useRef(null);
  const imagesRef = useRef([]);
  const loadedMapRef = useRef(new Uint8Array(TOTAL_FRAMES + 1));
  const currentFrameRef = useRef(1);
  const targetFrameRef = useRef(1);
  const rafIdRef = useRef(null);
  const lastDrawnFrameRef = useRef(-1);

  // Draw image on canvas using object-fit: cover math
  const renderFrame = useCallback((frameIndex) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Find the requested frame or closest loaded fallback
    let imgToDraw = null;
    let actualFrame = frameIndex;

    if (loadedMapRef.current[frameIndex] && imagesRef.current[frameIndex]) {
      imgToDraw = imagesRef.current[frameIndex];
    } else {
      // Search for nearest loaded frame
      let minDiff = Infinity;
      for (let i = 1; i <= TOTAL_FRAMES; i++) {
        if (loadedMapRef.current[i] && imagesRef.current[i]) {
          const diff = Math.abs(i - frameIndex);
          if (diff < minDiff) {
            minDiff = diff;
            imgToDraw = imagesRef.current[i];
            actualFrame = i;
          }
        }
      }
    }

    if (!imgToDraw || !imgToDraw.naturalWidth) return;

    // Avoid redrawing identical frame if dimensions haven't changed
    lastDrawnFrameRef.current = actualFrame;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgWidth = imgToDraw.naturalWidth;
    const imgHeight = imgToDraw.naturalHeight;

    // Object-fit cover scaling
    const scale = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
    const renderWidth = imgWidth * scale;
    const renderHeight = imgHeight * scale;
    const offsetX = (canvasWidth - renderWidth) / 2;
    const offsetY = (canvasHeight - renderHeight) / 2;

    ctx.drawImage(imgToDraw, offsetX, offsetY, renderWidth, renderHeight);
  }, []);

  // Update canvas sizing based on window & device pixel ratio
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    const targetWidth = Math.round(displayWidth * dpr);
    const targetHeight = Math.round(displayHeight * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      lastDrawnFrameRef.current = -1; // force redraw
      renderFrame(Math.round(currentFrameRef.current));
    }
  }, [renderFrame]);

  // Progressive image preloading
  useEffect(() => {
    imagesRef.current = new Array(TOTAL_FRAMES + 1);
    loadedMapRef.current = new Uint8Array(TOTAL_FRAMES + 1);

    // 1. Immediately preload the first frame for instantaneous first paint
    const firstImg = new Image();
    firstImg.src = getFramePath(1);
    firstImg.onload = () => {
      imagesRef.current[1] = firstImg;
      loadedMapRef.current[1] = 1;
      updateCanvasSize();
      renderFrame(1);
    };
    imagesRef.current[1] = firstImg;

    // 2. Preload remaining frames in staged batches
    const loadRemainingFrames = () => {
      // Prioritize the first 30 frames for immediate top-of-page scrolling
      const priorityBatch = [];
      for (let i = 2; i <= Math.min(30, TOTAL_FRAMES); i++) {
        priorityBatch.push(i);
      }

      const loadIndices = (indices, callback) => {
        let loadedCount = 0;
        indices.forEach((i) => {
          const img = new Image();
          img.src = getFramePath(i);
          img.onload = () => {
            imagesRef.current[i] = img;
            loadedMapRef.current[i] = 1;
            loadedCount++;
            if (loadedCount === indices.length && callback) {
              callback();
            }
          };
          img.onerror = () => {
            loadedCount++;
            if (loadedCount === indices.length && callback) {
              callback();
            }
          };
          imagesRef.current[i] = img;
        });
      };

      loadIndices(priorityBatch, () => {
        // Load the rest of the 238 frames
        const remainingBatch = [];
        for (let i = 31; i <= TOTAL_FRAMES; i++) {
          remainingBatch.push(i);
        }
        loadIndices(remainingBatch);
      });
    };

    // Begin background preloading
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => loadRemainingFrames(), { timeout: 800 });
    } else {
      setTimeout(loadRemainingFrames, 100);
    }

    return () => {
      imagesRef.current = [];
    };
  }, [renderFrame, updateCanvasSize]);

  // Scroll listener and smooth animation loop
  useEffect(() => {
    updateCanvasSize();

    // Calculate frame target from current scroll progress
    const calculateTargetFrame = () => {
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const clientHeight = window.innerHeight || document.documentElement.clientHeight;
      const maxScroll = Math.max(scrollHeight - clientHeight, 1);

      const progress = Math.min(Math.max(scrollY / maxScroll, 0), 1);
      const frame = 1 + progress * (TOTAL_FRAMES - 1);
      targetFrameRef.current = frame;
    };

    // Smooth animation loop using lerp for ultra fluid transitions
    const animate = () => {
      const diff = targetFrameRef.current - currentFrameRef.current;
      
      if (Math.abs(diff) > 0.01) {
        // Fast dynamic lerp
        currentFrameRef.current += diff * 0.25;
        const frameIndex = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(currentFrameRef.current)));
        if (frameIndex !== lastDrawnFrameRef.current) {
          renderFrame(frameIndex);
        }
      } else if (currentFrameRef.current !== targetFrameRef.current) {
        currentFrameRef.current = targetFrameRef.current;
        const frameIndex = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(currentFrameRef.current)));
        if (frameIndex !== lastDrawnFrameRef.current) {
          renderFrame(frameIndex);
        }
      }

      rafIdRef.current = requestAnimationFrame(animate);
    };

    // Initial position
    calculateTargetFrame();
    currentFrameRef.current = targetFrameRef.current;
    renderFrame(Math.round(currentFrameRef.current));
    rafIdRef.current = requestAnimationFrame(animate);

    const handleScroll = () => {
      calculateTargetFrame();
    };

    const handleResize = () => {
      updateCanvasSize();
      calculateTargetFrame();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    // Also observe document height changes for dynamic content
    const resizeObserver = new ResizeObserver(() => {
      calculateTargetFrame();
    });
    if (document.body) {
      resizeObserver.observe(document.body);
    }

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      resizeObserver.disconnect();
    };
  }, [renderFrame, updateCanvasSize]);

  return (
    <div className="scroll-frame-bg-container" aria-hidden="true">
      <canvas ref={canvasRef} className="scroll-frame-canvas" />
      <div className="scroll-frame-overlay" />
      <div className="scroll-frame-grid" />
    </div>
  );
}
