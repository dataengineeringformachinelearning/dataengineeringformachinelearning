# Security policy

## Reporting

Report suspected vulnerabilities privately to the maintainers. Do not open
public issues with exploit PoCs, credentials, or sealed plaintext.

## Control-plane / data-plane boundary

| Surface                       | Rule                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| Firebase / `deml_` tokens     | Terminate at Django — never forward to FORJD                                          |
| FORJD calls                   | Tenant-bound `fjsvc_` only; secret refs in DB, never plaintext in browser             |
| Pipeline Studio (`/pipeline`) | Compose/export YAML only — no browser persist; deploy on FORJD + `validate:workflows` |
| Ciphertext                    | Sealed envelopes only on the wire to FORJD                                            |

Contract: [`docs/FORJD_INTEGRATION.md`](docs/FORJD_INTEGRATION.md).
FORJD invariants: FORJD [`SECURITY.md`](https://github.com/dataengineeringformachinelearning/forjd/blob/main/SECURITY.md)
· [`docs/EXTENDING.md`](https://github.com/dataengineeringformachinelearning/forjd/blob/main/docs/EXTENDING.md).

## Automated gates

- Theme / a11y / mobile-first: `node scripts/enforce-theme.js`, `run_axe.js`, `check_mobile_first.js`
- Pre-commit + CI Semgrep / Trivy / gitleaks (see `AGENTS.md` quality gates)
- Frontend tests include Pipeline compose helpers (`workflow-yaml.spec.ts`)
