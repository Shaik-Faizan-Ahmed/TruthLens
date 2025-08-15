"""
Request models for TruthLens API
Pydantic models for validating incoming requests
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from enum import Enum

class ContentType(str, Enum):
    """Supported content types for analysis"""
    TEXT = "text"
    URL = "url"
    IMAGE_TEXT = "image_text"  # OCR extracted text
    VIDEO_TRANSCRIPT = "video_transcript"

class Language(str, Enum):
    """Supported languages"""
    ENGLISH = "en"
    HINDI = "hi"
    TELUGU = "te"
    TAMIL = "ta"
    BENGALI = "bn"

class ContentAnalysisRequest(BaseModel):
    """Request model for content analysis"""
    
    content: str = Field(
        ..., 
        min_length=5,
        max_length=10000,
        description="Content to analyze for misinformation"
    )
    
    content_type: ContentType = Field(
        default=ContentType.TEXT,
        description="Type of content being analyzed"
    )
    
    language: Language = Field(
        default=Language.ENGLISH,
        description="Language of the content"
    )
    
    source_app: Optional[str] = Field(
        default=None,
        description="Source application (WhatsApp, Facebook, etc.)"
    )
    
    user_context: Optional[dict] = Field(
        default=None,
        description="Additional user context for better analysis"
    )
    
    @validator('content')
    def validate_content(cls, v):
        """Validate content is not empty and has meaningful text"""
        if not v or v.strip() == "":
            raise ValueError("Content cannot be empty")
        
        # Remove excessive whitespace
        cleaned = ' '.join(v.split())
        if len(cleaned) < 5:
            raise ValueError("Content too short after cleaning")
            
        return cleaned
    
    @validator('source_app')
    def validate_source_app(cls, v):
        """Validate source app if provided"""
        if v:
            allowed_apps = [
                'whatsapp', 'facebook', 'instagram', 'twitter', 'telegram',
                'youtube', 'gmail', 'chrome', 'firefox', 'other'
            ]
            if v.lower() not in allowed_apps:
                return 'other'  # Default to other if not recognized
        return v

class BulkAnalysisRequest(BaseModel):
    """Request model for analyzing multiple contents at once"""
    
    contents: List[ContentAnalysisRequest] = Field(
        ...,
        min_items=1,
        max_items=10,
        description="List of contents to analyze (max 10)"
    )
    
    priority: Optional[str] = Field(
        default="normal",
        description="Processing priority (low, normal, high)"
    )

class FeedbackRequest(BaseModel):
    """Request model for user feedback on analysis results"""
    
    content_hash: str = Field(
        ...,
        description="Hash of the analyzed content"
    )
    
    was_accurate: bool = Field(
        ...,
        description="Whether the analysis was accurate"
    )
    
    user_rating: int = Field(
        ...,
        ge=1,
        le=5,
        description="User rating from 1-5"
    )
    
    comments: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional user comments"
    )

class ReportContentRequest(BaseModel):
    """Request model for reporting new misinformation"""
    
    content: str = Field(
        ...,
        min_length=10,
        max_length=5000,
        description="Misinformation content to report"
    )
    
    category: str = Field(
        ...,
        description="Category of misinformation"
    )
    
    source: Optional[str] = Field(
        default=None,
        description="Where this misinformation was found"
    )
    
    evidence: Optional[str] = Field(
        default=None,
        description="Evidence that this is misinformation"
    )