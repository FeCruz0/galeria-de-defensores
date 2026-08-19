import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const isValidUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://');

  const supabaseUrl = isValidUrl ? rawUrl : 'https://placeholder-project.supabase.co';
  const supabaseAnonKey = rawKey || 'placeholder-key';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const mockSessionCookie = request.cookies.get('gdd-mock-session');
  if (mockSessionCookie && mockSessionCookie.value) {
    try {
      const mockData = JSON.parse(mockSessionCookie.value);
      const mockUser = {
        id: mockData.user_id,
        aud: 'authenticated',
        role: 'authenticated',
        email: mockData.email,
        email_confirmed_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        user_metadata: { username: mockData.username },
        app_metadata: { provider: 'email', providers: ['email'] }
      };

      supabase.auth.getUser = async () => ({ data: { user: mockUser as any }, error: null });
      supabase.auth.getSession = async () => ({
        data: {
          session: {
            access_token: 'mock-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh-token',
            user: mockUser as any
          }
        },
        error: null
      });
    } catch (e) {
      // Ignora erro de parsing
    }
  }

  // IMPORTANTE: NÃO remova a chamada getUser() para manter a sessão ativa
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Redirecionamento se não autenticado em rotas privadas
  if (
    !user &&
    (path.startsWith('/dashboard') ||
      path.startsWith('/characters') ||
      path.startsWith('/tables'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirecionamento se já autenticado para rotas públicas de auth
  if (user && (path === '/login' || path === '/register')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
