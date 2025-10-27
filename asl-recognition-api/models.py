from __future__ import annotations
from datetime import datetime
from typing import Optional, Any

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.sqlite import JSON as SQLITE_JSON

# SQLAlchemy database instance (initialized in app)
db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(nullable=False)
    role: Mapped[str] = mapped_column(default="user")  # 'user' | 'admin'
    active: Mapped[bool] = mapped_column(default=True)
    blocked: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    last_activity_at: Mapped[Optional[datetime]] = mapped_column(default=None, nullable=True)

    predictions: Mapped[list["PredictionLog"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "active": self.active,
            "blocked": self.blocked,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_activity_at": self.last_activity_at.isoformat() if self.last_activity_at else None,
        }


class PredictionLog(db.Model):
    __tablename__ = "prediction_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(db.ForeignKey("users.id"), nullable=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(default=datetime.utcnow, index=True)
    label: Mapped[Optional[str]] = mapped_column(nullable=True, index=True)
    confidence: Mapped[Optional[float]] = mapped_column(nullable=True, index=True)
    latency_ms: Mapped[Optional[float]] = mapped_column(nullable=True)
    success: Mapped[bool] = mapped_column(default=True, index=True)
    error_message: Mapped[Optional[str]] = mapped_column(nullable=True)
    client_ip: Mapped[Optional[str]] = mapped_column(nullable=True)
    top_predictions: Mapped[Optional[dict]] = mapped_column(SQLITE_JSON, nullable=True)

    user: Mapped[Optional[User]] = relationship(back_populates="predictions")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "timestamp": self.timestamp.isoformat(),
            "label": self.label,
            "confidence": self.confidence,
            "latency_ms": self.latency_ms,
            "success": self.success,
            "error_message": self.error_message,
            "client_ip": self.client_ip,
            "top_predictions": self.top_predictions,
        }


def get_summary_stats() -> dict[str, Any]:
    """Aggregate stats for dashboard."""
    total_predictions = db.session.query(func.count(PredictionLog.id)).scalar() or 0
    avg_confidence = db.session.query(func.avg(PredictionLog.confidence)).filter(PredictionLog.success.is_(True)).scalar()
    avg_latency = db.session.query(func.avg(PredictionLog.latency_ms)).scalar()

    users_count = db.session.query(func.count(User.id)).scalar() or 0

    # Active sessions: last activity within 15 minutes
    fifteen_min_ago = datetime.utcnow().timestamp() - 15 * 60
    # We can't do timestamp arithmetic directly; compute in Python
    cutoff_dt = datetime.utcfromtimestamp(fifteen_min_ago)
    active_sessions = (
        db.session.query(func.count(User.id))
        .filter(User.last_activity_at.isnot(None))
        .filter(User.last_activity_at > cutoff_dt)
        .scalar()
        or 0
    )

    return {
        "total_predictions": int(total_predictions),
        "average_confidence": float(avg_confidence) if avg_confidence is not None else None,
        "average_latency_ms": float(avg_latency) if avg_latency is not None else None,
        "active_sessions": int(active_sessions),
        "users_count": int(users_count),
    }
