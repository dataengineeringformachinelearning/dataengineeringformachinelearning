"""Reassign orphaned status pages or bootstrap a user's site after DB migration."""

from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from monitor.models import MonitoredService, StatusPage, ValidatedSite

User = get_user_model()


class Command(BaseCommand):
  help = (
    "List status pages, reassign orphaned pages to a user by email, "
    "or create a missing site when the slug is free."
  )

  def add_arguments(self, parser) -> None:
    parser.add_argument("--list", action="store_true", help="Print all status pages.")
    parser.add_argument("--email", type=str, help="Django user email to own the site.")
    parser.add_argument("--slug", type=str, help="Status page slug.")
    parser.add_argument("--title", type=str, default="", help="Title when creating a page.")
    parser.add_argument(
      "--service-url",
      type=str,
      default="",
      help="Optional monitored service URL to attach.",
    )
    parser.add_argument(
      "--reassign",
      action="store_true",
      help="Assign an existing slug to --email (fixes post-migration user_id drift).",
    )
    parser.add_argument(
      "--create",
      action="store_true",
      help="Create the slug for --email when it does not exist.",
    )

  def handle(self, *args: Any, **options: Any) -> None:
    if options["list"]:
      self._list_pages()
      return

    email = (options.get("email") or "").strip().lower()
    slug = (options.get("slug") or "").strip()
    if not email or not slug:
      raise CommandError("Provide --email and --slug (or use --list).")

    user = User.objects.filter(email__iexact=email).first()
    if not user:
      raise CommandError(f"No Django user with email {email!r}")

    page = StatusPage.objects.filter(slug=slug).first()

    if options["reassign"]:
      if not page:
        raise CommandError(f"No status page with slug {slug!r}")
      page.user = user
      page.is_platform = False
      page.save(update_fields=["user", "is_platform"])
      self.stdout.write(self.style.SUCCESS(f"Reassigned {slug!r} to {email}"))
    elif options["create"]:
      if page:
        raise CommandError(f"Slug {slug!r} already exists (user_id={page.user_id})")
      title = options["title"] or slug.replace("-", " ").title()
      page = StatusPage.objects.create(
        user=user,
        title=title,
        slug=slug,
        is_published=True,
      )
      self.stdout.write(self.style.SUCCESS(f"Created {slug!r} for {email}"))
    else:
      raise CommandError("Specify --reassign or --create")

    service_url = (options.get("service_url") or "").strip()
    if service_url and page:
      MonitoredService.objects.get_or_create(
        status_page=page,
        url=service_url,
        defaults={"name": "Primary Site"},
      )
      self.stdout.write(f"Ensured monitored service {service_url}")

      from urllib.parse import urlparse

      host = urlparse(service_url).netloc
      if host:
        ValidatedSite.objects.get_or_create(
          user=user,
          domain=host,
          defaults={"is_verified": True},
        )
        self.stdout.write(f"Ensured validated domain {host}")

  def _list_pages(self) -> None:
    pages = StatusPage.objects.order_by("slug")
    if not pages.exists():
      self.stdout.write("No status pages.")
      return
    for page in pages:
      owner = page.user.email if page.user_id and page.user else "(none)"
      self.stdout.write(
        f"{page.slug}: user_id={page.user_id} email={owner} platform={page.is_platform}"
      )
