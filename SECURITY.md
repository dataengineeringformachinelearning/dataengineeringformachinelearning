# Security Policy

## Supported Versions

We currently support the following versions of this project with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please report it immediately. We take all security issues seriously and will respond promptly.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please send an email directly to the project maintainers or use the private vulnerability reporting feature on GitHub if enabled for this repository.

Please include the following information in your report:

- A description of the vulnerability.
- Steps to reproduce the issue.
- Any potential impact or risk associated with the vulnerability.

We will acknowledge receipt of your vulnerability report as soon as possible and strive to provide regular updates on the progress of our investigation and mitigation efforts.

## Post-Quantum Cryptography (PQC) & Lattice Security

As part of our forward-looking security posture, we are actively evaluating and preparing for the transition to Post-Quantum Cryptography (PQC). Quantum computers pose a theoretical threat to current public-key cryptography (such as RSA and ECC). To mitigate this, we are planning the integration of **Lattice-based cryptography**, which is recognized by NIST as the standard for quantum-resistant algorithms:

- **ML-KEM (formerly CRYSTALS-Kyber):** For quantum-secure key encapsulation and exchange.
- **ML-DSA (formerly CRYSTALS-Dilithium):** For quantum-secure digital signatures.

### Current Implementation Status

- **Google Cloud KMS:** We monitor and intend to enable GCP's Post-Quantum KMS keys as they become generally available for our infrastructure.
- **Application Layer:** We are evaluating libraries such as `liboqs-python` to implement hybrid key exchange (combining classical ECC with lattice-based ML-KEM) in our data pipelines to ensure long-term confidentiality of data transmitted today (Harvest Now, Decrypt Later attacks).

If you are interested in contributing to our PQC transition, please reach out to the maintainers.
