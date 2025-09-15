#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::{
    fs::{self, OpenOptions},
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH}
};
use uuid::Uuid;

#[derive(Debug, Serialize)]
struct FileStats {
    mtimeMs: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct WriteFileOperation {
    path: String,
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Transaction {
    id: String,
    operations: Vec<WriteFileOperation>,
}

#[derive(Debug, Serialize, Deserialize)]
struct WalEntry {
    transaction_id: String,
    operations: Vec<WriteFileOperation>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpsLogEntry {
    id: String,
    timestamp: u64,
    transaction_id: String,
    operations: Vec<WriteFileOperation>,
}

#[tauri::command]
fn list_files(root: String) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    let dir = PathBuf::from(root);
    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        files.push(path.to_string_lossy().to_string());
    }
    Ok(files)
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn stat_file(path: String) -> Result<FileStats, String> {
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    let modified = meta.modified().map_err(|e| e.to_string())?;
    let duration = modified
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?;
    Ok(FileStats {
        mtimeMs: duration.as_secs_f64() * 1000.0,
    })
}

#[tauri::command]
fn apply_transaction(root: String, tx: Transaction) -> Result<(), String> {
    let root_path = PathBuf::from(root);
    ensure_graph_dir(&root_path).map_err(|e| e.to_string())?;
    let wal_entry = WalEntry {
        transaction_id: tx.id.clone(),
        operations: tx.operations.clone(),
    };
    append_wal(&root_path, &wal_entry).map_err(|e| e.to_string())?;
    for op in &tx.operations {
        let target = root_path.join(&op.path);
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let tmp = target.with_extension("tmp");
        fs::write(&tmp, &op.content).map_err(|e| e.to_string())?;
        fs::rename(&tmp, &target).map_err(|e| e.to_string())?;
    }
    clear_wal(&root_path).map_err(|e| e.to_string())?;
    append_ops_log(&root_path, &tx).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn reindex_graph(root: String) -> Result<(), String> {
    let path = PathBuf::from(root);
    recover_wal(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn verify_graph(root: String) -> Result<(), String> {
    let path = PathBuf::from(root);
    verify_wal(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn compact_graph(root: String) -> Result<(), String> {
    let path = PathBuf::from(root);
    clear_wal(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_ops_log(root: String, limit: Option<usize>) -> Result<Vec<OpsLogEntry>, String> {
    let mut entries = Vec::new();
    let path = ops_log_path(&PathBuf::from(&root));
    if !path.exists() {
        return Ok(entries);
    }
    let file = OpenOptions::new()
        .read(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);
    for line in reader.lines() {
        let line = line.map_err(|e| e.to_string())?;
        if line.trim().is_empty() {
            continue;
        }
        let entry: OpsLogEntry = serde_json::from_str(&line).map_err(|e| e.to_string())?;
        entries.push(entry);
    }
    entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    if let Some(limit) = limit {
        entries.truncate(limit);
    }
    Ok(entries)
}

fn ensure_graph_dir(root: &Path) -> std::io::Result<()> {
    let dir = graph_dir(root);
    fs::create_dir_all(dir)
}

fn graph_dir(root: &Path) -> PathBuf {
    root.join(".graph")
}

fn wal_path(root: &Path) -> PathBuf {
    graph_dir(root).join("wal.log")
}

fn ops_log_path(root: &Path) -> PathBuf {
    graph_dir(root).join("ops_log.jsonl")
}

fn append_wal(root: &Path, entry: &WalEntry) -> std::io::Result<()> {
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(wal_path(root))?;
    let json = serde_json::to_string(entry)?;
    writeln!(file, "{}", json)?;
    Ok(())
}

fn clear_wal(root: &Path) -> std::io::Result<()> {
    let path = wal_path(root);
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

fn recover_wal(root: &Path) -> std::io::Result<()> {
    let path = wal_path(root);
    if !path.exists() {
        return Ok(());
    }
    let file = OpenOptions::new().read(true).open(&path)?;
    let reader = BufReader::new(file);
    for line in reader.lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        let entry: WalEntry = serde_json::from_str(&line)?;
        for op in entry.operations {
            let target = root.join(op.path);
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent)?;
            }
            let tmp = target.with_extension("tmp");
            fs::write(&tmp, &op.content)?;
            fs::rename(&tmp, &target)?;
        }
    }
    clear_wal(root)?;
    Ok(())
}

fn verify_wal(root: &Path) -> std::io::Result<()> {
    let path = wal_path(root);
    if !path.exists() {
        return Ok(());
    }
    let file = OpenOptions::new().read(true).open(path)?;
    let reader = BufReader::new(file);
    for line in reader.lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        let _: WalEntry = serde_json::from_str(&line)?;
    }
    Ok(())
}

fn append_ops_log(root: &Path, tx: &Transaction) -> std::io::Result<()> {
    let entry = OpsLogEntry {
        id: Uuid::new_v4().to_string(),
        timestamp: current_timestamp_ms(),
        transaction_id: tx.id.clone(),
        operations: tx.operations.clone(),
    };
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(ops_log_path(root))?;
    let json = serde_json::to_string(&entry)?;
    writeln!(file, "{}", json)?;
    Ok(())
}

fn current_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_files,
            read_file,
            stat_file,
            apply_transaction,
            reindex_graph,
            verify_graph,
            compact_graph,
            read_ops_log
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
