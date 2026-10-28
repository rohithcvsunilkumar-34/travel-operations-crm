import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, getAdminCredentials, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const admin = getAdminCredentials();

    // Constant-time or direct string comparison against configured credentials
    const isUserValid = username.trim().toLowerCase() === admin.username.trim().toLowerCase();
    const isPassValid = password === admin.password;

    if (!isUserValid || !isPassValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const token = await createSessionToken(admin.username);

    const response = NextResponse.json({
      success: true,
      username: admin.username,
      message: 'Authentication successful',
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server authentication error' },
      { status: 500 }
    );
  }
}

