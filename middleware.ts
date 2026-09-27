import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  // The creator calculator (/embed/<code>, D-27) is made to sit inside other
  // people's pages; everything else stays unframeable.
  if (request.nextUrl.pathname.startsWith("/embed/")) {
    response.headers.set("Content-Security-Policy", "frame-ancestors *");
  } else {
    response.headers.set("X-Frame-Options", "DENY");
  }
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
