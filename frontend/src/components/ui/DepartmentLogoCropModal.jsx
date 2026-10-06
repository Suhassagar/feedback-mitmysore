import { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Image as ImageIcon } from 'lucide-react';

export default function DepartmentLogoCropModal({
  isOpen,
  imageFile,
  deptId = 'DEPT',
  deptName = 'DEPARTMENT NAME',
  onClose,
  onCropComplete
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const canvasRef = useRef(null);
  const imageObjRef = useRef(null);

  // Load image object from file
  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target.result;
      setImageSrc(src);
      const img = new Image();
      img.onload = () => {
        imageObjRef.current = img;
        setImageSize({ width: img.width, height: img.height });
        setZoom(1);
        setPan({ x: 0, y: 0 });
      };
      img.src = src;
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  // Draw crop preview on main canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img || !isOpen) return;

    const ctx = canvas.getContext('2d');
    const size = 320;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // Calculate scaling to fill circle
    const baseScale = Math.max(size / img.width, size / img.height);
    const currentScale = baseScale * zoom;

    const drawW = img.width * currentScale;
    const drawH = img.height * currentScale;
    const drawX = (size - drawW) / 2 + pan.x;
    const drawY = (size - drawH) / 2 + pan.y;

    // Draw background image
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Dark overlay with circular viewfinder cut-out
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.rect(0, 0, size, size);
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2, true);
    ctx.fill('evenodd');

    // Circular guideline border
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }, [isOpen, zoom, pan, imageSrc, imageSize]);

  // Handle Drag / Pan
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Export cropped circle to Blob
  const handleApplyCrop = () => {
    const img = imageObjRef.current;
    if (!img) return;

    const exportCanvas = document.createElement('canvas');
    const exportSize = 400; // Crisp retina resolution
    exportCanvas.width = exportSize;
    exportCanvas.height = exportSize;
    const ctx = exportCanvas.getContext('2d');

    const previewSize = 320;
    const scaleRatio = exportSize / previewSize;

    const baseScale = Math.max(previewSize / img.width, previewSize / img.height);
    const currentScale = baseScale * zoom * scaleRatio;

    const drawW = img.width * currentScale;
    const drawH = img.height * currentScale;
    const drawX = (exportSize - drawW) / 2 + pan.x * scaleRatio;
    const drawY = (exportSize - drawH) / 2 + pan.y * scaleRatio;

    // Draw full cropped graphic
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    exportCanvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], `logo_${deptId.toLowerCase()}.webp`, { type: 'image/webp' });
        onCropComplete({
          file: croppedFile,
          previewUrl: exportCanvas.toDataURL('image/webp')
        });
        onClose();
      }
    }, 'image/webp', 0.92);
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px'
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '520px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(37, 99, 235, 0.1)',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ImageIcon size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                Crop & Frame Department Logo
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                Center the emblem inside the circular viewfinder
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewfinder Canvas Area */}
        <div
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#0F172A',
            userSelect: 'none'
          }}
        >
          <div
            style={{
              width: '320px',
              height: '320px',
              borderRadius: '16px',
              overflow: 'hidden',
              cursor: isDragging ? 'grabbing' : 'grab',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
          </div>

          {/* Zoom & Pan Controls */}
          <div
            style={{
              width: '100%',
              maxWidth: '360px',
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#E2E8F0'
            }}
          >
            <ZoomOut size={16} />
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#38BDF8', cursor: 'pointer' }}
            />
            <ZoomIn size={16} />
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              title="Reset Zoom & Pan"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#E2E8F0',
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px'
              }}
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            background: '#FFFFFF'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            style={{
              padding: '10px 22px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}
          >
            <Check size={16} /> Confirm Logo
          </button>
        </div>
      </div>
    </div>
  );
}
