export function brandTokens(color) {
  const rgb = color.slice(1).match(/.{2}/g).map(part => parseInt(part, 16));
  const linear = rgb.map(part => {
    const channel = part / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  const contrast = (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#111111' : '#ffffff';
  const soft = `#${rgb.map(part => Math.round(part * 0.12 + 255 * 0.88).toString(16).padStart(2, '0')).join('')}`;
  return { '--brand': color, '--brand-contrast': contrast, '--soft-brand': soft };
}
