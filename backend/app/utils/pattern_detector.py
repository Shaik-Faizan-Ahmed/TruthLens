"""
Pattern Detector for TruthLens
Detects various scam and misinformation patterns in text
"""
import re
from typing import Dict, List, Any, Tuple

class PatternDetector:
    """Detects scam and misinformation patterns in text content"""
    
    def __init__(self):
        self.scam_patterns = self._load_scam_patterns()
        self.detection_weights = self._load_detection_weights()
    
    def _load_scam_patterns(self) -> Dict[str, Dict[str, Any]]:
        """Load all scam detection patterns"""
        
        return {
            "otp_scam": {
                "keywords": [
                    "otp", "one time password", "verification code", "share otp",
                    "urgent", "expire", "blocked account", "verify account",
                    "security code", "pin code", "confirm otp"
                ],
                "patterns": [
                    r"otp.*share",
                    r"verification.*code.*immediate",
                    r"urgent.*otp",
                    r"account.*blocked.*otp",
                    r"share.*\d{4,6}.*code",
                    r"otp.*expire.*\d+.*minutes"
                ],
                "explanation": "This looks like an OTP scam. Never share OTP codes with anyone, including bank officials.",
                "risk": "danger",
                "confidence_boost": 0.3
            },
            
            "investment_scam": {
                "keywords": [
                    "double money", "guaranteed return", "investment opportunity",
                    "quick money", "earn lakhs", "profit guaranteed", "risk free",
                    "trading", "forex", "cryptocurrency", "stock tip"
                ],
                "patterns": [
                    r"double.*money.*\d+.*days",
                    r"guaranteed.*\d+%.*return",
                    r"earn.*lakhs.*month",
                    r"risk.*free.*investment",
                    r"profit.*guaranteed.*\d+%",
                    r"trading.*guaranteed.*profit"
                ],
                "explanation": "This appears to be an investment scam. Genuine investments never guarantee high returns.",
                "risk": "danger",
                "confidence_boost": 0.25
            },
            
            "lottery_scam": {
                "keywords": [
                    "congratulations", "lottery", "winner", "claim prize",
                    "lucky draw", "jackpot", "won prize", "selected winner",
                    "lottery ticket", "prize money", "claim reward"
                ],
                "patterns": [
                    r"congratulations.*winner",
                    r"lottery.*claim.*prize",
                    r"lucky.*draw.*won",
                    r"selected.*winner.*lottery",
                    r"won.*prize.*\d+.*lakhs?",
                    r"claim.*prize.*immediately"
                ],
                "explanation": "This looks like a lottery scam. You cannot win a lottery you never entered.",
                "risk": "danger",
                "confidence_boost": 0.3
            },
            
            "fake_news": {
                "keywords": [
                    "breaking news", "shocking truth", "doctors hate this",
                    "secret revealed", "must share", "viral video", "exposed",
                    "conspiracy", "hidden truth", "they don't want you to know"
                ],
                "patterns": [
                    r"doctors.*hate.*this",
                    r"shocking.*truth.*revealed",
                    r"secret.*\w+.*exposed",
                    r"breaking.*news.*viral",
                    r"must.*share.*everyone",
                    r"they.*don't.*want.*you.*know"
                ],
                "explanation": "This content uses clickbait language often found in fake news.",
                "risk": "caution",
                "confidence_boost": 0.2
            },
            
            "medical_misinformation": {
                "keywords": [
                    "cure cancer", "miracle cure", "instant relief", "ancient secret",
                    "doctors don't want", "natural remedy", "home remedy cures",
                    "pharmaceutical conspiracy", "big pharma", "hidden cure"
                ],
                "patterns": [
                    r"cure.*cancer.*\d+.*days",
                    r"miracle.*cure.*disease",
                    r"doctors.*don't.*want",
                    r"ancient.*secret.*cure",
                    r"natural.*remedy.*cures.*\w+",
                    r"home.*remedy.*instant.*relief"
                ],
                "explanation": "Be careful of medical claims without scientific evidence. Consult real doctors.",
                "risk": "danger",
                "confidence_boost": 0.25
            },
            
            "phishing": {
                "keywords": [
                    "account blocked", "verify account", "click link", "login immediately",
                    "suspend account", "update details", "confirm identity",
                    "security alert", "unusual activity", "verify now"
                ],
                "patterns": [
                    r"account.*blocked.*verify",
                    r"click.*link.*immediately",
                    r"account.*suspend.*urgent",
                    r"verify.*account.*\d+.*hours",
                    r"unusual.*activity.*verify",
                    r"security.*alert.*click.*here"
                ],
                "explanation": "This looks like a phishing attempt to steal your login credentials.",
                "risk": "danger",
                "confidence_boost": 0.3
            },
            
            "romance_scam": {
                "keywords": [
                    "love you", "lonely", "widowed", "military officer", "overseas",
                    "send money", "emergency fund", "stuck abroad", "customs fee",
                    "travel money", "visa fee"
                ],
                "patterns": [
                    r"love.*you.*send.*money",
                    r"military.*officer.*overseas",
                    r"stuck.*abroad.*need.*money",
                    r"customs.*fee.*urgent",
                    r"widowed.*lonely.*money",
                    r"emergency.*fund.*help"
                ],
                "explanation": "This appears to be a romance scam. Be cautious of online relationships requesting money.",
                "risk": "danger",
                "confidence_boost": 0.25
            },
            
            "job_scam": {
                "keywords": [
                    "work from home", "easy money", "part time job", "registration fee",
                    "earning opportunity", "no experience needed", "high salary",
                    "join immediately", "limited seats", "advance payment"
                ],
                "patterns": [
                    r"work.*from.*home.*\d+.*per.*day",
                    r"registration.*fee.*job",
                    r"advance.*payment.*job",
                    r"easy.*money.*part.*time",
                    r"high.*salary.*no.*experience",
                    r"limited.*seats.*join.*immediately"
                ],
                "explanation": "This looks like a job scam. Legitimate employers don't ask for upfront payments.",
                "risk": "danger",
                "confidence_boost": 0.25
            },
            
            "emergency_scam": {
                "keywords": [
                    "urgent help", "family emergency", "accident", "hospital",
                    "bail money", "police station", "immediate help", "critical condition",
                    "surgery needed", "ransom"
                ],
                "patterns": [
                    r"urgent.*help.*money",
                    r"family.*emergency.*send",
                    r"accident.*hospital.*money",
                    r"bail.*money.*urgent",
                    r"critical.*condition.*fund",
                    r"surgery.*needed.*immediately"
                ],
                "explanation": "This may be an emergency scam. Always verify directly with family members.",
                "risk": "danger",
                "confidence_boost": 0.3
            }
        }
    
    def _load_detection_weights(self) -> Dict[str, float]:
        """Load weights for different detection methods"""
        return {
            "keyword_match": 0.3,
            "pattern_match": 0.5,
            "context_match": 0.2
        }
    
    def detect_scam_patterns(self, content: str) -> Dict[str, Any]:
        """
        Detect scam patterns in content
        
        Args:
            content: Text content to analyze
            
        Returns:
            Dictionary with detection results
        """
        content_lower = content.lower()
        detected_patterns = []
        pattern_details = {}
        explanations = []
        highest_risk = "safe"
        total_confidence = 0.0
        
        for pattern_name, pattern_data in self.scam_patterns.items():
            detection_result = self._analyze_pattern(content_lower, pattern_name, pattern_data)
            
            if detection_result["detected"]:
                detected_patterns.append(pattern_name)
                pattern_details[pattern_name] = detection_result
                explanations.append(pattern_data["explanation"])
                
                # Update risk level
                pattern_risk = pattern_data["risk"]
                if pattern_risk == "danger":
                    highest_risk = "danger"
                elif pattern_risk == "caution" and highest_risk != "danger":
                    highest_risk = "caution"
                
                # Add to confidence
                total_confidence += detection_result["confidence"]
        
        # Calculate overall confidence
        if detected_patterns:
            overall_confidence = min(1.0, total_confidence / len(detected_patterns))
        else:
            overall_confidence = 0.9 if highest_risk == "safe" else 0.1
        
        return {
            "detected_patterns": detected_patterns,
            "pattern_details": pattern_details,
            "explanations": explanations,
            "risk_level": highest_risk,
            "confidence": overall_confidence
        }
    
    def _analyze_pattern(self, content: str, pattern_name: str, pattern_data: Dict) -> Dict[str, Any]:
        """Analyze a specific pattern against content"""
        
        # Count keyword matches
        keyword_matches = 0
        matched_keywords = []
        for keyword in pattern_data["keywords"]:
            if keyword in content:
                keyword_matches += 1
                matched_keywords.append(keyword)
        
        # Count pattern matches
        pattern_matches = 0
        matched_patterns = []
        for pattern in pattern_data["patterns"]:
            if re.search(pattern, content, re.IGNORECASE):
                pattern_matches += 1
                matched_patterns.append(pattern)
        
        # Calculate detection score
        keyword_score = (keyword_matches / len(pattern_data["keywords"])) * self.detection_weights["keyword_match"]
        pattern_score = (pattern_matches / len(pattern_data["patterns"])) * self.detection_weights["pattern_match"]
        
        total_score = keyword_score + pattern_score
        
        # Apply confidence boost
        if total_score > 0:
            total_score += pattern_data.get("confidence_boost", 0)
        
        # Determine if pattern is detected (threshold: 0.2)
        detected = total_score >= 0.2
        
        return {
            "detected": detected,
            "confidence": min(1.0, total_score),
            "keyword_matches": keyword_matches,
            "pattern_matches": pattern_matches,
            "matched_keywords": matched_keywords,
            "matched_patterns": matched_patterns,
            "score_breakdown": {
                "keyword_score": keyword_score,
                "pattern_score": pattern_score,
                "total_score": total_score
            }
        }
    
    def get_pattern_names(self) -> List[str]:
        """Get list of all available pattern names"""
        return list(self.scam_patterns.keys())
    
    def get_pattern_details(self, pattern_name: str) -> Dict[str, Any]:
        """Get details of a specific pattern"""
        return self.scam_patterns.get(pattern_name, {})
    
    def add_custom_pattern(self, name: str, pattern_data: Dict[str, Any]) -> bool:
        """
        Add a custom detection pattern
        
        Args:
            name: Pattern name
            pattern_data: Pattern configuration
            
        Returns:
            True if added successfully
        """
        try:
            # Validate pattern data structure
            required_keys = ["keywords", "patterns", "explanation", "risk"]
            if not all(key in pattern_data for key in required_keys):
                return False
            
            self.scam_patterns[name] = pattern_data
            return True
        except Exception:
            return False
    
    def update_pattern_weights(self, new_weights: Dict[str, float]) -> bool:
        """Update detection weights"""
        try:
            self.detection_weights.update(new_weights)
            return True
        except Exception:
            return False