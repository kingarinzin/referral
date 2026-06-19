import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/token';

export async function GET() {
  try {
    const token = await getAccessToken();
    return NextResponse.json({
      success: true,
      tokenPreview: token.substring(0, 20) + '...',
      message: 'Token fetched successfully'
    });
  } catch (error: any) {
    console.error('Test token error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}