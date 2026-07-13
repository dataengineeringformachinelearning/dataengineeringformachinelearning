use std::{fs, os::unix::fs::PermissionsExt, path::PathBuf};

use anyhow::{Context, Result};
use directories::ProjectDirs;

use crate::models::AppData;

pub struct Store {
    path: PathBuf,
}

impl Store {
    pub fn new() -> Result<Self> {
        let dirs = ProjectDirs::from("app", "DEML", "Security Workbench")
            .context("macOS Application Support directory is unavailable")?;
        Ok(Self {
            path: dirs.data_local_dir().join("state.json"),
        })
    }

    pub fn load(&self) -> Result<AppData> {
        if !self.path.exists() {
            return Ok(AppData::default());
        }
        let bytes = fs::read(&self.path)
            .with_context(|| format!("failed to read {}", self.path.display()))?;
        serde_json::from_slice(&bytes).context("application state is not valid JSON")
    }

    pub fn save(&self, data: &AppData) -> Result<()> {
        let parent = self.path.parent().context("state path has no parent")?;
        fs::create_dir_all(parent)?;
        let temp = self.path.with_extension("json.tmp");
        let bytes = serde_json::to_vec_pretty(data)?;
        fs::write(&temp, bytes)?;
        fs::set_permissions(&temp, fs::Permissions::from_mode(0o600))?;
        fs::rename(&temp, &self.path)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_state_round_trips() {
        let value = serde_json::to_vec(&AppData::default()).unwrap();
        let decoded: AppData = serde_json::from_slice(&value).unwrap();
        assert_eq!(decoded.schema_version, 1);
    }
}
