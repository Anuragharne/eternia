"""Custom application exception hierarchy matching API error contracts."""

from typing import Any, Dict, Optional


class AppError(Exception):
    """Base application exception."""

    def __init__(
        self,
        code: str,
        message: str,
        status: int = 400,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.code = code
        self.message = message
        self.status = status
        self.details = details or {}
        super().__init__(self.message)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Missing or invalid authentication token."):
        super().__init__(code="UNAUTHORIZED", message=message, status=401)


class ForbiddenError(AppError):
    def __init__(self, message: str = "You do not have permission to access this resource."):
        super().__init__(code="FORBIDDEN", message=message, status=403)


class AvatarNotFoundError(AppError):
    def __init__(self, avatar_id: str):
        super().__init__(
            code="AVATAR_NOT_FOUND",
            message="No avatar found with the given ID.",
            status=404,
            details={"avatar_id": avatar_id},
        )


class MemoryNotFoundError(AppError):
    def __init__(self, memory_id: str):
        super().__init__(
            code="MEMORY_NOT_FOUND",
            message="No memory found with the given ID.",
            status=404,
            details={"memory_id": memory_id},
        )


class ConsentRequiredError(AppError):
    def __init__(self, avatar_id: str):
        super().__init__(
            code="CONSENT_REQUIRED",
            message="This avatar requires verified consent before interacting.",
            status=403,
            details={"avatar_id": avatar_id},
        )


class ConsentRevokedError(AppError):
    def __init__(self, avatar_id: str):
        super().__init__(
            code="CONSENT_REVOKED",
            message="Consent has been revoked for this avatar. Interaction is disabled.",
            status=403,
            details={"avatar_id": avatar_id},
        )


class CoolingPeriodError(AppError):
    def __init__(self, ends_at: str):
        super().__init__(
            code="COOLING_PERIOD",
            message="This memorial avatar is in a 72-hour reflective cooling period.",
            status=403,
            details={"cooling_period_ends": ends_at},
        )


class MemoryLimitError(AppError):
    def __init__(self, limit: int = 50):
        super().__init__(
            code="MEMORY_LIMIT",
            message=f"Free plan limit of {limit} memories reached. Upgrade to add more memories.",
            status=403,
            details={"limit": limit},
        )


class RateLimitError(AppError):
    def __init__(self, retry_after: int = 60):
        super().__init__(
            code="RATE_LIMITED",
            message="Too many requests. Please slow down and take a gentle pause.",
            status=429,
            details={"retry_after_seconds": retry_after},
        )
