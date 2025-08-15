"""
Analysis Service for TruthLens
Core business logic for misinformation and scam detection
"""
import re
import time
import urllib.parse
from typing import Dict, List, Tuple, Any
from datetime import datetime

from ..models.request_models import ContentAnalysisRequest
from ..models.response_models import AnalysisResult, RiskLevel, DetectionConfidence
from ..utils.pattern_detector import PatternDetector
from ..utils.url_analyzer import URLAnalyzer
from ..utils.text_processor import TextProcessor

class AnalysisService:
    """Service for analyzing content and detecting misinformation"""
    
    def __init__(self):
        self.pattern_detector = PatternDetector()
        self.url_analyzer = URLAnalyzer()
        self.text_processor = TextProcessor()
        
        # Performance tracking
        self.total_analyses = 0
        self.start_time = time.time()
    
    async def analyze_content(self, request: ContentAnalysisRequest) -> AnalysisResult:
        """
        Analyze content for misinformation and scams
        
        Args:
            request: ContentAnalysisRequest with content and metadata
            
        Returns:
            AnalysisResult with detection results and recommendations
        """
        start_time = time.time()
        
        # Preprocess content
        processed_content = self.text_processor.preprocess_text(request.content)
        
        # Run parallel analyses
        scam_result = self.pattern_detector.detect_scam_patterns(processed_content)
        url_result = self.url_analyzer.analyze_urls(processed_content)
        
        # Combine results
        combined_result = self._combine_analysis_results(
            scam_result, 
            url_result, 
            request
        )
        
        # Add processing metadata
        processing_time = (time.time() - start_time) * 1000
        combined_result.processing_time_ms = processing_time
        
        # Update statistics
        self.total_analyses += 1
        
        return combined_result
    
    def _combine_analysis_results(
        self, 
        scam_result: Dict, 
        url_result: Dict,
        request: ContentAnalysisRequest
    ) -> AnalysisResult:
        """Combine results from different analyzers"""
        
        # Determine overall risk level
        risk_level = self._calculate_risk_level(scam_result, url_result)
        
        # Calculate confidence
        confidence = self._calculate_confidence(scam_result, url_result, risk_level)
        confidence_level = self._get_confidence_level(confidence)
        
        # Combine detected patterns
        detected_patterns = scam_result.get("detected_patterns", [])
        if url_result.get("suspicious_urls"):
            detected_patterns.append("suspicious_urls")
        
        # Generate explanations
        explanation = self._generate_explanation(scam_result, url_result, risk_level)
        detailed_explanation = self._generate_detailed_explanation(scam_result, url_result)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(detected_patterns, risk_level)
        action_items = self._generate_action_items(detected_patterns, risk_level)
        
        # Generate educational content
        educational_tips = self._generate_educational_tips(detected_patterns)
        
        # Create UI indicators
        ui_indicators = self._create_ui_indicators(risk_level, confidence)
        
        # Combine pattern details
        pattern_details = {
            "scam_patterns": scam_result.get("pattern_details", {}),
            "url_analysis": url_result.get("analysis_details", {})
        }
        
        return AnalysisResult(
            is_suspicious=risk_level in [RiskLevel.CAUTION, RiskLevel.DANGER],
            risk_level=risk_level,
            confidence=confidence,
            confidence_level=confidence_level,
            explanation=explanation,
            detailed_explanation=detailed_explanation,
            detected_patterns=detected_patterns,
            pattern_details=pattern_details,
            recommendations=recommendations,
            action_items=action_items,
            educational_tips=educational_tips,
            ui_indicators=ui_indicators
        )
    
    def _calculate_risk_level(self, scam_result: Dict, url_result: Dict) -> RiskLevel:
        """Calculate overall risk level from all analyses"""
        
        scam_risk = scam_result.get("risk_level", "safe")
        url_risk = url_result.get("risk_level", "safe")
        
        # Priority: danger > caution > safe
        if scam_risk == "danger" or url_risk == "danger":
            return RiskLevel.DANGER
        elif scam_risk == "caution" or url_risk == "caution":
            return RiskLevel.CAUTION
        else:
            return RiskLevel.SAFE
    
    def _calculate_confidence(
        self, 
        scam_result: Dict, 
        url_result: Dict, 
        risk_level: RiskLevel
    ) -> float:
        """Calculate confidence score based on detection strength"""
        
        base_confidence = 0.5
        
        # Add confidence from scam detection
        scam_confidence = scam_result.get("confidence", 0.0)
        url_confidence = url_result.get("confidence", 0.0)
        
        # Weight the confidences
        combined_confidence = (scam_confidence * 0.7) + (url_confidence * 0.3)
        
        # Adjust based on risk level
        if risk_level == RiskLevel.DANGER:
            combined_confidence = max(combined_confidence, 0.7)
        elif risk_level == RiskLevel.CAUTION:
            combined_confidence = max(combined_confidence, 0.5)
        else:
            combined_confidence = max(combined_confidence, 0.8)  # High confidence in safe content
        
        return min(1.0, combined_confidence)
    
    def _get_confidence_level(self, confidence: float) -> DetectionConfidence:
        """Convert confidence score to confidence level"""
        if confidence >= 0.7:
            return DetectionConfidence.HIGH
        elif confidence >= 0.4:
            return DetectionConfidence.MEDIUM
        else:
            return DetectionConfidence.LOW
    
    def _generate_explanation(
        self, 
        scam_result: Dict, 
        url_result: Dict, 
        risk_level: RiskLevel
    ) -> str:
        """Generate simple explanation for users"""
        
        explanations = []
        
        # Add scam explanations
        scam_explanations = scam_result.get("explanations", [])
        explanations.extend(scam_explanations)
        
        # Add URL explanations
        if url_result.get("suspicious_urls"):
            explanations.append("This content contains suspicious links that may be harmful.")
        
        # Default explanations
        if not explanations:
            if risk_level == RiskLevel.SAFE:
                return "This content appears to be safe. No suspicious patterns were detected."
            else:
                return "This content may need verification. Please be cautious."
        
        return " ".join(explanations[:2])  # Limit to 2 explanations for simplicity
    
    def _generate_detailed_explanation(self, scam_result: Dict, url_result: Dict) -> str:
        """Generate detailed technical explanation"""
        
        details = []
        
        # Add pattern detection details
        patterns = scam_result.get("detected_patterns", [])
        if patterns:
            details.append(f"Detected patterns: {', '.join(patterns)}")
        
        # Add URL analysis details
        suspicious_urls = url_result.get("suspicious_urls", [])
        if suspicious_urls:
            details.append(f"Found {len(suspicious_urls)} suspicious URLs")
        
        return ". ".join(details) if details else None
    
    def _generate_recommendations(self, patterns: List[str], risk_level: RiskLevel) -> List[str]:
        """Generate safety recommendations"""
        
        recommendations = []
        
        if risk_level == RiskLevel.DANGER:
            recommendations.extend([
                "❌ Do not take any action mentioned in this message",
                "🚫 Do not share personal information, OTP codes, or passwords",
                "📞 Verify information through official channels",
                "👥 Ask a trusted family member or friend for advice"
            ])
        elif risk_level == RiskLevel.CAUTION:
            recommendations.extend([
                "⚠️ Verify this information from reliable sources",
                "🔍 Check official websites or trusted news sources",
                "🤔 Be skeptical of sensational or urgent claims"
            ])
        else:
            recommendations.extend([
                "✅ This content appears to be safe",
                "📚 Continue learning about digital safety"
            ])
        
        # Add pattern-specific recommendations
        if "otp_scam" in patterns:
            recommendations.append("🔐 Remember: Banks NEVER ask for OTP over phone/message")
        
        if "investment_scam" in patterns:
            recommendations.append("💰 Consult certified financial advisors for investments")
        
        if "medical_misinformation" in patterns:
            recommendations.append("👨‍⚕️ Always consult qualified doctors for medical advice")
        
        return recommendations[:4]  # Limit to 4 recommendations
    
    def _generate_action_items(self, patterns: List[str], risk_level: RiskLevel) -> List[str]:
        """Generate specific action items"""
        
        actions = []
        
        if risk_level == RiskLevel.DANGER:
            actions.extend([
                "Stop: Do not proceed with any requests in this message",
                "Verify: Contact the organization directly using official numbers",
                "Report: Report this content to relevant authorities"
            ])
        elif risk_level == RiskLevel.CAUTION:
            actions.extend([
                "Pause: Don't act immediately on this information",
                "Research: Look for reliable sources that confirm this",
                "Discuss: Talk to knowledgeable people about this"
            ])
        
        return actions[:3]  # Limit to 3 actions
    
    def _generate_educational_tips(self, patterns: List[str]) -> List[str]:
        """Generate educational tips based on detected patterns"""
        
        tips = []
        
        if "otp_scam" in patterns:
            tips.append("OTP (One-Time Password) codes are meant to be used only by you. Never share them with anyone, even if they claim to be from your bank.")
        
        if "investment_scam" in patterns:
            tips.append("Legitimate investments carry risk and never guarantee returns. Be suspicious of 'get rich quick' schemes.")
        
        if "phishing" in patterns:
            tips.append("Always verify requests for personal information by contacting the organization directly through official channels.")
        
        return tips[:2]  # Limit to 2 tips
    
    def _create_ui_indicators(self, risk_level: RiskLevel, confidence: float) -> Dict[str, Any]:
        """Create UI indicators for frontend"""
        
        indicators = {
            "color": "green",
            "icon": "✅",
            "urgency": "low"
        }
        
        if risk_level == RiskLevel.DANGER:
            indicators.update({
                "color": "red",
                "icon": "🚨",
                "urgency": "high"
            })
        elif risk_level == RiskLevel.CAUTION:
            indicators.update({
                "color": "yellow",
                "icon": "⚠️",
                "urgency": "medium"
            })
        
        indicators["confidence_bar"] = int(confidence * 100)
        
        return indicators
    
    def get_detection_patterns(self) -> Dict[str, Any]:
        """Get all detection patterns for debugging/monitoring"""
        
        return {
            "scam_patterns": self.pattern_detector.get_pattern_names(),
            "suspicious_domains": self.url_analyzer.get_suspicious_domains(),
            "trusted_domains": self.url_analyzer.get_trusted_domains()
        }
    
    def get_service_stats(self) -> Dict[str, Any]:
        """Get service statistics"""
        
        uptime = time.time() - self.start_time
        
        return {
            "total_analyses": self.total_analyses,
            "uptime_seconds": uptime,
            "average_processing_time": "Not implemented yet",
            "service_health": "healthy"
        }