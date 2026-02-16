use serde::{Deserialize, Serialize};
use std::process::Command;

// ---- Data Models ----

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub node_version: Option<String>,
    pub npm_version: Option<String>,
    pub openclaw_installed: bool,
    pub openclaw_version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
}

// ---- Tauri Commands ----

#[tauri::command]
fn detect_system() -> SystemInfo {
    let os = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();

    let node_version = run_cmd("node", &["--version"])
        .ok()
        .map(|r| r.stdout.trim().to_string());

    let npm_version = run_cmd("npm", &["--version"])
        .ok()
        .map(|r| r.stdout.trim().to_string());

    let openclaw_result = run_cmd("openclaw", &["--version"]);
    let openclaw_installed = openclaw_result.is_ok();
    let openclaw_version = openclaw_result.ok().map(|r| r.stdout.trim().to_string());

    SystemInfo {
        os,
        arch,
        node_version,
        npm_version,
        openclaw_installed,
        openclaw_version,
    }
}

#[tauri::command]
fn run_openclaw_command(args: Vec<String>) -> CommandResult {
    match run_cmd(
        "openclaw",
        &args.iter().map(|s| s.as_str()).collect::<Vec<&str>>(),
    ) {
        Ok(result) => result,
        Err(e) => CommandResult {
            success: false,
            stdout: String::new(),
            stderr: format!("Failed to execute command: {}", e),
            exit_code: None,
        },
    }
}

#[tauri::command]
fn install_openclaw() -> CommandResult {
    match run_cmd("npm", &["install", "-g", "openclaw@latest"]) {
        Ok(result) => result,
        Err(e) => CommandResult {
            success: false,
            stdout: String::new(),
            stderr: format!("Install failed: {}", e),
            exit_code: None,
        },
    }
}

#[tauri::command]
fn run_onboard() -> CommandResult {
    match run_cmd("openclaw", &["onboard", "--install-daemon"]) {
        Ok(result) => result,
        Err(e) => CommandResult {
            success: false,
            stdout: String::new(),
            stderr: format!("Onboard failed: {}", e),
            exit_code: None,
        },
    }
}

#[tauri::command]
fn run_doctor() -> CommandResult {
    match run_cmd("openclaw", &["doctor"]) {
        Ok(result) => result,
        Err(e) => CommandResult {
            success: false,
            stdout: String::new(),
            stderr: format!("Doctor check failed: {}", e),
            exit_code: None,
        },
    }
}

#[tauri::command]
fn start_gateway() -> CommandResult {
    match run_cmd("openclaw", &["gateway", "--port", "18789"]) {
        Ok(result) => result,
        Err(e) => CommandResult {
            success: false,
            stdout: String::new(),
            stderr: format!("Gateway start failed: {}", e),
            exit_code: None,
        },
    }
}

#[tauri::command]
fn send_agent_message(message: String) -> CommandResult {
    match run_cmd("openclaw", &["agent", "--message", &message]) {
        Ok(result) => result,
        Err(e) => CommandResult {
            success: false,
            stdout: String::new(),
            stderr: format!("Agent message failed: {}", e),
            exit_code: None,
        },
    }
}

#[tauri::command]
fn execute_script(script_path: String, task_goal: Option<String>) -> CommandResult {
    // SECURITY NOTE: In a real app, validate script_path to prevent arbitrary execution
    // For this prototype, we assume the frontend sends a safe relative path
    let mut args = vec![script_path.as_str()];
    
    // We need to keep the goal string alive if we want to reference it, 
    // but building the vector of &str is tricky if we own the String.
    // Easier approach: construct the command arguments completely.
    
    let mut cmd = Command::new("node");
    cmd.arg(&script_path);

    if let Some(goal) = task_goal {
        cmd.arg("--goal");
        cmd.arg(goal);
    }

    match cmd.output() {
        Ok(output) => CommandResult {
            success: output.status.success(),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code(),
        },
        Err(e) => CommandResult {
            success: false,
            stdout: String::new(),
            stderr: format!("Script execution failed: {}", e),
            exit_code: None,
        },
    }
}

// ---- Helper ----

fn run_cmd(program: &str, args: &[&str]) -> Result<CommandResult, String> {
    Command::new(program)
        .args(args)
        .output()
        .map(|output| CommandResult {
            success: output.status.success(),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code(),
        })
        .map_err(|e| e.to_string())
}

// ---- App Setup ----

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            detect_system,
            run_openclaw_command,
            install_openclaw,
            run_onboard,
            run_doctor,
            start_gateway,
            send_agent_message,
            execute_script,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
