use std::path::PathBuf;

pub fn workspace_file_name(workspace_id: &str) -> String {
  format!("{workspace_id}.json")
}

pub fn backup_file_name(workspace_id: &str) -> String {
  format!("{workspace_id}.backup.json")
}

pub fn temp_file_name(workspace_id: &str) -> String {
  format!("{workspace_id}.json.tmp")
}

pub fn data_dir(root: PathBuf) -> PathBuf {
  root.join("data")
}

