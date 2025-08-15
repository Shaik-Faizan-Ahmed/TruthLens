"""
URL Analyzer for TruthLens
Analyzes URLs for suspicious domains and patterns
"""
import re
import urllib.parse
from typing import Dict, List, Any, Optional

class URLAnalyzer:
    """Analyzes URLs for security threats and credibility"""
    
    def __init__(self):
        self.suspicious_domains = self._load_suspicious_domains()
        self.trusted_domains = self._load_trusted_domains()
        self.url_patterns = self._load_url_patterns()
    
    def _load_suspicious_domains(self) -> Dict[str, List[str]]:
        """Load categorized suspicious domains"""
        
        return {
            "high_risk": [
                # URL shorteners often used in scams
                "bit.ly", "tinyurl.com", "ow.ly", "t.co", "goo.gl",
                "tiny.cc", "is.gd", "buff.ly", "bitly.com", "short.link",
                
                # Suspicious TLDs
                ".tk", ".ml", ".ga", ".cf", 
                
                # Known scam domains (examples - would be expanded)
                "free-money.com", "win-lottery.net", "claim-prize.org"
            ],
            
            "medium_risk": [
                # Free hosting platforms
                "blogspot.com", "wordpress.com", "wix.com", "weebly.com",
                "sites.google.com", "github.io", "netlify.app",
                
                # Social media domains (context dependent)
                "facebook.com/groups", "telegram.me", "whatsapp.com/channel"
            ],
            
            "url_shorteners": [
                "bit.ly", "tinyurl.com", "ow.ly", "t.co", "goo.gl",
                "tiny.cc", "is.gd", "buff.ly", "short.link", "tiny.one"
            ],
            
            "free_hosting": [
                "blogspot.com", "wordpress.com", "wix.com", "weebly.com",
                "sites.google.com", "github.io", "netlify.app", "herokuapp.com"
            ]
        }
    
    def _load_trusted_domains(self) -> Dict[str, List[str]]:
        """Load categorized trusted domains"""
        
        return {
            "news_media": [
                # International news
                "bbc.com", "reuters.com", "cnn.com", "nytimes.com",
                "theguardian.com", "washingtonpost.com",
                
                # Indian news
                "thehindu.com", "indianexpress.com", "ndtv.com", 
                "hindustantimes.com", "timesofindia.com", "news18.com",
                "aajtak.in", "zeenews.india.com"
            ],
            
            "government": [
                # Indian government
                "gov.in", "nic.in", "india.gov.in", "mygov.in",
                "rbi.org.in", "sebi.gov.in", "eci.gov.in",
                
                # International government
                "gov.uk", "gov.au", "canada.ca", "usa.gov"
            ],
            
            "medical": [
                # Medical authorities
                "who.int", "mohfw.gov.in", "cdc.gov", "nih.gov",
                "mayoclinic.org", "webmd.com", "healthline.com",
                "nhs.uk", "aiims.edu"
            ],
            
            "financial": [
                # Banks and financial institutions
                "sbi.co.in", "hdfcbank.com", "icicibank.com",
                "axisbank.com", "kotakbank.com", "rbi.org.in",
                "nseindia.com", "bseindia.com"
            ],
            
            "education": [
                # Educational institutions
                "edu", "ac.in", "edu.in", "mit.edu", "stanford.edu",
                "harvard.edu", "iit.ac.in", "iisc.ac.in"
            ],
            
            "technology": [
                # Major tech companies
                "google.com", "microsoft.com", "apple.com",
                "amazon.com", "facebook.com", "twitter.com",
                "linkedin.com", "github.com"
            ]
        }
    
    def _load_url_patterns(self) -> Dict[str, Dict[str, Any]]:
        """Load suspicious URL patterns"""
        
        return {
            "phishing_patterns": {
                "patterns": [
                    r".*-login\..*",  # fake login pages
                    r".*verify-account\..*",  # account verification scams
                    r".*secure-update\..*",  # security update scams
                    r".*banking-alert\..*",  # banking scams
                    r".*prize-claim\..*",  # lottery/prize scams
                ],
                "risk": "danger",
                "explanation": "URL contains patterns commonly used in phishing attacks"
            },
            
            "suspicious_subdomains": {
                "patterns": [
                    r".*\.secure\..*",
                    r".*\.verify\..*",
                    r".*\.update\..*",
                    r".*\.alert\..*",
                    r".*\.urgent\..*"
                ],
                "risk": "caution",
                "explanation": "URL uses suspicious subdomain patterns"
            },
            
            "ip_addresses": {
                "patterns": [
                    r"https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}"
                ],
                "risk": "caution",
                "explanation": "URL uses IP address instead of domain name"
            },
            
            "excessive_subdomains": {
                "patterns": [
                    r"https?://\w+\.\w+\.\w+\.\w+\.\w+\."
                ],
                "risk": "caution",
                "explanation": "URL has excessive subdomains which may indicate deception"
            }
        }
    
    def analyze_urls(self, content: str) -> Dict[str, Any]:
        """
        Analyze all URLs found in content
        
        Args:
            content: Text content to analyze for URLs
            
        Returns:
            Dictionary with URL analysis results
        """
        urls = self._extract_urls(content)
        
        if not urls:
            return {
                "suspicious_urls": [],
                "trusted_urls": [],
                "analysis_details": {},
                "risk_level": "safe",
                "confidence": 0.9
            }
        
        suspicious_urls = []
        trusted_urls = []
        analysis_details = {}
        highest_risk = "safe"
        total_confidence = 0.0
        
        for url in urls:
            url_analysis = self._analyze_single_url(url)
            
            if url_analysis["is_suspicious"]:
                suspicious_urls.append(url_analysis)
                
                # Update risk level
                if url_analysis["risk_level"] == "danger":
                    highest_risk = "danger"
                elif url_analysis["risk_level"] == "caution" and highest_risk != "danger":
                    highest_risk = "caution"
            
            elif url_analysis["is_trusted"]:
                trusted_urls.append(url_analysis)
            
            analysis_details[url] = url_analysis
            total_confidence += url_analysis["confidence"]
        
        # Calculate overall confidence
        overall_confidence = total_confidence / len(urls) if urls else 0.9
        
        return {
            "suspicious_urls": suspicious_urls,
            "trusted_urls": trusted_urls,
            "analysis_details": analysis_details,
            "risk_level": highest_risk,
            "confidence": min(1.0, overall_confidence),
            "total_urls": len(urls),
            "suspicious_count": len(suspicious_urls),
            "trusted_count": len(trusted_urls)
        }
    
    def _extract_urls(self, content: str) -> List[str]:
        """Extract all URLs from content"""
        
        # Comprehensive URL regex pattern
        url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        
        urls = re.findall(url_pattern, content)
        
        # Also look for www. patterns without http
        www_pattern = r'www\.(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        www_urls = re.findall(www_pattern, content)
        
        # Add http:// prefix to www URLs
        www_urls = [f"http://{url}" for url in www_urls]
        
        # Combine and deduplicate
        all_urls = list(set(urls + www_urls))
        
        return all_urls
    
    def _analyze_single_url(self, url: str) -> Dict[str, Any]:
        """
        Analyze a single URL for security and credibility
        
        Args:
            url: URL to analyze
            
        Returns:
            Dictionary with analysis results
        """
        try:
            parsed_url = urllib.parse.urlparse(url)
            domain = parsed_url.netloc.lower()
            
            analysis = {
                "url": url,
                "domain": domain,
                "is_suspicious": False,
                "is_trusted": False,
                "risk_level": "safe",
                "confidence": 0.7,
                "reasons": [],
                "category": "unknown"
            }
            
            # Check against trusted domains
            trust_result = self._check_trusted_domains(domain)
            if trust_result["is_trusted"]:
                analysis.update({
                    "is_trusted": True,
                    "category": trust_result["category"],
                    "confidence": 0.9,
                    "reasons": [f"Domain is a trusted {trust_result['category']} source"]
                })
                return analysis
            
            # Check against suspicious domains
            suspicious_result = self._check_suspicious_domains(domain)
            if suspicious_result["is_suspicious"]:
                analysis.update({
                    "is_suspicious": True,
                    "risk_level": suspicious_result["risk_level"],
                    "category": suspicious_result["category"],
                    "confidence": 0.8,
                    "reasons": suspicious_result["reasons"]
                })
                return analysis
            
            # Check URL patterns
            pattern_result = self._check_url_patterns(url)
            if pattern_result["is_suspicious"]:
                analysis.update({
                    "is_suspicious": True,
                    "risk_level": pattern_result["risk_level"],
                    "confidence": 0.7,
                    "reasons": pattern_result["reasons"]
                })
                return analysis
            
            # Additional checks
            additional_checks = self._perform_additional_checks(parsed_url)
            if additional_checks["is_suspicious"]:
                analysis.update(additional_checks)
            
            return analysis
            
        except Exception as e:
            return {
                "url": url,
                "domain": "unknown",
                "is_suspicious": True,
                "is_trusted": False,
                "risk_level": "caution",
                "confidence": 0.3,
                "reasons": [f"Failed to parse URL: {str(e)}"],
                "category": "malformed"
            }
    
    def _check_trusted_domains(self, domain: str) -> Dict[str, Any]:
        """Check if domain is in trusted lists"""
        
        for category, domains in self.trusted_domains.items():
            for trusted_domain in domains:
                if trusted_domain in domain or domain.endswith(trusted_domain):
                    return {
                        "is_trusted": True,
                        "category": category,
                        "matched_domain": trusted_domain
                    }
        
        return {"is_trusted": False}
    
    def _check_suspicious_domains(self, domain: str) -> Dict[str, Any]:
        """Check if domain is in suspicious lists"""
        
        for category, domains in self.suspicious_domains.items():
            for suspicious_domain in domains:
                if suspicious_domain in domain or domain.endswith(suspicious_domain):
                    risk_level = "danger" if category == "high_risk" else "caution"
                    
                    reason_map = {
                        "high_risk": "Domain is known to be used in scams",
                        "medium_risk": "Domain is on free hosting platform",
                        "url_shorteners": "URL shortener often used to hide real destination",
                        "free_hosting": "Free hosting platform may host unreliable content"
                    }
                    
                    return {
                        "is_suspicious": True,
                        "risk_level": risk_level,
                        "category": category,
                        "matched_domain": suspicious_domain,
                        "reasons": [reason_map.get(category, "Domain flagged as suspicious")]
                    }
        
        return {"is_suspicious": False}
    
    def _check_url_patterns(self, url: str) -> Dict[str, Any]:
        """Check URL against suspicious patterns"""
        
        for pattern_name, pattern_data in self.url_patterns.items():
            for pattern in pattern_data["patterns"]:
                if re.search(pattern, url, re.IGNORECASE):
                    return {
                        "is_suspicious": True,
                        "risk_level": pattern_data["risk"],
                        "reasons": [pattern_data["explanation"]],
                        "matched_pattern": pattern_name
                    }
        
        return {"is_suspicious": False}
    
    def _perform_additional_checks(self, parsed_url) -> Dict[str, Any]:
        """Perform additional security checks on URL"""
        
        domain = parsed_url.netloc.lower()
        path = parsed_url.path.lower()
        
        reasons = []
        risk_level = "safe"
        is_suspicious = False
        
        # Check for suspicious path elements
        suspicious_paths = ["login", "verify", "update", "secure", "account", "banking"]
        if any(suspicious in path for suspicious in suspicious_paths):
            reasons.append("URL path contains suspicious elements")
            risk_level = "caution"
            is_suspicious = True
        
        # Check for excessive hyphens in domain (often used to impersonate)
        if domain.count("-") > 3:
            reasons.append("Domain contains excessive hyphens")
            risk_level = "caution"
            is_suspicious = True
        
        # Check for numbers in suspicious contexts
        if re.search(r"\d{4,}", domain):  # 4+ consecutive digits in domain
            reasons.append("Domain contains suspicious number patterns")
            risk_level = "caution"
            is_suspicious = True
        
        # Check for homograph attacks (basic)
        suspicious_chars = ["0", "1", "o", "i"]
        if len([char for char in domain if char in suspicious_chars]) > 2:
            reasons.append("Domain may use confusing characters")
            risk_level = "caution"
            is_suspicious = True
        
        return {
            "is_suspicious": is_suspicious,
            "risk_level": risk_level,
            "reasons": reasons,
            "confidence": 0.6 if is_suspicious else 0.8
        }
    
    def get_suspicious_domains(self) -> Dict[str, List[str]]:
        """Get all suspicious domain lists"""
        return self.suspicious_domains
    
    def get_trusted_domains(self) -> Dict[str, List[str]]:
        """Get all trusted domain lists"""
        return self.trusted_domains
    
    def add_suspicious_domain(self, domain: str, category: str = "high_risk") -> bool:
        """Add a domain to suspicious list"""
        try:
            if category in self.suspicious_domains:
                self.suspicious_domains[category].append(domain.lower())
                return True
            return False
        except Exception:
            return False
    
    def add_trusted_domain(self, domain: str, category: str = "other") -> bool:
        """Add a domain to trusted list"""
        try:
            if category not in self.trusted_domains:
                self.trusted_domains[category] = []
            self.trusted_domains[category].append(domain.lower())
            return True
        except Exception:
            return False
    
    def is_url_shortener(self, url: str) -> bool:
        """Check if URL is from a known URL shortener"""
        try:
            parsed_url = urllib.parse.urlparse(url)
            domain = parsed_url.netloc.lower()
            
            return any(
                shortener in domain 
                for shortener in self.suspicious_domains["url_shorteners"]
            )
        except Exception:
            return False
    
    def get_domain_category(self, url: str) -> Optional[str]:
        """Get the category of a domain (trusted, suspicious, or unknown)"""
        try:
            parsed_url = urllib.parse.urlparse(url)
            domain = parsed_url.netloc.lower()
            
            # Check trusted domains
            for category, domains in self.trusted_domains.items():
                if any(trusted in domain for trusted in domains):
                    return f"trusted_{category}"
            
            # Check suspicious domains
            for category, domains in self.suspicious_domains.items():
                if any(suspicious in domain for suspicious in domains):
                    return f"suspicious_{category}"
            
            return "unknown"
            
        except Exception:
            return "malformed"