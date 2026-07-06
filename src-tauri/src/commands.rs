// src-tauri/src/commands.rs

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use rand::Rng;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::Emitter;
use tiny_http::{Header, Response, Server};

#[derive(Deserialize, Serialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: String,
    token_type: String,
    expires_in: u64,
}

// Cria cliente reqwest customizado com User-Agent para evitar rate-limits do MyAnimeList
fn get_client() -> Client {
    Client::builder()
        .user_agent("AnimeVault/1.0.0 (Tauri Desktop App; MyAnimeList Integration)")
        .build()
        .unwrap_or_else(|_| Client::new())
}

// --- Comandos Gerais e Utilitários ---

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn open_in_browser(url: String) -> Result<(), String> {
    match webbrowser::open(&url) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Falha ao abrir o navegador: {}", e)),
    }
}

/// Verifica se um arquivo existe fisicamente no disco antes de tentar reproduzi-lo.
/// Retorna false silenciosamente para caminhos vazios ou inválidos.
#[tauri::command]
pub fn check_file_exists(path: String) -> bool {
    if path.is_empty() {
        return false;
    }
    std::path::Path::new(&path).exists()
}

// --- Comandos de Autenticação ---

#[derive(Serialize)]
pub struct PkceData {
    code_verifier: String,
    code_challenge: String,
    state: String,
}

#[tauri::command]
pub fn generate_pkce_challenge() -> PkceData {
    let charset = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~";
    let mut rng = rand::rng();

    let code_verifier: String = (0..128)
        .map(|_| {
            let idx = rng.random_range(0..charset.len());
            charset[idx] as char
        })
        .collect();

    let state: String = (0..32)
        .map(|_| {
            let idx = rng.random_range(0..charset.len());
            charset[idx] as char
        })
        .collect();

    // Codificação S256 para o desafio PKCE
    use sha2::{Sha256, Digest};
    use base64::Engine;

    let mut hasher = Sha256::new();
    hasher.update(code_verifier.as_bytes());
    let hash = hasher.finalize();
    let code_challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(hash);

    PkceData {
        code_verifier,
        code_challenge,
        state,
    }
}

#[tauri::command]
pub fn start_auth_server(window: tauri::Window) {
    std::thread::spawn(move || {
        let server_addr = "127.0.0.1:1421"; // Endereço de callback
        let server = match Server::http(server_addr) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("Falha ao iniciar o servidor de callback: {}", e);
                return;
            }
        };

        if let Ok(Some(request)) = server.recv_timeout(std::time::Duration::from_secs(180)) {
            let url = request.url().to_string();

            if url.starts_with("/auth/callback") {
                let params: HashMap<String, String> =
                    url::form_urlencoded::parse(url.split('?').nth(1).unwrap_or("").as_bytes())
                        .into_owned()
                        .collect();

                let code = params.get("code").cloned().unwrap_or_default();
                let state = params.get("state").cloned().unwrap_or_default();

                let _ = window.emit(
                    "mal-auth-callback",
                    serde_json::json!({ "code": code, "state": state }),
                );
                
                // (HTML OMITIDO PARA BREVIDADE)
                let response_html = include_str!("./auth_success.html");
                let response = Response::from_string(response_html).with_header(
                    Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..])
                        .unwrap(),
                );
                let _ = request.respond(response);
            }
        } else {
            eprintln!("Servidor de callback expirou ou falhou em receber a requisição.");
        }
    });
}

fn get_mal_client_id() -> Result<String, String> {
    std::env::var("MYANIMELIST_CLIENT_ID")
        .map_err(|_| "Erro: A variável de ambiente MYANIMELIST_CLIENT_ID não está configurada no seu arquivo .env".to_string())
}

fn get_mal_client_secret() -> Result<String, String> {
    std::env::var("MYANIMELIST_CLIENT_SECRET")
        .map_err(|_| "Erro: A variável de ambiente MYANIMELIST_CLIENT_SECRET não está configurada no seu arquivo .env".to_string())
}

#[tauri::command]
pub async fn exchange_code_for_token(
    code: String,
    code_verifier: String,
    redirect_uri: String,
) -> Result<String, String> {
    let client_id = get_mal_client_id()?;
    let client_secret = get_mal_client_secret()?;
    let token_url = "https://myanimelist.net/v1/oauth2/token";
    
    let params = [
        ("client_id", client_id.as_str()),
        ("client_secret", client_secret.as_str()),
        ("grant_type", "authorization_code"),
        ("code", code.as_str()),
        ("redirect_uri", redirect_uri.as_str()),
        ("code_verifier", code_verifier.as_str()),
    ];

    let client = get_client();
    let res = client
        .post(token_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Erro ao requisitar token: {}", e))?;
        
    let status = res.status();
    let text = res
        .text()
        .await
        .map_err(|e| format!("Erro ao ler resposta do token: {}", e))?;

    if !status.is_success() {
        return Err(format!("Erro da API MAL ao obter token: {} - {}", status, text));
    }
    
    // A única coisa que a função faz é retornar o texto com os tokens.
    Ok(text)
}

// --- Comandos Públicos da API do MyAnimeList ---

#[tauri::command]
pub async fn get_user(username: String) -> Result<String, String> {
    let client_id = get_mal_client_id()?;
    let url = format!(
        "https://api.myanimelist.net/v2/users/{}?fields=anime_statistics",
        username
    );
    let client = get_client();
    let res = client
        .get(&url)
        .header("X-MAL-CLIENT-ID", &client_id)
        .send()
        .await
        .map_err(|e| format!("Erro ao buscar perfil: {}", e))?;
    res.text()
        .await
        .map_err(|e| format!("Erro ao ler resposta: {}", e))
}

#[tauri::command]
pub async fn get_anime_list(username: String, limit: Option<u32>) -> Result<String, String> {
    let client_id = get_mal_client_id()?;
    let lim = limit.unwrap_or(100);
    let url = format!("https://api.myanimelist.net/v2/users/{}/animelist?fields=list_status,anime{{title,main_picture,mean,genres,num_episodes,media_type,status,start_season,studios}}&limit={}", username, lim);
    let client = get_client();
    let res = client
        .get(&url)
        .header("X-MAL-CLIENT-ID", &client_id)
        .send()
        .await
        .map_err(|e| format!("Erro ao buscar lista: {}", e))?;
    res.text()
        .await
        .map_err(|e| format!("Erro ao ler resposta: {}", e))
}

#[tauri::command]
pub async fn search_anime(
    query: String,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<String, String> {
    let client_id = get_mal_client_id()?;
    let url = format!(
        "https://api.myanimelist.net/v2/anime?q={}&limit={}&offset={}&fields=id,title,alternative_titles,synopsis,mean,rank,popularity,num_list_users,num_scoring_users,nsfw,created_at,updated_at,media_type,status,genres,num_episodes,start_season,broadcast,source,average_episode_duration,studios,pictures,background,related_anime,related_manga,recommendations,statistics",
        query,
        limit.unwrap_or(20),
        offset.unwrap_or(0)
    );
    let client = get_client();
    let res = client
        .get(&url)
        .header("X-MAL-CLIENT-ID", &client_id)
        .send()
        .await
        .map_err(|e| format!("Erro ao buscar animes: {}", e))?;
    res.text()
        .await
        .map_err(|e| format!("Erro ao ler resposta: {}", e))
}

#[tauri::command]
pub async fn get_anime_details(anime_id: u32) -> Result<String, String> {
    let client_id = get_mal_client_id()?;
    let url = format!(
        "https://api.myanimelist.net/v2/anime/{}?fields=id,title,alternative_titles,synopsis,mean,rank,popularity,num_list_users,num_scoring_users,nsfw,created_at,updated_at,media_type,status,genres,num_episodes,start_season,broadcast,source,average_episode_duration,studios,pictures,background,related_anime,related_manga,recommendations,statistics",
        anime_id
    );
    let client = get_client();
    let res = client
        .get(&url)
        .header("X-MAL-CLIENT-ID", &client_id)
        .send()
        .await
        .map_err(|e| format!("Erro ao buscar detalhes: {}", e))?;
    res.text()
        .await
        .map_err(|e| format!("Erro ao ler resposta: {}", e))
}

// --- Comandos de Usuário Autenticado ---

#[tauri::command]
pub async fn get_authenticated_user_profile(token: String) -> Result<String, String> {
    let url = "https://api.myanimelist.net/v2/users/@me?fields=id,name,picture,anime_statistics";
    let client = get_client();
    let res = client
        .get(url)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("Erro ao fazer a requisição de perfil: {}", e))?;

    let status = res.status();
    let text = res
        .text()
        .await
        .map_err(|e| format!("Erro ao ler resposta do perfil: {}", e))?;

    if !status.is_success() {
        return Err(format!("Erro da API MAL ao buscar perfil: {} - {}", status, text));
    }

    Ok(text)
}

#[tauri::command]
pub async fn get_authenticated_anime_list(
    token: String,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<String, String> {
    let client_id = get_mal_client_id()?;
    let url = format!(
        "https://api.myanimelist.net/v2/users/@me/animelist?fields=list_status,anime{{title,main_picture,mean,genres,num_episodes,media_type,status,start_season,studios}}&limit={}&offset={}",
        limit.unwrap_or(100),
        offset.unwrap_or(0)
    );
    let client = get_client();
    let res = client
        .get(&url)
        .header("X-MAL-CLIENT-ID", &client_id)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("Erro ao buscar lista autenticada: {}", e))?;
        
    let status = res.status();
    let text = res
        .text()
        .await
        .map_err(|e| format!("Erro ao ler resposta: {}", e))?;

    if !status.is_success() {
        return Err(format!("Erro da API MAL ao buscar lista: {} - {}", status, text));
    }
    
    Ok(text)
}

#[tauri::command]
pub async fn add_anime_to_list(
    token: String,
    anime_id: u32,
    status: String,
    score: Option<u32>,
    num_episodes_watched: Option<u32>,
    comments: Option<String>,
) -> Result<String, String> {
    let client_id = get_mal_client_id()?;
    let url = format!(
        "https://api.myanimelist.net/v2/anime/{}/my_list_status",
        anime_id
    );
    let mut params = HashMap::new();
    params.insert("status".to_string(), status);
    if let Some(s) = score {
        params.insert("score".to_string(), s.to_string());
    }
    if let Some(n) = num_episodes_watched {
        params.insert("num_watched_episodes".to_string(), n.to_string());
    }
    if let Some(c) = comments {
        params.insert("comments".to_string(), c);
    }
    
    let client = get_client();
    let res = client
        .put(&url)
        .header("X-MAL-CLIENT-ID", &client_id)
        .bearer_auth(token)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Erro ao atualizar anime na lista: {}", e))?;
    
    let status = res.status();
    let text = res
        .text()
        .await
        .map_err(|e| format!("Erro ao ler resposta de atualização: {}", e))?;

    if !status.is_success() {
        return Err(format!("Erro da API MAL ao atualizar: {} - {}", status, text));
    }
    
    Ok(text)
}

#[tauri::command]
pub async fn remove_anime_from_list(token: String, anime_id: u32) -> Result<(), String> {
    let client_id = get_mal_client_id()?;
    let url = format!(
        "https://api.myanimelist.net/v2/anime/{}/my_list_status",
        anime_id
    );
    let client = get_client();
    let res = client
        .delete(&url)
        .header("X-MAL-CLIENT-ID", &client_id)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("Erro ao remover anime: {}", e))?;
        
    if !res.status().is_success() {
        let status = res.status();
        let error_text = res.text().await.unwrap_or_else(|_| "N/A".to_string());
        return Err(format!("Erro ao remover anime: {} - {}", status, error_text));
    }
    Ok(())
}

#[tauri::command]
pub async fn generate_gemini_recommendations(prompt: String) -> Result<String, String> {
    let api_key = std::env::var("GEMINI_API_KEY")
        .map_err(|_| "Erro: A variável de ambiente GEMINI_API_KEY não está configurada no seu arquivo .env".to_string())?;
    
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={}",
        api_key
    );

    let client = Client::builder()
        .user_agent("AnimeVault/1.0.0 (Tauri Desktop App; Gemini Integration)")
        .build()
        .unwrap_or_else(|_| Client::new());

    let payload = serde_json::json!({
        "contents": [{ "parts": [{ "text": prompt }] }]
    });

    let res = client
        .post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Erro ao conectar ao Gemini: {}", e))?;

    let status = res.status();
    let text = res
        .text()
        .await
        .map_err(|e| format!("Erro ao ler resposta do Gemini: {}", e))?;

    if !status.is_success() {
        return Err(format!("Erro da API do Gemini: {} - {}", status, text));
    }

    // Parse do JSON da resposta do Gemini
    let data: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("Erro ao parsear JSON do Gemini: {}", e))?;

    let generated_text = data["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or_else(|| "Sem resposta de texto válida da IA".to_string())?;

    Ok(generated_text.to_string())
}

#[tauri::command]
pub async fn sync_to_saas_db(token: String, action: String, payload: String) -> Result<bool, String> {
    let saas_url = match std::env::var("ZENITH_SAAS_API_URL") {
        Ok(url) => url,
        Err(_) => {
            // Em modo offline/local-first simulado quando não configurada a API do SaaS
            println!("[SaaS Sync] ZENITH_SAAS_API_URL não definida. Modo local-first ativo.");
            return Ok(true);
        }
    };

    if saas_url.trim().is_empty() || saas_url.contains("api.zenith.inc") {
        // Mock de sucesso quando rodando em ambiente local sem API real configurada
        println!("[SaaS Sync] Mock de sucesso para acao: {}", action);
        return Ok(true);
    }

    let url = format!("{}/sync", saas_url);
    let client = Client::builder()
        .user_agent("AnimeVault/1.0.0 (Tauri Desktop App; SaaS Sync)")
        .build()
        .unwrap_or_else(|_| Client::new());

    let payload_json: serde_json::Value = serde_json::from_str(&payload)
        .map_err(|e| format!("JSON de payload invalido: {}", e))?;

    let body = serde_json::json!({
        "events": [{
            "action": action,
            "payload": payload_json,
            "timestamp": new_timestamp()
        }]
    });

    let res = client
        .post(&url)
        .bearer_auth(token)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Erro ao conectar com o SaaS: {}", e))?;

    let status = res.status();
    if status.is_success() {
        Ok(true)
    } else {
        let err_text = res.text().await.unwrap_or_else(|_| "N/A".to_string());
        Err(format!("Erro retornado pelo SaaS ({}): {}", status, err_text))
    }
}

// Helper para gerar timestamp ISO no formato esperado pela reconciliação
fn new_timestamp() -> String {
    let now = std::time::SystemTime::now();
    let datetime: chrono::DateTime<chrono::Utc> = now.into();
    datetime.to_rfc3339()
}