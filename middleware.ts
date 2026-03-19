import { NextResponse, type NextRequest } from "next/server";

// Middleware simplificado - auth é gerenciado pelo layout client-side
// O (main)/layout.tsx já redireciona para /login se não houver sessão
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
