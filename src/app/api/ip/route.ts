import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  const interfaces = os.networkInterfaces();
  let localIp = 'Unknown';

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        localIp = net.address;
        break;
      }
    }
    if (localIp !== 'Unknown') break;
  }

  return NextResponse.json({ ip: localIp });
}
