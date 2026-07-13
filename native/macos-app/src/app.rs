use std::sync::mpsc::{self, Receiver};

use chrono::Utc;
use eframe::egui::{self, Color32, RichText, Stroke};
use uuid::Uuid;

use crate::{
    agent, auth, llm,
    models::{AgentProposal, AppData, Finding, FindingStatus, ProviderKind, Severity},
    store::Store,
};

#[derive(Clone, Copy, Eq, PartialEq)]
enum Page {
    Findings,
    Assistant,
    Settings,
    Audit,
}

pub struct DemlApp {
    store: Store,
    data: AppData,
    authenticated: bool,
    operator_role: String,
    auth_receiver: Option<Receiver<Result<auth::DesktopIdentity, String>>>,
    page: Page,
    selected: Option<Uuid>,
    notice: Option<(bool, String)>,
    new_title: String,
    new_description: String,
    new_severity: Severity,
    agent_request: String,
    context_paths: String,
    proposal: Option<AgentProposal>,
    model_receiver: Option<Receiver<Result<AgentProposal, String>>>,
    api_key_input: String,
    finding_dirty: bool,
}

impl DemlApp {
    pub fn new(cc: &eframe::CreationContext<'_>) -> Self {
        configure_theme(&cc.egui_ctx);
        let store = Store::new().expect("macOS application support is required");
        let mut notice = None;
        let data = store.load().unwrap_or_else(|error| {
            notice = Some((false, format!("Could not load saved state: {error}")));
            AppData::default()
        });
        let auth_receiver = auth::restore_session();
        Self {
            store,
            data,
            authenticated: false,
            operator_role: String::new(),
            auth_receiver,
            page: Page::Findings,
            selected: None,
            notice,
            new_title: String::new(),
            new_description: String::new(),
            new_severity: Severity::Medium,
            agent_request: "Diagnose the root cause and propose the smallest safe remediation patch with validation steps.".into(),
            context_paths: String::new(),
            proposal: None,
            model_receiver: None,
            api_key_input: String::new(),
            finding_dirty: false,
        }
    }

    fn save(&mut self) {
        if let Err(error) = self.store.save(&self.data) {
            self.notice = Some((false, format!("Could not save state: {error}")));
        }
    }

    fn login_ui(&mut self, root: &mut egui::Ui) {
        if self.auth_receiver.is_some() {
            root.ctx()
                .request_repaint_after(std::time::Duration::from_millis(100));
        }
        egui::CentralPanel::default().show(root, |ui| {
            ui.vertical_centered(|ui| {
                ui.add_space(90.0);
                ui.heading(
                    RichText::new("DEML Security Workbench")
                        .size(30.0)
                        .color(ACCENT),
                );
                ui.label("Native, local-first vulnerability triage for macOS");
                ui.add_space(28.0);
                egui::Frame::new()
                    .fill(PANEL)
                    .stroke(Stroke::new(1.0, BORDER))
                    .corner_radius(10)
                    .inner_margin(24)
                    .show(ui, |ui| {
                        ui.set_width(380.0);
                        ui.heading("Sign in to DEML");
                        ui.label("Authentication continues in your default browser, including Google, Apple, password, phone, and MFA options.");
                        ui.add_space(12.0);
                        if self.auth_receiver.is_some() {
                            ui.horizontal(|ui| {
                                ui.spinner();
                                ui.label("Waiting for secure browser authentication…");
                            });
                            if ui.button("Cancel").clicked() {
                                self.auth_receiver = None;
                            }
                        } else if ui
                            .add_sized(
                                [ui.available_width(), 38.0],
                                egui::Button::new("Continue in browser").fill(ACCENT),
                            )
                            .clicked()
                        {
                            match auth::begin_browser_login() {
                                Ok(receiver) => self.auth_receiver = Some(receiver),
                                Err(error) => self.notice = Some((false, error.to_string())),
                            }
                        }
                        ui.add_space(10.0);
                        ui.label(RichText::new("The callback listens only on 127.0.0.1, uses PKCE, expires after five minutes, and stores the resulting session in macOS Keychain.").small().color(MUTED));
                        self.notice_ui(ui);
                    });
            });
        });
    }

    fn shell(&mut self, root: &mut egui::Ui) {
        self.poll_model();
        egui::Panel::top("top_bar").show(root, |ui| {
            ui.horizontal(|ui| {
                ui.heading(RichText::new("DEML").color(ACCENT));
                ui.label(RichText::new("SECURITY WORKBENCH").strong());
                ui.separator();
                let active = self
                    .data
                    .findings
                    .iter()
                    .filter(|f| {
                        !matches!(
                            f.status,
                            FindingStatus::Resolved | FindingStatus::FalsePositive
                        )
                    })
                    .count();
                ui.label(format!(
                    "{active} active finding{}",
                    if active == 1 { "" } else { "s" }
                ));
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    if ui.button("Sign out").clicked() {
                        let _ = auth::clear_desktop_session();
                        self.data
                            .audit("session.logout", "Desktop operator signed out");
                        self.save();
                        self.authenticated = false;
                        self.proposal = None;
                    }
                    ui.label(format!(
                        "{} • {}",
                        self.data.operator_email.as_deref().unwrap_or("local"),
                        self.operator_role
                    ));
                });
            });
        });

        egui::Panel::left("navigation")
            .resizable(false)
            .default_size(175.0)
            .show(root, |ui| {
                ui.add_space(12.0);
                ui.label(RichText::new("OPERATIONS").small().color(MUTED));
                nav_button(ui, &mut self.page, Page::Findings, "Finding queue");
                nav_button(ui, &mut self.page, Page::Assistant, "AI triage agent");
                ui.add_space(12.0);
                ui.label(RichText::new("SYSTEM").small().color(MUTED));
                nav_button(ui, &mut self.page, Page::Settings, "Model settings");
                nav_button(ui, &mut self.page, Page::Audit, "Audit log");
                ui.with_layout(egui::Layout::bottom_up(egui::Align::LEFT), |ui| {
                    ui.label(RichText::new("Local-first • v0.1.0").small().color(MUTED));
                });
            });

        egui::CentralPanel::default().show(root, |ui| {
            self.notice_ui(ui);
            match self.page {
                Page::Findings => self.findings_ui(ui),
                Page::Assistant => self.assistant_ui(ui),
                Page::Settings => self.settings_ui(ui),
                Page::Audit => self.audit_ui(ui),
            }
        });
    }

    fn findings_ui(&mut self, ui: &mut egui::Ui) {
        ui.heading("Vulnerability queue");
        ui.label("Prioritize findings, record evidence, and close remediation work locally.");
        ui.add_space(10.0);

        egui::CollapsingHeader::new("Add a finding").show(ui, |ui| {
            ui.horizontal(|ui| {
                ui.label("Severity");
                egui::ComboBox::from_id_salt("new_severity")
                    .selected_text(self.new_severity.label())
                    .show_ui(ui, |ui| {
                        for severity in Severity::ALL {
                            ui.selectable_value(&mut self.new_severity, severity, severity.label());
                        }
                    });
            });
            ui.add(
                egui::TextEdit::singleline(&mut self.new_title)
                    .hint_text("Finding title")
                    .desired_width(f32::INFINITY),
            );
            ui.add(
                egui::TextEdit::multiline(&mut self.new_description)
                    .hint_text("Evidence and impact")
                    .desired_width(f32::INFINITY)
                    .desired_rows(3),
            );
            if ui.button("Add to queue").clicked() {
                if self.new_title.trim().is_empty() {
                    self.notice = Some((false, "A finding title is required".into()));
                } else {
                    let finding = Finding::new(
                        self.new_title.trim().into(),
                        self.new_description.trim().into(),
                        self.new_severity,
                    );
                    self.selected = Some(finding.id);
                    self.data.audit(
                        "finding.created",
                        format!("{} ({})", finding.title, finding.id),
                    );
                    self.data.findings.push(finding);
                    self.new_title.clear();
                    self.new_description.clear();
                    self.save();
                }
            }
        });
        ui.separator();

        ui.columns(2, |columns| {
            columns[0].set_min_width(290.0);
            columns[0].heading("Queue");
            egui::ScrollArea::vertical()
                .id_salt("finding_list")
                .show(&mut columns[0], |ui| {
                    if self.data.findings.is_empty() {
                        ui.label("No findings yet. Add one above to begin triage.");
                    }
                    for finding in &self.data.findings {
                        let selected = self.selected == Some(finding.id);
                        let label = format!(
                            "{}  {}\n{}",
                            severity_mark(finding.severity),
                            finding.title,
                            finding.status.label()
                        );
                        if ui.selectable_label(selected, label).clicked() {
                            self.selected = Some(finding.id);
                        }
                        ui.add_space(3.0);
                    }
                });

            columns[1].heading("Finding detail");
            let Some(id) = self.selected else {
                columns[1].label("Select a finding from the queue.");
                return;
            };
            let Some(index) = self
                .data
                .findings
                .iter()
                .position(|finding| finding.id == id)
            else {
                self.selected = None;
                return;
            };
            let mut changed = false;
            let mut save_requested = false;
            let mut send_to_agent = false;
            {
                let finding = &mut self.data.findings[index];
                columns[1].heading(&finding.title);
                columns[1].label(format!(
                    "{} • {} • {}",
                    finding.severity.label(),
                    finding.status.label(),
                    finding.id
                ));
                columns[1].separator();
                columns[1].label("Description / evidence");
                changed |= columns[1]
                    .add(
                        egui::TextEdit::multiline(&mut finding.description)
                            .desired_rows(5)
                            .desired_width(f32::INFINITY),
                    )
                    .changed();
                columns[1].horizontal(|ui| {
                    ui.label("CVE");
                    changed |= ui.text_edit_singleline(&mut finding.cve).changed();
                    ui.label("Asset");
                    changed |= ui.text_edit_singleline(&mut finding.asset).changed();
                });
                columns[1].horizontal(|ui| {
                    ui.label("Severity");
                    egui::ComboBox::from_id_salt("detail_severity")
                        .selected_text(finding.severity.label())
                        .show_ui(ui, |ui| {
                            for value in Severity::ALL {
                                changed |= ui
                                    .selectable_value(&mut finding.severity, value, value.label())
                                    .changed();
                            }
                        });
                    ui.label("Status");
                    egui::ComboBox::from_id_salt("detail_status")
                        .selected_text(finding.status.label())
                        .show_ui(ui, |ui| {
                            for value in FindingStatus::ALL {
                                changed |= ui
                                    .selectable_value(&mut finding.status, value, value.label())
                                    .changed();
                            }
                        });
                });
                columns[1].label("Resolution notes");
                changed |= columns[1]
                    .add(
                        egui::TextEdit::multiline(&mut finding.resolution)
                            .desired_rows(4)
                            .desired_width(f32::INFINITY),
                    )
                    .changed();
                columns[1].horizontal(|ui| {
                    if ui.button("Save changes").clicked() {
                        save_requested = true;
                    }
                    if ui.button("Send to AI triage").clicked() {
                        send_to_agent = true;
                    }
                });
                if changed {
                    finding.updated_at = Utc::now();
                }
            }
            self.finding_dirty |= changed;
            if self.finding_dirty && !save_requested {
                columns[1].label(RichText::new("Unsaved changes").color(WARNING));
            }
            if save_requested {
                self.data
                    .audit("finding.updated", format!("Finding {id} updated"));
                self.save();
                self.finding_dirty = false;
                self.notice = Some((true, "Finding saved".into()));
            }
            if send_to_agent {
                self.page = Page::Assistant;
                self.proposal = None;
            }
        });
    }

    fn assistant_ui(&mut self, ui: &mut egui::Ui) {
        ui.heading("AI triage agent");
        ui.label(
            "The agent reads only the selected finding and explicitly listed repository files.",
        );
        ui.add_space(8.0);
        let selected_title = self
            .selected
            .and_then(|id| self.data.findings.iter().find(|f| f.id == id))
            .map(|f| f.title.as_str());
        ui.label(format!(
            "Finding: {}",
            selected_title.unwrap_or("None selected")
        ));
        ui.label(format!(
            "Provider: {} • {}",
            self.data.provider.kind.label(),
            self.data.provider.model
        ));
        ui.separator();
        ui.label("Operator request");
        ui.add(
            egui::TextEdit::multiline(&mut self.agent_request)
                .desired_rows(3)
                .desired_width(f32::INFINITY),
        );
        ui.label("Context files (repository-relative, comma or newline separated, 64 KiB total)");
        ui.add(
            egui::TextEdit::multiline(&mut self.context_paths)
                .hint_text("src/auth.rs, Cargo.toml")
                .desired_rows(2)
                .desired_width(f32::INFINITY),
        );
        ui.horizontal(|ui| {
            let ready = self.selected.is_some() && self.model_receiver.is_none();
            if ui
                .add_enabled(
                    ready,
                    egui::Button::new("Analyze and propose remediation").fill(ACCENT),
                )
                .clicked()
            {
                self.start_agent(ui.ctx().clone());
            }
            if self.model_receiver.is_some() {
                ui.spinner();
                ui.label("Model is analyzing…");
            }
        });
        ui.separator();
        let Some(proposal) = self.proposal.clone() else {
            ui.label("No proposal yet. Model output is never applied automatically.");
            return;
        };
        ui.heading("Remediation proposal");
        ui.label(&proposal.summary);
        ui.label(RichText::new(format!("Residual risk: {}", proposal.risk)).color(WARNING));
        ui.add_space(6.0);
        for (index, step) in proposal.steps.iter().enumerate() {
            ui.label(format!("{}. {step}", index + 1));
        }
        if !proposal.commands.is_empty() {
            ui.collapsing("Suggested commands (review only; never executed)", |ui| {
                for command in &proposal.commands {
                    ui.monospace(format!("$ {command}"));
                }
            });
        }
        if let Some(patch) = proposal.patch.as_deref() {
            ui.collapsing("Proposed patch", |ui| {
                let mut display = patch.to_owned();
                ui.add(
                    egui::TextEdit::multiline(&mut display)
                        .font(egui::TextStyle::Monospace)
                        .desired_rows(14)
                        .desired_width(f32::INFINITY)
                        .interactive(false),
                );
            });
            ui.label(RichText::new("Applying changes the selected workspace. Review the diff and commit separately.").color(WARNING));
            if ui
                .add_enabled(
                    !self.data.workspace.trim().is_empty(),
                    egui::Button::new("Apply reviewed patch"),
                )
                .clicked()
            {
                match agent::apply_patch(&self.data.workspace, patch) {
                    Ok(()) => {
                        self.data
                            .audit("agent.patch_applied", proposal.summary.clone());
                        self.notice = Some((
                            true,
                            "Patch passed git apply --check and was applied".into(),
                        ));
                        self.save();
                    }
                    Err(error) => self.notice = Some((false, error.to_string())),
                }
            }
        }
    }

    fn start_agent(&mut self, ctx: egui::Context) {
        let Some(finding) = self
            .selected
            .and_then(|id| self.data.findings.iter().find(|f| f.id == id))
            .cloned()
        else {
            self.notice = Some((false, "Select a finding first".into()));
            return;
        };
        let prompt = match agent::build_prompt(
            &finding,
            &self.agent_request,
            &self.data.workspace,
            &self.context_paths,
        ) {
            Ok(prompt) => prompt,
            Err(error) => {
                self.notice = Some((false, error.to_string()));
                return;
            }
        };
        let config = self.data.provider.clone();
        let email = self.data.operator_email.clone().unwrap_or_default();
        let (sender, receiver) = mpsc::channel();
        self.model_receiver = Some(receiver);
        self.proposal = None;
        std::thread::spawn(move || {
            let result = (|| {
                let key = auth::model_api_key(&email).map_err(|error| error.to_string())?;
                let raw = llm::complete(&config, key.as_deref(), &prompt)
                    .map_err(|error| error.to_string())?;
                agent::parse_proposal(&raw).map_err(|error| error.to_string())
            })();
            let _ = sender.send(result);
            ctx.request_repaint();
        });
    }

    fn poll_model(&mut self) {
        let result = self
            .model_receiver
            .as_ref()
            .and_then(|receiver| receiver.try_recv().ok());
        if let Some(result) = result {
            self.model_receiver = None;
            match result {
                Ok(proposal) => {
                    self.data
                        .audit("agent.proposal_received", proposal.summary.clone());
                    self.proposal = Some(proposal);
                    self.save();
                }
                Err(error) => self.notice = Some((false, format!("Model request failed: {error}"))),
            }
        }
    }

    fn poll_auth(&mut self, ctx: &egui::Context) {
        let result = self
            .auth_receiver
            .as_ref()
            .and_then(|receiver| receiver.try_recv().ok());
        if let Some(result) = result {
            self.auth_receiver = None;
            match result {
                Ok(identity) => {
                    self.authenticated = true;
                    self.operator_role = identity.role.clone();
                    self.data.operator_email = Some(identity.email.clone());
                    self.data.audit(
                        "session.login",
                        format!(
                            "{} signed in through browser authentication (user {})",
                            identity.user, identity.user_id
                        ),
                    );
                    self.save();
                    ctx.send_viewport_cmd(egui::ViewportCommand::Focus);
                }
                Err(error) => self.notice = Some((false, error)),
            }
        }
    }

    fn settings_ui(&mut self, ui: &mut egui::Ui) {
        ui.heading("Model and workspace settings");
        ui.label("Use Ollama to keep prompts local, or configure a supported cloud endpoint.");
        ui.separator();
        ui.label("Provider");
        let old_kind = self.data.provider.kind;
        egui::ComboBox::from_id_salt("provider_kind")
            .selected_text(self.data.provider.kind.label())
            .show_ui(ui, |ui| {
                for kind in ProviderKind::ALL {
                    ui.selectable_value(&mut self.data.provider.kind, kind, kind.label());
                }
            });
        if old_kind != self.data.provider.kind {
            match self.data.provider.kind {
                ProviderKind::Ollama => {
                    self.data.provider.endpoint = "http://127.0.0.1:11434".into();
                    self.data.provider.model = "qwen2.5-coder:7b".into();
                }
                ProviderKind::OpenAiCompatible => {
                    self.data.provider.endpoint = "https://api.openai.com/v1".into();
                    self.data.provider.model.clear();
                }
                ProviderKind::Anthropic => {
                    self.data.provider.endpoint = "https://api.anthropic.com".into();
                    self.data.provider.model.clear();
                }
            }
        }
        ui.label("Endpoint");
        ui.add(
            egui::TextEdit::singleline(&mut self.data.provider.endpoint)
                .desired_width(f32::INFINITY),
        );
        ui.label("Model");
        ui.add(
            egui::TextEdit::singleline(&mut self.data.provider.model)
                .hint_text("Provider model ID")
                .desired_width(f32::INFINITY),
        );
        if self.data.provider.kind != ProviderKind::Ollama {
            ui.label("API key (stored in macOS Keychain; leave blank to keep the existing key)");
            ui.add(
                egui::TextEdit::singleline(&mut self.api_key_input)
                    .password(true)
                    .desired_width(f32::INFINITY),
            );
        }
        ui.add_space(8.0);
        ui.label("Authorized repository workspace");
        ui.add(
            egui::TextEdit::singleline(&mut self.data.workspace)
                .hint_text("/Users/you/code/project")
                .desired_width(f32::INFINITY),
        );
        ui.label(RichText::new("Cloud providers receive the finding, request, and selected context files. Secrets are never added automatically.").color(WARNING));
        if ui.button("Save settings").clicked() {
            let key_result = if self.api_key_input.is_empty() {
                Ok(())
            } else {
                auth::set_model_api_key(
                    self.data.operator_email.as_deref().unwrap_or("local"),
                    &self.api_key_input,
                )
            };
            match key_result {
                Ok(()) => {
                    self.api_key_input.clear();
                    self.data.audit(
                        "settings.updated",
                        format!("Provider set to {}", self.data.provider.kind.label()),
                    );
                    self.save();
                    self.notice = Some((true, "Settings saved".into()));
                }
                Err(error) => self.notice = Some((false, error.to_string())),
            }
        }
    }

    fn audit_ui(&mut self, ui: &mut egui::Ui) {
        ui.heading("Local audit log");
        ui.label(
            "The newest security-relevant actions appear first. Up to 500 entries are retained.",
        );
        ui.separator();
        egui::ScrollArea::vertical().show(ui, |ui| {
            for event in self.data.audit_log.iter().rev() {
                ui.horizontal_wrapped(|ui| {
                    ui.monospace(event.at.format("%Y-%m-%d %H:%M:%S UTC").to_string());
                    ui.label(RichText::new(&event.action).strong());
                    ui.label(&event.detail);
                });
                ui.separator();
            }
        });
    }

    fn notice_ui(&mut self, ui: &mut egui::Ui) {
        if let Some((success, message)) = self.notice.clone() {
            let color = if success { SUCCESS } else { DANGER };
            egui::Frame::new()
                .fill(color.gamma_multiply(0.15))
                .stroke(Stroke::new(1.0, color))
                .corner_radius(5)
                .inner_margin(8)
                .show(ui, |ui| {
                    ui.horizontal(|ui| {
                        ui.label(RichText::new(message).color(color));
                        if ui.small_button("Dismiss").clicked() {
                            self.notice = None;
                        }
                    });
                });
            ui.add_space(8.0);
        }
    }
}

impl eframe::App for DemlApp {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        self.poll_auth(ui.ctx());
        if self.authenticated {
            self.shell(ui);
        } else {
            self.login_ui(ui);
        }
    }
}

fn nav_button(ui: &mut egui::Ui, page: &mut Page, target: Page, label: &str) {
    if ui.selectable_label(*page == target, label).clicked() {
        *page = target;
    }
}

fn severity_mark(severity: Severity) -> &'static str {
    match severity {
        Severity::Critical => "● CRITICAL",
        Severity::High => "● HIGH",
        Severity::Medium => "● MEDIUM",
        Severity::Low => "● LOW",
    }
}

fn configure_theme(ctx: &egui::Context) {
    let mut visuals = egui::Visuals::dark();
    visuals.panel_fill = BACKGROUND;
    visuals.window_fill = PANEL;
    visuals.extreme_bg_color = Color32::from_rgb(10, 14, 24);
    visuals.selection.bg_fill = ACCENT.gamma_multiply(0.55);
    visuals.widgets.inactive.bg_fill = PANEL;
    visuals.widgets.inactive.weak_bg_fill = PANEL;
    visuals.widgets.inactive.bg_stroke = Stroke::new(1.0, BORDER);
    visuals.widgets.hovered.bg_fill = Color32::from_rgb(31, 45, 62);
    ctx.set_visuals(visuals);
}

const BACKGROUND: Color32 = Color32::from_rgb(7, 12, 20);
const PANEL: Color32 = Color32::from_rgb(17, 25, 36);
const BORDER: Color32 = Color32::from_rgb(48, 62, 78);
const ACCENT: Color32 = Color32::from_rgb(40, 170, 190);
const MUTED: Color32 = Color32::from_rgb(145, 157, 170);
const WARNING: Color32 = Color32::from_rgb(232, 177, 72);
const DANGER: Color32 = Color32::from_rgb(239, 93, 101);
const SUCCESS: Color32 = Color32::from_rgb(71, 191, 139);
