# Publishing DEML Blue Notes

Blue Notes are the public product history for DEML. Each Markdown file in `blue-notes/` becomes an entry on `/blog/`, an individual article page, an RSS item, and a sitemap URL.

Create a file named `YYYY-MM-DD-short-title.md` with this frontmatter:

```yaml
---
title: A clear, outcome-led release title
summary: One sentence describing who benefits and what changed.
publishedAt: 2026-07-10
note: Platform Note 006
categories:
  - Platform
  - Security
featured: false
draft: false
---
```

Write for operators and builders. Lead with the user-visible outcome, group changes beneath descriptive headings, explain why the change matters, and call out migrations or behavior changes explicitly. Use `draft: true` while preparing an entry. Avoid claiming a feature is live until its production path is verified.
