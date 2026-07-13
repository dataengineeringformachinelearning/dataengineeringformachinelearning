#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod agent;
mod app;
mod auth;
mod llm;
mod models;
mod store;

use app::DemlApp;

fn main() -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: eframe::egui::ViewportBuilder::default()
            .with_title("DEML Security Workbench")
            .with_app_id("app.deml.security-workbench")
            .with_inner_size([1180.0, 760.0])
            .with_min_inner_size([900.0, 620.0]),
        centered: true,
        ..Default::default()
    };
    eframe::run_native(
        "DEML Security Workbench",
        options,
        Box::new(|cc| Ok(Box::new(DemlApp::new(cc)))),
    )
}
