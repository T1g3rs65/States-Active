import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Platform } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { Delaunay } from 'd3-delaunay';

type Cell = {
  xy: number[][];
  points: string;
  grid: number;
};

function hash01(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function viewportSize() {
  if (typeof window !== 'undefined') {
    return { w: window.innerWidth || 390, h: window.innerHeight || 844 };
  }
  return { w: 390, h: 844 };
}

function buildMesh(w: number, h: number, cellPx: number): Cell[] {
  const area = Math.max(1, w * h);
  const px = Math.max(cellPx, Math.sqrt(area / 360));
  const cols = Math.max(6, Math.round(w / px));
  const rows = Math.max(5, Math.round(h / px));
  const pts: [number, number][] = [];
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const jx = (hash01(r * 19 + c * 7) - 0.5) * (w / cols) * 0.7;
      const jy = (hash01(c * 13 + r * 29) - 0.5) * (h / rows) * 0.7;
      pts.push([
        Math.max(0, Math.min(w, (c / cols) * w + jx)),
        Math.max(0, Math.min(h, (r / rows) * h + jy)),
      ]);
    }
  }
  const delaunay = Delaunay.from(pts);
  const voronoi = delaunay.voronoi([0, 0, w, h]);
  const cells: Cell[] = [];
  for (let i = 0; i < pts.length; i++) {
    const poly = voronoi.cellPolygon(i);
    if (!poly || poly.length < 3) continue;
    let cx = 0;
    let cy = 0;
    for (const [x, y] of poly) {
      cx += x;
      cy += y;
    }
    cx /= poly.length;
    cy /= poly.length;
    const gx = Math.min(6, Math.max(0, Math.floor((cx / w) * 7)));
    const gy = Math.min(6, Math.max(0, Math.floor((cy / h) * 7)));
    cells.push({
      xy: poly,
      points: poly.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '),
      grid: gy * 7 + gx,
    });
  }
  return cells;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || '#2EE6C5').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  return [
    parseInt(full.slice(0, 2), 16) || 46,
    parseInt(full.slice(2, 4), 16) || 230,
    parseInt(full.slice(4, 6), 16) || 197,
  ];
}

function ensureCss() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('voronoi-loader-css')) return;
  const s = document.createElement('style');
  s.id = 'voronoi-loader-css';
  s.textContent = `
    @keyframes voronoiPulse { 0%{opacity:.84} 50%{opacity:1} 100%{opacity:.84} }
    .voronoi-loader-canvas {
      display: block;
      animation: voronoiPulse 1.5s ease-in-out infinite;
      pointer-events: none;
    }
    .voronoi-loader-canvas.viewport {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
    }
    .voronoi-loader-canvas.parent {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
    }
  `;
  document.head.appendChild(s);
}

export default function VoronoiLoader({
  frames,
  color,
  duration = 130,
  cellPx = 22,
  compact = false,
  pinViewport = false,
}: {
  frames: number[][];
  color: string;
  duration?: number;
  cellPx?: number;
  compact?: boolean;
  pinViewport?: boolean;
}) {
  const [size, setSize] = useState(viewportSize);
  const framesRef = useRef(frames);
  framesRef.current = frames;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cellsRef = useRef<Cell[]>([]);
  const colorRef = useRef(color);
  colorRef.current = color;
  const web = Platform.OS === 'web' && typeof document !== 'undefined';

  useLayoutEffect(() => {
    ensureCss();
    if (compact || !pinViewport) return;
    const apply = () => setSize(viewportSize());
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [compact, pinViewport]);

  const cells = useMemo(() => {
    if (size.w < 8 || size.h < 8) return [];
    return buildMesh(size.w, size.h, cellPx);
  }, [size.w, size.h, cellPx]);
  cellsRef.current = cells;

  useEffect(() => {
    if (!web) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    let last = 0;
    let id = 0;
    const paint = (active: number[]) => {
      const list = cellsRef.current;
      if (!list.length) return;
      const { w, h } = { w: canvas.clientWidth || size.w, h: canvas.clientHeight || size.h };
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const bw = Math.floor((size.w || w) * dpr);
      const bh = Math.floor((size.h || h) * dpr);
      if (canvas.width !== bw) canvas.width = bw;
      if (canvas.height !== bh) canvas.height = bh;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);
      const [r, g, b] = hexToRgb(colorRef.current);
      for (let i = 0; i < list.length; i++) {
        const cell = list[i];
        const lit = active.includes(cell.grid);
        const shade = 0.04 + hash01(i + 3) * 0.05;
        ctx.beginPath();
        ctx.moveTo(cell.xy[0][0], cell.xy[0][1]);
        for (let p = 1; p < cell.xy.length; p++) ctx.lineTo(cell.xy[p][0], cell.xy[p][1]);
        ctx.closePath();
        ctx.fillStyle = lit
          ? `rgba(${r},${g},${b},${0.38 + hash01(i) * 0.2})`
          : `rgba(243,246,250,${shade})`;
        ctx.fill();
        ctx.strokeStyle = lit ? `rgba(${r},${g},${b},0.4)` : 'rgba(255,255,255,0.04)';
        ctx.lineWidth = lit ? 0.8 : 0.4;
        ctx.stroke();
      }
    };
    paint(framesRef.current[0] || []);
    const tick = (now: number) => {
      const seq = framesRef.current;
      if (now - last >= duration && seq.length) {
        last = now;
        frame = (frame + 1) % seq.length;
        paint(seq[frame] || []);
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [web, cells, duration, size.w, size.h]);

  const onLayout = (e: LayoutChangeEvent) => {
    if (pinViewport) return;
    const { width, height } = e.nativeEvent.layout;
    if (width < 8 || height < 8) return;
    if (Math.abs(width - size.w) < 2 && Math.abs(height - size.h) < 2) return;
    setSize({ w: width, h: height });
  };

  if (web && !compact) {
    if (pinViewport) {
      return (
        // @ts-ignore canvas on RN-web
        <canvas ref={canvasRef as any} className="voronoi-loader-canvas viewport" />
      );
    }
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
        {/* @ts-ignore canvas on RN-web */}
        <canvas
          ref={canvasRef as any}
          className="voronoi-loader-canvas parent"
          style={{ position: 'absolute', left: 0, top: 0, width: size.w, height: size.h }}
        />
      </View>
    );
  }

  const [r, g, b] = hexToRgb(color);
  const litSet = frames[0] || [];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {web ? (
        // @ts-ignore
        <canvas
          ref={canvasRef as any}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
      ) : (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
          {cells.map((cell, i) => {
            const lit = litSet.includes(cell.grid);
            const shade = 0.04 + hash01(i + 3) * 0.05;
            const fill = lit
              ? `rgba(${r},${g},${b},${0.38 + hash01(i) * 0.2})`
              : `rgba(243,246,250,${shade})`;
            return (
              <Polygon
                key={i}
                points={cell.points}
                fill={fill}
                stroke={lit ? `rgba(${r},${g},${b},0.4)` : 'rgba(255,255,255,0.04)'}
                strokeWidth={lit ? 0.8 : 0.4}
              />
            );
          })}
        </Svg>
      )}
    </View>
  );
}
