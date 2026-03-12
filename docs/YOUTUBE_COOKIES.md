# YouTube Cookies

This project uses YouTube authentication cookies to help `yt-dlp` download trailers
and fetch captions when YouTube blocks anonymous requests with bot/auth checks.

## Where They Are Used

The cookies are used only by the Go video analysis service:

- `video-analysis-service/download.go`
- `video-analysis-service/captions.go`

They are not read directly by the Next.js app or Convex functions.

## Environment Variables

The service supports two cookie inputs:

- `YOUTUBE_COOKIES`
  A Netscape-format `cookies.txt` payload, either:
  raw text or base64-encoded text.
- `YOUTUBE_COOKIES_BROWSER`
  A `yt-dlp --cookies-from-browser` value such as `chrome` or
  `chrome:~/.config/google-chrome`.

Priority order:

1. `YOUTUBE_COOKIES`
2. `YOUTUBE_COOKIES_BROWSER`
3. no cookies

If neither is set, the service still runs, but YouTube may block downloads or
caption access.

## How We Get the Cookies

1. Sign into the YouTube account in a browser.
2. Export cookies in Netscape `cookies.txt` format.
3. Filter that file down to only the relevant YouTube/Google domains.
4. Base64-encode the filtered file and store it in `YOUTUBE_COOKIES`.

This repo includes a helper script for steps 3 and 4:

- `video-analysis-service/prepare-cookies.sh`

Usage:

```bash
./video-analysis-service/prepare-cookies.sh /path/to/cookies.txt
```

What the script does:

- keeps header comments
- keeps only `.youtube.com`, `.google.com`, and `.googlevideo.com` cookie rows
- base64-encodes the filtered result

Use the output as the value for `YOUTUBE_COOKIES`.

## How We Configure Them

Example:

```bash
YOUTUBE_COOKIES=<base64 output from prepare-cookies.sh>
```

Or, if running locally and you want `yt-dlp` to read directly from your browser:

```bash
YOUTUBE_COOKIES_BROWSER=chrome
```

For deployed environments, `YOUTUBE_COOKIES` is the safer option because it does
not depend on a browser profile existing on the host.

## How The Service Uses Them

At runtime:

1. The service reads `YOUTUBE_COOKIES`.
2. It accepts either raw Netscape cookie text or base64.
3. It writes the cookie payload to a temporary file once per process.
4. It passes that file to `yt-dlp` via `--cookies`.
5. If `YOUTUBE_COOKIES` is absent, it falls back to
   `--cookies-from-browser` when `YOUTUBE_COOKIES_BROWSER` is set.

This flow is implemented in `writeCookiesFile()` in
`video-analysis-service/download.go`.

The same cookie loading is used for both:

- video download
- caption download

## Failure Modes

If YouTube blocks the request, the service classifies the error and returns one
of these codes:

- `youtube_auth_required`
- `youtube_rate_limited`
- `youtube_unavailable`
- `youtube_captions_unavailable`

These are classified in
`video-analysis-service/download.go`
and reused by captions flow in
`video-analysis-service/captions.go`.

## Security Notes

- Do not commit exported cookies to git.
- Treat `YOUTUBE_COOKIES` as a secret.
- Prefer filtered cookies over a full browser export.
- Rotate/re-export if the YouTube account signs out or downloads start failing
  with `youtube_auth_required`.

## Operational Notes

- The service logs whether it is using a cookie file or browser-cookie mode.
- The cookie file is materialized in a temp location by the Go service.
- If `YOUTUBE_COOKIES` is malformed, the service logs a warning and proceeds
  without cookies.

## Related Files

- `video-analysis-service/download.go`
- `video-analysis-service/captions.go`
- `video-analysis-service/prepare-cookies.sh`
- `convex/healthRatings.ts`
- `lib/videoAnalysisErrors.ts`
