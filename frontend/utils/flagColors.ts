/** Pull primary (largest / first) and secondary flag colors. */

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function parseCssColor(raw: string): [number, number, number] | null {
  const s = raw.trim();
  if (!s || s === 'none' || s === 'transparent' || s.startsWith('url')) return null;
  const hex = s.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length < 6) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgb = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];
  return null;
}

function lum(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function distinct(a: [number, number, number], b: [number, number, number]): boolean {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 28;
}

function hashPair(salt: string): { primary: string; secondary: string } {
  let h = 2166136261;
  for (let i = 0; i < salt.length; i++) h = Math.imul(h ^ salt.charCodeAt(i), 16777619);
  const hue = (h >>> 0) % 360;
  const hue2 = (hue + 40 + ((h >>> 8) % 80)) % 360;
  const hsl = (hh: number, s: number, l: number) => {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + hh / 30) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return toHex(f(0) * 255, f(8) * 255, f(4) * 255);
  };
  return { primary: hsl(hue, 0.55, 0.42), secondary: hsl(hue2, 0.5, 0.28) };
}

function fromList(colors: [number, number, number][]): { primary: string; secondary: string } | null {
  const usable = colors.filter(c => {
    const l = lum(...c);
    return l > 0.06 && l < 0.94;
  });
  const src = usable.length ? usable : colors;
  if (!src.length) return null;
  const primary = src[0];
  let secondary = src.find(c => distinct(c, primary)) || null;
  if (!secondary) {
    secondary = [
      Math.max(0, primary[0] * 0.45),
      Math.max(0, primary[1] * 0.45),
      Math.max(0, primary[2] * 0.45),
    ];
  }
  return { primary: toHex(...primary), secondary: toHex(...secondary) };
}

function decodeFlagXml(flag: string): string | null {
  try {
    const m = flag.match(/^data:image\/svg\+xml(?:;charset=[^;]+)?;base64,(.+)$/i);
    if (m) return atob(m[1]);
    if (flag.includes('<svg')) return flag;
  } catch {
    /* ignore */
  }
  return null;
}

function fromSvg(xml: string): { primary: string; secondary: string } | null {
  const found: [number, number, number][] = [];
  const re = /fill\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const c = parseCssColor(m[1]);
    if (!c) continue;
    if (!found.some(x => !distinct(x, c))) found.push(c);
  }
  return fromList(found);
}

function fromCanvas(uri: string): Promise<{ primary: string; secondary: string } | null> {
  return new Promise(resolve => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 48;
        c.height = 32;
        const ctx = c.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, 48, 32);
        const data = ctx.getImageData(0, 0, 48, 32).data;
        const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 40) continue;
          const r = data[i] >> 4;
          const g = data[i + 1] >> 4;
          const b = data[i + 2] >> 4;
          const key = `${r},${g},${b}`;
          const o = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
          o.n++;
          o.r += data[i];
          o.g += data[i + 1];
          o.b += data[i + 2];
          buckets.set(key, o);
        }
        const ranked = [...buckets.values()]
          .sort((a, b) => b.n - a.n)
          .map(x => [x.r / x.n, x.g / x.n, x.b / x.n] as [number, number, number]);
        resolve(fromList(ranked));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = uri;
  });
}

export async function colorsFromFlag(
  flag: string | null | undefined,
  salt: string
): Promise<{ primary: string; secondary: string }> {
  const fallback = hashPair(salt || 'nation');
  if (!flag) return fallback;
  const xml = decodeFlagXml(flag);
  if (xml) {
    const svgCols = fromSvg(xml);
    if (svgCols) return svgCols;
  }
  if (flag.startsWith('data:image')) {
    const sampled = await fromCanvas(flag);
    if (sampled) return sampled;
  }
  return fallback;
}
