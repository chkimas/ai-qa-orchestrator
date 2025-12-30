import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define only the routes that are allowed to be seen WITHOUT logging in.
// We include the Clerk auth routes so users can actually sign in.
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware(async (auth, request) => {
  // If the current request is NOT a public route, protect it.
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files (images, favicon, etc.)
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
