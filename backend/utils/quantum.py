import base64
import logging

# Attempt to import liboqs, but allow fallback if not installed yet.
try:
  import oqs

  OQS_AVAILABLE = True
except ImportError:
  OQS_AVAILABLE = False
  logging.warning(
    "liboqs-python is not installed or liboqs C library is missing. Quantum features disabled."
  )

# Recommended NIST PQC KEM standard
DEFAULT_KEM_ALGORITHM = "Kyber768"


class PostQuantumKEM:
  """
  A utility class to handle Post-Quantum Key Encapsulation Mechanisms (KEMs)
  using the liboqs-python wrapper.
  """

  def __init__(self, alg_name: str = DEFAULT_KEM_ALGORITHM):
    self.alg_name = alg_name
    self._check_availability()

  def _check_availability(self):
    if not OQS_AVAILABLE:
      raise RuntimeError("liboqs is not available on this system.")
    if self.alg_name not in oqs.get_enabled_KEM_mechanisms():
      raise ValueError(f"Algorithm {self.alg_name} is not enabled in liboqs.")

  def generate_keypair(self) -> tuple[str, str]:
    """
    Generate a post-quantum public/secret keypair.
    Returns:
        Tuple[str, str]: Base64 encoded public key and secret key.
    """
    with oqs.KeyEncapsulation(self.alg_name) as kem:
      public_key = kem.generate_keypair()
      secret_key = kem.export_secret_key()
      return (
        base64.b64encode(public_key).decode("utf-8"),
        base64.b64encode(secret_key).decode("utf-8"),
      )

  def encapsulate_secret(self, public_key_b64: str) -> tuple[str, str]:
    """
    Given a peer's public key, generate a shared secret and a ciphertext
    encapsulating that secret.
    Returns:
        Tuple[str, str]: Base64 encoded ciphertext and shared secret.
    """
    public_key = base64.b64decode(public_key_b64)
    with oqs.KeyEncapsulation(self.alg_name) as kem:
      ciphertext, shared_secret = kem.encap_secret(public_key)
      return (
        base64.b64encode(ciphertext).decode("utf-8"),
        base64.b64encode(shared_secret).decode("utf-8"),
      )

  def decapsulate_secret(self, ciphertext_b64: str, secret_key_b64: str) -> str:
    """
    Given an encapsulated ciphertext and our secret key, recover the shared secret.
    Returns:
        str: Base64 encoded shared secret.
    """
    ciphertext = base64.b64decode(ciphertext_b64)
    secret_key = base64.b64decode(secret_key_b64)
    with oqs.KeyEncapsulation(self.alg_name, secret_key) as kem:
      shared_secret = kem.decap_secret(ciphertext)
      return base64.b64encode(shared_secret).decode("utf-8")
