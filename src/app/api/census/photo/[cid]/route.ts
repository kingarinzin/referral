import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/token';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  try {
    const { cid } = await params;
    if (!cid) {
      return NextResponse.json({ error: 'CID required' }, { status: 400 });
    }

    const token = await getAccessToken();
    const apiUrl = `https://datahub-apim.tech.gov.bt/dcrc_restimagesapi/1.0.0/citizenImage/${cid}`;

    const response = await fetch(apiUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      return new NextResponse(null, { status: 404 });
    }

    // Parse JSON response from the external API
    const data = await response.json();
    const imageBase64 = data?.citizenimages?.citizenimage?.[0]?.image;

    if (!imageBase64) {
      return new NextResponse(null, { status: 404 });
    }

    // Decode base64 to binary buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Determine content type (usually JPEG)
    const contentType = 'image/jpeg'; // You can try to detect from magic bytes if needed

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error in photo API route:', error);
    return new NextResponse(null, { status: 500 });
  }
}