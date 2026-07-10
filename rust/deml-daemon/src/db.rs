use anyhow::Result;
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

/// Leased mirror of Django's `OutboxEvent` model.
#[derive(Debug, sqlx::FromRow)]
pub struct OutboxEvent {
    pub id: Uuid,
    pub topic: String,
    pub key: Option<String>,
    pub payload: Value,
    pub headers: Value,
    pub idempotency_key: Option<String>,
}

/// Atomically claim a FIFO batch. `SKIP LOCKED` lets multiple relay replicas work
/// without selecting the same rows; an expired lease makes crash recovery automatic.
pub async fn claim_pending(
    pool: &PgPool,
    owner: Uuid,
    batch_size: i64,
    max_attempts: i32,
) -> Result<Vec<OutboxEvent>> {
    let rows = sqlx::query_as::<_, OutboxEvent>(
        r#"
        WITH candidates AS (
            SELECT id
            FROM monitor_outboxevent
            WHERE is_published = false
              AND dlq_at IS NULL
              AND attempts < $1
              AND available_at <= NOW()
              AND (lease_expires_at IS NULL OR lease_expires_at < NOW())
            ORDER BY created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT $2
        )
        UPDATE monitor_outboxevent AS event
        SET lease_owner = $3,
            lease_expires_at = NOW() + INTERVAL '60 seconds'
        FROM candidates
        WHERE event.id = candidates.id
        RETURNING event.id, event.topic, event.key, event.payload, event.headers,
                  event.idempotency_key
        "#,
    )
    .bind(max_attempts)
    .bind(batch_size)
    .bind(owner)
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

pub async fn mark_published(pool: &PgPool, owner: Uuid, id: Uuid) -> Result<bool> {
    let result = sqlx::query(
        r#"
        UPDATE monitor_outboxevent
        SET is_published = true,
            published_at = NOW(),
            last_error = NULL,
            lease_owner = NULL,
            lease_expires_at = NULL
        WHERE id = $1 AND lease_owner = $2
        "#,
    )
    .bind(id)
    .bind(owner)
    .execute(pool)
    .await?;
    Ok(result.rows_affected() == 1)
}

pub async fn record_failure(
    pool: &PgPool,
    owner: Uuid,
    id: Uuid,
    error: &str,
    max_attempts: i32,
) -> Result<()> {
    sqlx::query(
        r#"
        UPDATE monitor_outboxevent
        SET attempts = attempts + 1,
            last_error = $3,
            available_at = NOW() + (
                LEAST(300, POWER(2, LEAST(attempts + 1, 8))::integer)::text || ' seconds'
            )::interval,
            dlq_at = CASE WHEN attempts + 1 >= $4 THEN NOW() ELSE dlq_at END,
            lease_owner = NULL,
            lease_expires_at = NULL
        WHERE id = $1 AND lease_owner = $2
        "#,
    )
    .bind(id)
    .bind(owner)
    .bind(error)
    .bind(max_attempts)
    .execute(pool)
    .await?;
    Ok(())
}
