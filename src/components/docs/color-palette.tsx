import React from 'react';

import { Typography } from '@/components/ui/typography';

interface ColorSwatchProps {
  colorVar: string;
  label: string | number;
  showValue?: boolean;
}

export function ColorSwatch({ colorVar, label }: ColorSwatchProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-12 w-12 rounded-lg border border-[var(--color-border-default)] shadow-sm"
        style={{
          backgroundColor: `var(${colorVar})`,
        }}
      />
      <div className="flex flex-col">
        <Typography variant="caption" className="font-medium">
          {label}
        </Typography>
        <Typography
          variant="caption"
          className="mono text-[10px] text-[var(--color-text-tertiary)]"
        >
          {colorVar}
        </Typography>
      </div>
    </div>
  );
}

interface ColorPaletteSectionProps {
  title: string;
  prefix: string;
  stops?: number[];
}

export function ColorPaletteSection({
  title,
  prefix,
  stops = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
}: ColorPaletteSectionProps) {
  return (
    <div className="space-y-3">
      <Typography variant="heading-4">{title}</Typography>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {stops.map((stop) => (
          <ColorSwatch key={stop} colorVar={`--${prefix}-${stop}`} label={stop} />
        ))}
      </div>
    </div>
  );
}
