const HEX_REGEX = /^#([0-9a-f]{6})$/i;

function parseHex(hex: string): [number, number, number] | null {
  const match = HEX_REGEX.exec(hex);
  if (!match || !match[1]) return null;
  const value = match[1];
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ];
}

function toLinear(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function getContrastForeground(hex: string): "#000000" | "#ffffff" {
  const luminance = getRelativeLuminance(hex);
  if (luminance === null) return "#000000";
  return luminance > 0.5 ? "#000000" : "#ffffff";
}
