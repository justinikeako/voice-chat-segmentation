import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

const getApiUrl = () => {
  const saved = localStorage.getItem('VITE_API_URL');
  if (saved) return saved;
  const env = process.env.REACT_APP_API_URL;
  if (env) return env;
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return window.location.origin;
  return 'http://127.0.0.1:5000';
};

export default function ScanPage() {
  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const analysisIntervalRef = useRef(null);
  const segmentationRef = useRef(null);
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [mediaPipeReady, setMediaPipeReady] = useState(false);
  const [liveHairType, setLiveHairType] = useState(null);
  const [liveConfidence, setLiveConfidence] = useState(null);
  const [scanPhase, setScanPhase] = useState('idle');
  const [countdown, setCountdown] = useState(null);
  const [showSeg, setShowSeg] = useState(true);
  const [isAnalysing, setIsAnalysing] = useState(false);

  const showSegRef = useRef(true);
  useEffect(() => { showSegRef.current = showSeg; }, [showSeg]);

  const drawHairOverlay = useCallback((result) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    const video = videoRef.current;
    if (!video) return;
    overlay.width = video.videoWidth || 640;
    overlay.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!showSegRef.current) return;
    const mask = result.categoryMask;
    if (!mask) return;
    const maskData = mask.getAsUint8Array();
    const w = mask.width, h = mask.height;
    const imgData = ctx.createImageData(w, h);
    for (let i = 0; i < maskData.length; i++) {
      if (maskData[i] === 1) {
        imgData.data[i * 4] = 100;
        imgData.data[i * 4 + 1] = 100;
        imgData.data[i * 4 + 2] = 255;
        imgData.data[i * 4 + 3] = 100;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, []);

  const initMediaPipe = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
      segmentationRef.current = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/latest/hair_segmenter.tflite', delegate: 'GPU' },
        runningMode: 'VIDEO', outputCategoryMask: true, outputConfidenceMasks: false
      });
      setMediaPipeReady(true);
    } catch (e) { console.warn('MediaPipe init failed:', e); }
  }, []);

  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !segmentationRef.current) {
      animFrameRef.current = requestAnimationFrame(renderLoop);
      return;
    }
    try {
      const result = segmentationRef.current.segmentForVideo(video, performance.now());
      drawHairOverlay(result);
    } catch (_) {}
    animFrameRef.current = requestAnimationFrame(renderLoop);
  }, [drawHairOverlay]);

  const startLiveAnalysis = useCallback(() => {
    analysisIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      try {
        const c = document.createElement('canvas');
        c.width = video.videoWidth; c.height = video.videoHeight;
        c.getContext('2d').drawImage(video, 0, 0);
        c.toBlob(async (blob) => {
          if (!blob) return;
          const fd = new FormData();
          fd.append('image', blob, 'live.jpg');
          try {
            const res = await fetch(`${getApiUrl()}/api/analyse/live`, { method: 'POST', body: fd });
            const data = await res.json();
            if (data.hair_type) setLiveHairType(data.hair_type);
            if (data.confidence) setLiveConfidence(data.confidence);
          } catch {}
        }, 'image/jpeg', 0.6);
      } catch {}
    }, 5000);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) { setError('Camera not supported.'); return; }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setCameraActive(true);
            initMediaPipe();
            startLiveAnalysis();
          };
        }
      } catch { setError('Camera access denied.'); }
    })();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    };
  }, [initMediaPipe, startLiveAnalysis]);

  useEffect(() => {
    if (mediaPipeReady && cameraActive) {
      animFrameRef.current = requestAnimationFrame(renderLoop);
    }
  }, [mediaPipeReady, cameraActive, renderLoop]);

  const doCapture = async () => {
    if (scanPhase !== 'idle') return;
    setScanPhase('countdown');
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    setCountdown(null);
    setScanPhase('analysing');
    setIsAnalysing(true);
    const video = videoRef.current;
    const c = document.createElement('canvas');
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    try {
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
      const fd = new FormData();
      fd.append('image', blob, 'scan.jpg');
      const res = await fetch(`${getApiUrl()}/api/analyse/`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.status === 'ok') {
        navigate('/results', { state: { data: data.data } });
      } else {
        setError(data.message || 'Analysis failed');
        setScanPhase('idle');
      }
    } catch (e) {
      setError('Could not connect to backend');
      setScanPhase('idle');
    }
    setIsAnalysing(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsAnalysing(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await fetch(`${getApiUrl()}/api/analyse/`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.status === 'ok') navigate('/results', { state: { data: data.data } });
      else setError(data.message || 'Analysis failed');
    } catch { setError('Connection failed'); }
    setIsAnalysing(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 z-10">
        <button onClick={() => navigate('/')} className="text-gray-400 text-sm font-bold">&larr; Back</button>
        <div className="flex items-center gap-2">
          {mediaPipeReady && <span className="bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">LIVE</span>}
          {liveHairType && (
            <span className="bg-kera-gold text-kera-dark text-[10px] font-black px-2.5 py-1 rounded-full">
              {liveHairType} {liveConfidence ? `${Math.round(liveConfidence * 100)}%` : ''}
            </span>
          )}
        </div>
        <button onClick={() => setShowSeg(!showSeg)} className="text-gray-400 text-[10px] font-black uppercase tracking-wider">
          Seg {showSeg ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="flex-1 relative mx-2 rounded-2xl overflow-hidden bg-gray-900" style={{ minHeight: 400 }}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-red-400 text-sm font-bold text-center px-8">{error}</p>
          </div>
        )}
        {countdown && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-8xl font-black text-white animate-ping">{countdown}</span>
          </div>
        )}
        {scanPhase === 'analysing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3">
            <div className="w-12 h-12 border-4 border-kera-gold/30 border-t-kera-gold rounded-full animate-spin" />
            <p className="text-kera-gold text-sm font-black tracking-wider">Analysing with AI...</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-6 py-6 px-4">
        <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-gray-400">
          📁
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        <button onClick={doCapture} disabled={!cameraActive || scanPhase !== 'idle'}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform">
          <div className="w-16 h-16 rounded-full bg-white" />
        </button>
        <div className="w-12" />
      </div>
    </div>
  );
}
