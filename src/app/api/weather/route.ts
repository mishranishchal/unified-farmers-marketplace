import { ok } from '@/lib/server/http';

function hashText(value: string): number {
  let acc = 0;
  for (let index = 0; index < value.length; index += 1) {
    acc = (acc * 33 + value.charCodeAt(index)) % 100000;
  }
  return acc;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || 'Pune';
  const signal = hashText(`${city}:${new Date().toISOString().slice(0, 13)}`);
  const temp = 23 + (signal % 12);
  const humidity = 46 + (signal % 36);
  const wind = 6 + (signal % 14);
  const rainfallMm = signal % 21;
  const condition = rainfallMm > 14 ? 'Rain watch' : rainfallMm > 8 ? 'Cloud build-up' : 'Mostly clear';
  const forecast = Array.from({ length: 5 }, (_, index) => ({
    day: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
    temp: temp + ((index % 3) - 1),
    condition: index % 2 === 0 ? condition : rainfallMm > 8 ? 'Cloudy' : 'Sunny',
    wind: `${wind + index} km/h`,
  }));

  return ok({
    city,
    current: {
      temp,
      humidity,
      rainfallMm,
      wind: `${wind} km/h`,
      condition,
      observedAt: new Date().toISOString(),
    },
    forecast,
  });
}
