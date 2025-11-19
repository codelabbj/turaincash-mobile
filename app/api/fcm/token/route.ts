import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { token, platform, userId } = await request.json();

    // Store the token in your database
    // Example: await database.saveDeviceToken(token, platform, userId);

    console.log(`Token received for platform: ${platform}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving token:', error);
    return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
  }
}