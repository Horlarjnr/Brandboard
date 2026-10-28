import secrets
import string


def generate_project_code(prefix: str = "BB") -> str:
    alphabet = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(alphabet) for _ in range(6))
    return f"{prefix}-{suffix}"


def generate_owner_token() -> str:
    return secrets.token_urlsafe(32)
