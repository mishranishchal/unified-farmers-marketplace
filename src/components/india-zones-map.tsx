'use client';

import React from 'react';

type ZoneData = {
  [key: string]: number;
};

type IndiaZonesMapProps = {
  data: ZoneData;
};

const getColor = (value: number, maxValue: number) => {
  const opacity = value / maxValue;
  return `hsla(151, 63%, 26%, ${Math.max(0.2, opacity)})`;
};

const zonePaths = {
  North: 'M 200,20 L 420,20 L 420,105 L 250,130 L 200,90 Z',
  West: 'M 70,105 L 250,130 L 250,275 L 70,275 Z',
  Central: 'M 250,130 L 420,105 L 430,245 L 250,275 Z',
  East: 'M 420,105 L 560,130 L 550,295 L 430,245 Z',
  South: 'M 210,275 L 430,245 L 360,360 L 260,390 Z',
};

export default function IndiaZonesMap({ data }: IndiaZonesMapProps) {
  const maxValue = Math.max(...Object.values(data), 1);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/30 p-4 rounded-xl">
      <svg viewBox="0 0 620 420" className="w-full h-full">
        {Object.entries(zonePaths).map(([zone, path]) => {
          const value = data[zone] || 0;
          const fill = getColor(value, maxValue);
          return (
            <path
              key={zone}
              d={path}
              fill={fill}
              stroke="hsl(var(--background))"
              strokeWidth="2"
              className="transition-all duration-300 hover:opacity-85"
            >
              <title>{`${zone}: ${value}% activity`}</title>
            </path>
          );
        })}
        <text x="308" y="72" textAnchor="middle" className="fill-white text-xs font-semibold">
          North
        </text>
        <text x="156" y="205" textAnchor="middle" className="fill-white text-xs font-semibold">
          West
        </text>
        <text x="338" y="198" textAnchor="middle" className="fill-white text-xs font-semibold">
          Central
        </text>
        <text x="496" y="206" textAnchor="middle" className="fill-white text-xs font-semibold">
          East
        </text>
        <text x="314" y="332" textAnchor="middle" className="fill-white text-xs font-semibold">
          South
        </text>
      </svg>
      <div className="w-full flex justify-center items-center gap-4 mt-3 text-xs">
        <span className="text-muted-foreground">Low Activity</span>
        <div className="h-3 w-36 rounded-full overflow-hidden border border-border">
          <div
            className="h-full w-full"
            style={{ background: 'linear-gradient(to right, hsla(151, 63%, 26%, 0.2), hsla(151, 63%, 26%, 1))' }}
          />
        </div>
        <span className="text-muted-foreground">High Activity</span>
      </div>
    </div>
  );
}
