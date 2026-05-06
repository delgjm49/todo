use std::path::{Path, PathBuf};

pub fn workspace_path(data_dir: &Path, workspace_id: &str) -> PathBuf {
  data_dir.join("workspaces").join(format!("{workspace_id}.json"))
}

