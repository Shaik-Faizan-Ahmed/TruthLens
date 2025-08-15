"""
Response models for TruthLens API
Pydantic models for API responses
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class RiskLevel(str, Enum):
    """Risk levels for content analysis"""
    SAFE = "safe"         # 🟢 Green - Content appears safe
    CAUTION = "caution"   # 🟡 Yellow - Be careful, verify before acting
    DANGER = "danger"     # 🔴 Red - Likely misinformation or scam

class DetectionConfidence(str, Enum):
    """Confidence levels for detection"""
    LOW = "low"           # 0.0 - 0.4
    MEDIUM = "medium"     # 0.4 - 0.7
    HIGH = "high"         # 0.7 - 1.0

class AnalysisResult(BaseModel):
    """Main response model for content analysis"""
    
    # Core Results
    is_suspicious: bool = Field(
        ...,
        description="Whether content is suspicious"
    )
    
    risk_level: RiskLevel = Field(
        ...,
        description="Risk level: safe, caution, or danger"
    )
    
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score (0.0 to 1.0)"
    )
    
    confidence_level: DetectionConfidence = Field(
        ...,
        description="Confidence level category"
    )
    
    # Explanations
    explanation: str = Field(
        ...,
        description="Simple explanation of why content is flagged"
    )
    
    detailed_explanation: Optional[str] = Field(
        default=None,
        description="More detailed technical explanation"
    )
    
    # Detection Details
    detected_patterns: List[str] = Field(
        default=[],
        description="List of detected scam/misinformation patterns"
    )
    
    pattern_details: Dict[str, Any] = Field(
        default={},
        description="Detailed information about detected patterns"
    )
    
    # Recommendations
    recommendations: List[str] = Field(
        default=[],
        description="Safety recommendations for the user"
    )
    
    action_items: List[str] = Field(
        default=[],
        description="Specific actions user should take"
    )
    
    # Educational Content
    educational_tips: List[str] = Field(
        default=[],
        description="Educational tips about digital safety"
    )
    
    # Sources and Evidence
    fact_check_sources: List[Dict[str, str]] = Field(
        default=[],
        description="Relevant fact-checking sources"
    )
    
    # Metadata
    analysis_timestamp: str = Field(
        default_factory=lambda: datetime.now().isoformat(),
        description="Timestamp when analysis was performed"
    )
    
    processing_time_ms: Optional[float] = Field(
        default=None,
        description="Time taken to process request in milliseconds"
    )
    
    # Visual Indicators for UI
    ui_indicators: Dict[str, Any] = Field(
        default_factory=lambda: {},
        description="UI-specific indicators (colors, icons, etc.)"
    )

class BulkAnalysisResult(BaseModel):
    """Response model for bulk analysis"""
    
    results: List[AnalysisResult] = Field(
        ...,
        description="List of analysis results"
    )
    
    summary: Dict[str, Any] = Field(
        ...,
        description="Summary statistics of the bulk analysis"
    )
    
    total_processed: int = Field(
        ...,
        description="Total number of contents processed"
    )
    
    processing_time_ms: float = Field(
        ...,
        description="Total processing time"
    )

class HealthCheckResponse(BaseModel):
    """Response model for health check"""
    
    status: str = Field(
        ...,
        description="Service status"
    )
    
    timestamp: str = Field(
        ...,
        description="Current timestamp"
    )
    
    version: str = Field(
        default="1.0.0",
        description="API version"
    )
    
    uptime_seconds: Optional[float] = Field(
        default=None,
        description="Service uptime in seconds"
    )

class PatternResponse(BaseModel):
    """Response model for detection patterns"""
    
    scam_patterns: List[str] = Field(
        ...,
        description="List of available scam patterns"
    )
    
    pattern_details: Dict[str, Dict[str, Any]] = Field(
        ...,
        description="Detailed information about each pattern"
    )
    
    suspicious_domains: Dict[str, List[str]] = Field(
        ...,
        description="Categorized suspicious domains"
    )
    
    trusted_domains: Dict[str, List[str]] = Field(
        ...,
        description="Categorized trusted domains"
    )
    
    total_patterns: int = Field(
        ...,
        description="Total number of detection patterns"
    )
    
    last_updated: str = Field(
        default_factory=lambda: datetime.now().isoformat(),
        description="When patterns were last updated"
    )

class ErrorResponse(BaseModel):
    """Standard error response model"""
    
    error: str = Field(
        ...,
        description="Error message"
    )
    
    error_code: Optional[str] = Field(
        default=None,
        description="Specific error code"
    )
    
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional error details"
    )
    
    timestamp: str = Field(
        default_factory=lambda: datetime.now().isoformat(),
        description="Error timestamp"
    )
    
    request_id: Optional[str] = Field(
        default=None,
        description="Request ID for tracking"
    )