function generateColorPalette(count) {
  //   const colors = [];
  //   const jump = 360 / Math.min(count, 72); // big hue jumps

  //   for (let i = 0; i < count; i++) {
  //     const hue = (i * jump * 3) % 360;
  //     const saturation = 65 + (i % 5) * 5; // Keep colors vibrant (65%-85%)
  //     const lightness = 25 + (i % 4) * 5; // DARK shades only (25%-40%)

  //     colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  //   }
  //   return colors;

  const baseHues = [
    0, // Red
    220, // Blue
    30, // Orange
    200, // Slate/Grayish Blue
    120, // Green
    270, // Purple
    180, // Teal/Cyan
    50, // Gold/Amber
  ];

  const colors = [];

  for (let i = 0; i < count; i++) {
    const hue = baseHues[i % baseHues.length];
    const saturation = 60 + (i % 3) * 10; // Stay punchy: 60%-80%
    const lightness = 25 + (i % 4) * 5; // Darkish: 25%-40%

    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  return colors;
}

// Usage:
export const constructorColors = generateColorPalette(212);
