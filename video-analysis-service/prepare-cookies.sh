#!/bin/bash
# Filters a Netscape cookies.txt to only YouTube/Google domains,
# then base64-encodes it for use as the YOUTUBE_COOKIES env var.
#
# Usage: ./prepare-cookies.sh /path/to/cookies.txt

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <cookies.txt>" >&2
  exit 1
fi

INPUT="$1"

if [ ! -f "$INPUT" ]; then
  echo "Error: file not found: $INPUT" >&2
  exit 1
fi

# Keep header comments and YouTube/Google domain lines only
grep -E '^#|^\.(youtube\.com|google\.com|googlevideo\.com)\b' "$INPUT" > /tmp/youtube_only_cookies.txt

ORIGINAL=$(wc -c < "$INPUT" | tr -d ' ')
FILTERED=$(wc -c < /tmp/youtube_only_cookies.txt | tr -d ' ')

echo "Original:  ${ORIGINAL} bytes" >&2
echo "Filtered:  ${FILTERED} bytes" >&2

base64 < /tmp/youtube_only_cookies.txt

rm /tmp/youtube_only_cookies.txt
