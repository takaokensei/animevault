// src-tauri/src/main.rs

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Declaramos o módulo 'commands' que está no arquivo commands.rs
mod commands;

fn main() {
    dotenvy::dotenv().ok();
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default().build())

        // Registramos apenas os comandos finais (sem aliases)
        .invoke_handler(tauri::generate_handler![
            // --- Comandos Gerais ---
            commands::greet,
            commands::open_in_browser,

            // --- Comandos de Autenticação ---
            commands::generate_pkce_challenge,
            commands::start_auth_server,
            commands::exchange_code_for_token,

            // --- Comandos Públicos da API MAL ---
            commands::get_user,
            commands::get_anime_list,
            commands::search_anime,
            commands::get_anime_details,

            // --- Comandos da API MAL para Usuários Autenticados ---
            commands::get_authenticated_user_profile,
            commands::get_authenticated_anime_list,
            commands::add_anime_to_list,
            commands::remove_anime_from_list
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao executar a aplicação Tauri");
}