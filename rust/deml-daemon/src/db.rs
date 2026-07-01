use anyhow::Result;
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

/// Mirror of Django's `OutboxEvent` model.
///
/// Table: `monitor_outboxevent` (Django default: `{app}_{model}`).
/// Only the columns needed by the relay are included — schema is owned by Django migrations.
#[derive(Debug, sqlx::FromRow)]
pub struct OutboxEvent {
    pub id: Uuid,
    pub topic: String,
    /// Optional partition key (e.g. user UID).
    pub key: Option<String>,
    /// Event payload — matches Django's `JSONField` (Postgres JSONB).
    pub payload: Value,
    /// Kafka message headers — matches Django's `JSONField` (Postgres JSONB).
    pub headers: Value,
    /// Number of failed publish attempts so far.
    pub attempts: i32,
}

/// Fetch a batch of unpublished events ordered by creation time (FIFO).
///
/// Events with `attempts >= max_attempts` are skipped — they are logged as
/// `dlq_candidate` by the relay and left for manual inspection.
pub async fn fetch_pending(
    pool: &PgPool,
    batch_size: i64,
    max_attempts: i32,
) -> Result<Vec<OutboxEvent>> {
    let rows = sqlx::query_as::<_, OutboxEvent>(
        r#"
        SELECT id, topic, key, payload, headers, attempts
        FROM   monitor_outboxevent
        WHERE  is_published = false
          AND  attempts < $1
        ORDER  BY created_at ASC
        LIMIT  $2
        "#,
    )
    .bind(max_attempts)
    .bind(batch_size)
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

/// Mark an event as successfully published.
pub async fn mark_published(pool: &PgPool, id: Uuid) -> Result<()> {
    sqlx::query(
        r#"
        UPDATE monitor_outboxevent
        SET    is_published = true,
               published_at = NOW(),
               last_error   = NULL
        WHERE  id = $1
        "#,
    )
    .bind(id)
    .execute(pool)
    .await?;

    Ok(())
}

/// Record a publish failure and increment the attempt counter.
pub async fn record_failure(pool: &PgPool, id: Uuid, error: &str) -> Result<()> {
    sqlx::query(
        r#"
        UPDATE monitor_outboxevent
        SET    attempts   = attempts + 1,
               last_error = $2
        WHERE  id = $1
        "#,
    )
    .bind(id)
    .bind(error)
    .execute(pool)
    .await?;

    Ok(())
}
