#!/bin/bash

# Configuration
DATE=$(date +%Y-%m-%d)
OUTPUT="cercles-$DATE.md"

echo "# Cercles du $DATE" > "$OUTPUT"
echo "" >> "$OUTPUT"

# Cercle 1 : Reddit - r/LocalLLaMA (bots + coût)
echo "## Reddit r/LocalLLaMA" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "Recherche: posts <7 jours avec 'bot', 'abuse', 'rate limit', 'cost'" >> "$OUTPUT"
echo "Liens:" >> "$OUTPUT"
curl -s "https://www.reddit.com/r/LocalLLaMA/new.json?limit=20" | \
  jq -r '.data.children[] | select(.data.created_utc > (now - 604800)) | "- [\( .data.title)](https://reddit.com\( .data.permalink))"' >> "$OUTPUT" 2>/dev/null
echo "" >> "$OUTPUT"

# Cercle 2 : GitHub Issues - Vercel AI SDK
echo "## GitHub Issues (Vercel AI SDK)" >> "$OUTPUT"
echo "" >> "$OUTPUT"
curl -s "https://api.github.com/repos/vercel/ai/issues?state=open&per_page=10&sort=created&direction=desc" | \
  jq -r '.[] | select(.created_at > (now - 7*24*60*60)) | "- [#\(.number) \(.title)](\(.html_url))"' >> "$OUTPUT" 2>/dev/null
echo "" >> "$OUTPUT"

# Cercle 3 : GitHub Issues - LangChain
echo "## GitHub Issues (LangChain)" >> "$OUTPUT"
echo "" >> "$OUTPUT"
curl -s "https://api.github.com/repos/langchain-ai/langchain/issues?state=open&per_page=10&sort=created&direction=desc" | \
  jq -r '.[] | select(.created_at > (now - 7*24*60*60)) | "- [#\(.number) \(.title)](\(.html_url))"' >> "$OUTPUT" 2>/dev/null
echo "" >> "$OUTPUT"

# Cercle 4 : Hacker News
echo "## Hacker News (derniers 7 jours)" >> "$OUTPUT"
echo "" >> "$OUTPUT"
curl -s "https://hn.algolia.com/api/v1/search_by_date?query=bot+abuse&tags=story&numericFilters=created_at_i>$(date -d '7 days ago' +%s)" | \
  jq -r '.hits[] | "- [\(.title)](\(.url // "https://news.ycombinator.com/item?id=\(.objectID)"))"' >> "$OUTPUT" 2>/dev/null
echo "" >> "$OUTPUT"

echo "Fichier créé: $OUTPUT"
