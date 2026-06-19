// app/api/census/person/[cid]/route.ts
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
    const apiUrl = `https://datahub-apim.tech.gov.bt/dcrc_citizen_details_api/1.0.0/citizendetails/${cid}`;
    const response = await fetch(apiUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'CID not found in census' }, { status: 404 });
      }
      return NextResponse.json(
        { error: `Census API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const citizen = data?.citizenDetailsResponse?.citizenDetail?.[0];

    if (!citizen) {
      return NextResponse.json({ error: 'CID not found in census' }, { status: 404 });
    }

    // Return the full citizen data plus a computed fullName
    return NextResponse.json({
      ...citizen,
      fullName: `${citizen.firstName || ''} ${citizen.lastName || ''}`.trim(),
    });
  } catch (error: any) {
    console.error('Error in person API route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}