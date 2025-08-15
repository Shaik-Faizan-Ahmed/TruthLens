"""
TruthLens Backend API
Main FastAPI application entry point
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from datetime import datetime

from app.services.analysis_service import AnalysisService
from app.models.request_models import ContentAnalysisRequest
from app.models.response_models import AnalysisResult

# Initialize FastAPI app
app = FastAPI(
    title="TruthLens API",
    description="AI-powered misinformation detection and awareness tool",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware for React Native and browser extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
analysis_service = AnalysisService()

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "TruthLens API is running",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "analyze": "/analyze - POST - Analyze content for misinformation",
            "health": "/health - GET - Health check",
            "patterns": "/patterns - GET - Get detection patterns",
            "docs": "/docs - GET - API documentation"
        }
    }

@app.post("/analyze", response_model=AnalysisResult)
async def analyze_content(request: ContentAnalysisRequest):
    """
    Analyze content for misinformation and scams
    
    Args:
        request: ContentAnalysisRequest with content and metadata
        
    Returns:
        AnalysisResult with detection results and recommendations
    """
    try:
        if not request.content or len(request.content.strip()) < 5:
            raise HTTPException(
                status_code=400, 
                detail="Content too short to analyze (minimum 5 characters)"
            )
        
        # Analyze content using service
        result = await analysis_service.analyze_content(request)
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "TruthLens API"
    }

@app.get("/patterns")
async def get_patterns():
    """Get list of all detection patterns for debugging"""
    patterns = analysis_service.get_detection_patterns()
    return {
        "scam_patterns": patterns["scam_patterns"],
        "suspicious_domains": patterns["suspicious_domains"],
        "trusted_domains": patterns["trusted_domains"],
        "total_patterns": len(patterns["scam_patterns"])
    }

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "message": "Endpoint not found",
            "available_endpoints": ["/", "/analyze", "/health", "/patterns", "/docs"]
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable auto-reload during development
        log_level="info"
    )