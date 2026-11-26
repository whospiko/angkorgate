import { angkorgateMiddleware } from "@angkorgate/nextjs/server";

export default angkorgateMiddleware({
  protectedRoutes: ["/dashboard"],
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
