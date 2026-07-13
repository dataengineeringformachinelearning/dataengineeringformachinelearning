use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
pub enum Severity {
    Critical,
    High,
    #[default]
    Medium,
    Low,
}

impl Severity {
    pub const ALL: [Self; 4] = [Self::Critical, Self::High, Self::Medium, Self::Low];

    pub fn label(self) -> &'static str {
        match self {
            Self::Critical => "Critical",
            Self::High => "High",
            Self::Medium => "Medium",
            Self::Low => "Low",
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
pub enum FindingStatus {
    #[default]
    Triage,
    Investigating,
    Mitigated,
    Resolved,
    FalsePositive,
}

impl FindingStatus {
    pub const ALL: [Self; 5] = [
        Self::Triage,
        Self::Investigating,
        Self::Mitigated,
        Self::Resolved,
        Self::FalsePositive,
    ];

    pub fn label(self) -> &'static str {
        match self {
            Self::Triage => "Triage",
            Self::Investigating => "Investigating",
            Self::Mitigated => "Mitigated",
            Self::Resolved => "Resolved",
            Self::FalsePositive => "False positive",
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Finding {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub severity: Severity,
    pub status: FindingStatus,
    pub cve: String,
    pub asset: String,
    pub source: String,
    pub resolution: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Finding {
    pub fn new(title: String, description: String, severity: Severity) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            title,
            description,
            severity,
            status: FindingStatus::Triage,
            cve: String::new(),
            asset: "Local workspace".into(),
            source: "Manual".into(),
            resolution: String::new(),
            created_at: now,
            updated_at: now,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
pub enum ProviderKind {
    #[default]
    Ollama,
    OpenAiCompatible,
    Anthropic,
}

impl ProviderKind {
    pub const ALL: [Self; 3] = [Self::Ollama, Self::OpenAiCompatible, Self::Anthropic];

    pub fn label(self) -> &'static str {
        match self {
            Self::Ollama => "Ollama (local)",
            Self::OpenAiCompatible => "OpenAI-compatible cloud",
            Self::Anthropic => "Anthropic",
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ProviderConfig {
    pub kind: ProviderKind,
    pub endpoint: String,
    pub model: String,
}

impl Default for ProviderConfig {
    fn default() -> Self {
        Self {
            kind: ProviderKind::Ollama,
            endpoint: "http://127.0.0.1:11434".into(),
            model: "qwen2.5-coder:7b".into(),
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct AuditEvent {
    pub at: DateTime<Utc>,
    pub actor: String,
    pub action: String,
    pub detail: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct AppData {
    pub schema_version: u32,
    pub operator_email: Option<String>,
    pub findings: Vec<Finding>,
    pub provider: ProviderConfig,
    pub workspace: String,
    pub audit_log: Vec<AuditEvent>,
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            schema_version: 1,
            operator_email: None,
            findings: Vec::new(),
            provider: ProviderConfig::default(),
            workspace: String::new(),
            audit_log: Vec::new(),
        }
    }
}

impl AppData {
    pub fn audit(&mut self, action: impl Into<String>, detail: impl Into<String>) {
        self.audit_log.push(AuditEvent {
            at: Utc::now(),
            actor: self
                .operator_email
                .clone()
                .unwrap_or_else(|| "local".into()),
            action: action.into(),
            detail: detail.into(),
        });
        if self.audit_log.len() > 500 {
            self.audit_log.drain(..self.audit_log.len() - 500);
        }
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct AgentProposal {
    pub summary: String,
    pub risk: String,
    #[serde(default)]
    pub steps: Vec<String>,
    #[serde(default)]
    pub commands: Vec<String>,
    pub patch: Option<String>,
}
