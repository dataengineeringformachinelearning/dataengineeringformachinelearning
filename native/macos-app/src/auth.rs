use std::{
    io::{ErrorKind, Read, Write},
    net::{IpAddr, Ipv4Addr, SocketAddr, TcpListener, TcpStream},
    sync::mpsc::{self, Receiver},
    thread,
    time::{Duration, Instant},
};

use anyhow::{Context, Result, bail};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use keyring::Entry;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use url::Url;
use uuid::Uuid;

const SESSION_SERVICE: &str = "app.deml.security-workbench.desktop-session";
const MODEL_SERVICE: &str = "app.deml.security-workbench.model-provider";
const SESSION_ACCOUNT: &str = "current-operator";
const CALLBACK_TIMEOUT: Duration = Duration::from_secs(300);

#[derive(Clone, Debug, Deserialize)]
pub struct DesktopIdentity {
    pub user: String,
    pub email: String,
    pub user_id: i64,
    pub role: String,
    pub desktop_token: Option<String>,
}

#[derive(Serialize)]
struct HandoffExchange<'a> {
    token: &'a str,
    code_verifier: &'a str,
}

#[derive(Serialize)]
struct SessionValidation<'a> {
    desktop_token: &'a str,
}

pub fn auth_url() -> String {
    std::env::var("DEML_AUTH_URL").unwrap_or_else(|_| "https://deml.app/".into())
}

pub fn api_url() -> String {
    std::env::var("DEML_API_URL").unwrap_or_else(|_| "https://backend.deml.app".into())
}

pub fn begin_browser_login() -> Result<Receiver<Result<DesktopIdentity, String>>> {
    let listener = TcpListener::bind(SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), 0))
        .context("could not create the local authentication callback")?;
    listener.set_nonblocking(true)?;
    let port = listener.local_addr()?.port();
    let callback = format!("http://127.0.0.1:{port}/callback");
    let state = random_url_value();
    let verifier = random_url_value();
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let mut login_url = Url::parse(&auth_url()).context("DEML_AUTH_URL is invalid")?;
    if login_url.scheme() != "https" && !is_local_development_url(&login_url) {
        bail!("the browser authentication endpoint must use HTTPS");
    }
    login_url
        .query_pairs_mut()
        .append_pair("desktop_callback", &callback)
        .append_pair("desktop_state", &state)
        .append_pair("code_challenge", &challenge);

    let (sender, receiver) = mpsc::channel();
    thread::spawn(move || {
        let result =
            wait_for_callback(listener, &state, &verifier).map_err(|error| error.to_string());
        let _ = sender.send(result);
    });
    webbrowser::open(login_url.as_str()).context("could not open the system browser")?;
    Ok(receiver)
}

pub fn restore_session() -> Option<Receiver<Result<DesktopIdentity, String>>> {
    let token = desktop_session_token().ok().flatten()?;
    let (sender, receiver) = mpsc::channel();
    thread::spawn(move || {
        let result = validate_session(&token).map_err(|error| error.to_string());
        if result.is_err() {
            let _ = clear_desktop_session();
        }
        let _ = sender.send(result);
    });
    Some(receiver)
}

pub fn clear_desktop_session() -> Result<()> {
    match Entry::new(SESSION_SERVICE, SESSION_ACCOUNT)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(error.into()),
    }
}

fn wait_for_callback(
    listener: TcpListener,
    expected_state: &str,
    verifier: &str,
) -> Result<DesktopIdentity> {
    let deadline = Instant::now() + CALLBACK_TIMEOUT;
    loop {
        match listener.accept() {
            Ok((mut stream, _)) => {
                let result = receive_callback(&mut stream, expected_state, verifier);
                let success = result.is_ok();
                write_browser_response(&mut stream, success)?;
                return result;
            }
            Err(error) if error.kind() == ErrorKind::WouldBlock && Instant::now() < deadline => {
                thread::sleep(Duration::from_millis(100));
            }
            Err(error) if error.kind() == ErrorKind::WouldBlock => {
                bail!("browser authentication timed out");
            }
            Err(error) => return Err(error.into()),
        }
    }
}

fn receive_callback(
    stream: &mut TcpStream,
    expected_state: &str,
    verifier: &str,
) -> Result<DesktopIdentity> {
    stream.set_read_timeout(Some(Duration::from_secs(5)))?;
    let mut request = [0_u8; 8192];
    let length = stream.read(&mut request)?;
    let request = std::str::from_utf8(&request[..length]).context("callback was not valid HTTP")?;
    let request_line = request
        .lines()
        .next()
        .context("callback request was empty")?;
    let mut parts = request_line.split_whitespace();
    if parts.next() != Some("GET") {
        bail!("callback must use GET");
    }
    let target = parts.next().context("callback target was missing")?;
    let url = Url::parse(&format!("http://127.0.0.1{target}"))?;
    if url.path() != "/callback" {
        bail!("callback path was invalid");
    }
    let query: std::collections::HashMap<_, _> = url.query_pairs().into_owned().collect();
    if query.get("state").map(String::as_str) != Some(expected_state) {
        bail!("authentication state did not match");
    }
    let code = query
        .get("code")
        .context("authorization code was missing")?;
    exchange_code(code, verifier)
}

fn exchange_code(code: &str, verifier: &str) -> Result<DesktopIdentity> {
    let endpoint = format!(
        "{}/api/v1/auth/handoff/verify",
        api_url().trim_end_matches('/')
    );
    let response = http_client()?
        .post(endpoint)
        .json(&HandoffExchange {
            token: code,
            code_verifier: verifier,
        })
        .send()?
        .error_for_status()
        .context("desktop authorization code exchange failed")?;
    let identity: DesktopIdentity = response.json()?;
    let token = identity
        .desktop_token
        .as_deref()
        .context("server returned no desktop session token")?;
    Entry::new(SESSION_SERVICE, SESSION_ACCOUNT)?.set_password(token)?;
    Ok(identity)
}

fn validate_session(token: &str) -> Result<DesktopIdentity> {
    let endpoint = format!(
        "{}/api/v1/auth/desktop/session",
        api_url().trim_end_matches('/')
    );
    http_client()?
        .post(endpoint)
        .json(&SessionValidation {
            desktop_token: token,
        })
        .send()?
        .error_for_status()
        .context("saved desktop session is no longer valid")?
        .json()
        .context("desktop session response was invalid")
}

fn http_client() -> Result<reqwest::blocking::Client> {
    Ok(reqwest::blocking::Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(30))
        .user_agent(format!(
            "deml-security-workbench/{}",
            env!("CARGO_PKG_VERSION")
        ))
        .build()?)
}

fn write_browser_response(stream: &mut TcpStream, success: bool) -> Result<()> {
    let (title, message) = if success {
        (
            "Authentication complete",
            "You are signed in. DEML Security Workbench is ready, and you can close this tab.",
        )
    } else {
        (
            "Authentication failed",
            "The sign-in response could not be verified. Return to DEML Security Workbench and try again.",
        )
    };
    let body = format!(
        "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'\"><title>{title}</title><style>body{{font:16px system-ui;background:#070c14;color:#eaf2f8;display:grid;place-items:center;min-height:100vh;margin:0}}main{{max-width:34rem;padding:2rem;border:1px solid #304052;border-radius:12px;background:#111924}}h1{{color:#28aabe}}</style></head><body><main><h1>{title}</h1><p>{message}</p></main></body></html>"
    );
    write!(
        stream,
        "HTTP/1.1 {}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n{}",
        if success { "200 OK" } else { "400 Bad Request" },
        body.len(),
        body
    )?;
    stream.flush()?;
    Ok(())
}

fn random_url_value() -> String {
    format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple())
}

fn is_local_development_url(url: &Url) -> bool {
    url.scheme() == "http" && matches!(url.host_str(), Some("127.0.0.1" | "localhost"))
}

fn desktop_session_token() -> Result<Option<String>> {
    let entry = Entry::new(SESSION_SERVICE, SESSION_ACCOUNT)?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(error.into()),
    }
}

pub fn set_model_api_key(email: &str, key: &str) -> Result<()> {
    let entry = Entry::new(MODEL_SERVICE, email)?;
    if key.trim().is_empty() {
        let _ = entry.delete_credential();
    } else {
        entry.set_password(key.trim())?;
    }
    Ok(())
}

pub fn model_api_key(email: &str) -> Result<Option<String>> {
    let entry = Entry::new(MODEL_SERVICE, email)?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(error.into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn random_values_are_pkce_compatible() {
        let value = random_url_value();
        assert_eq!(value.len(), 64);
        assert!(value.chars().all(|value| value.is_ascii_alphanumeric()));
    }

    #[test]
    fn rejects_non_loopback_development_auth() {
        assert!(!is_local_development_url(
            &Url::parse("http://example.com").unwrap()
        ));
        assert!(is_local_development_url(
            &Url::parse("http://127.0.0.1:4200").unwrap()
        ));
    }
}
