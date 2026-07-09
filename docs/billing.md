# Billing & Subscriptions (Operator Reference)

Stripe powers **Standard → Pro** upgrades for DEML accounts. This is a live path (checkout, webhooks, and reconciliation)—not a roadmap placeholder. Architecture narrative: [WHITEPAPER.md §10](../WHITEPAPER.md#10-data-tenancy-retention-and-lifecycle-policy); maintenance cadence: [BOOK.md Appendix D](../BOOK.md#appendix-d-maintenance--automation-schedule).

## Lifecycle

1. Authenticated **Operator** / **Security Admin** (not Viewer) starts checkout via the billing API.
2. Stripe Checkout completes; webhook `checkout.session.completed` upgrades the profile to **Pro** and stores `stripe_customer_id` / `stripe_subscription_id`.
3. `customer.subscription.updated` / `deleted` keep `subscription_active` and `subscription_current_period_end` in sync (canceled / unpaid / past_due → Standard).
4. Frontend `/success` calls **sync** so the UI reflects Pro even if the webhook races.
5. Scheduled **`sync_subscriptions`** (via `deml-daemon` cron → `deml-workers`) heals missed webhooks.

## API surface

| Endpoint / command                    | Role                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `POST` billing checkout session       | Create Stripe Checkout URL (`client_reference_id` = account id)           |
| Stripe webhook                        | Async tier mutations                                                      |
| Billing **sync**                      | Manual / success-page refresh from Stripe by customer id or linked emails |
| `python manage.py sync_subscriptions` | Sweep non-Standard profiles against Stripe                                |

Implementation: `backend/billing/api.py`, `backend/monitor/management/commands/sync_subscriptions.py`, frontend `success` page.

## Profile fields

| Field                             | Meaning                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `tier`                            | `Standard` or `Pro`                                                                                |
| `stripe_customer_id`              | Stripe customer                                                                                    |
| `stripe_subscription_id`          | Active subscription id                                                                             |
| `subscription_active`             | Local cache of paid status                                                                         |
| `subscription_current_period_end` | Period end (Stripe “basil” API may nest period end on subscription items—code handles both shapes) |

## Operator notes

- **Secrets:** `STRIPE_*` keys via Infisical / host env—never commit.
- **Viewers** cannot open checkout.
- **Pro vs Standard** may gate higher-frequency model refresh and product features; workers still run **symmetrical** pipelines for every account.
- After deploy, verify webhook endpoint URL and signing secret in the Stripe dashboard point at the current `BACKEND_URL`.

## Related

- [Glossary](glossary.md)
- [CONOPS](conops.md)
- [DeepWiki · Billing](https://deepwiki.com/dataengineeringformachinelearning/dataengineeringformachinelearning/2.8-billing-and-subscriptions)
