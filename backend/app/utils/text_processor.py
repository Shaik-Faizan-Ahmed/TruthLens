"""
Text Processor for TruthLens
Handles text preprocessing and normalization
"""
import re
import string
from typing import Dict, List, Any, Optional

class TextProcessor:
    """Processes and normalizes text content for analysis"""
    
    def __init__(self):
        self.stop_words = self._load_stop_words()
        self.common_replacements = self._load_common_replacements()
        self.sensitive_patterns = self._load_sensitive_patterns()
    
    def _load_stop_words(self) -> set:
        """Load common stop words that can be ignored in analysis"""
        return {
            # English stop words
            "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
            "he", "in", "is", "it", "its", "of", "on", "that", "the", "to", "was",
            "will", "with", "you", "your", "yours", "have", "had", "this", "these",
            "they", "them", "their", "we", "us", "our", "me", "my", "i", "am",
            
            # Hindi common words (transliterated)
            "aur", "hai", "hain", "ka", "ki", "ke", "ko", "se", "me", "par", "ya",
            "jo", "kya", "koi", "sab", "kuch", "yah", "vah", "woh", "iske", "uske"
        }
    
    def _load_common_replacements(self) -> Dict[str, str]:
        """Load common text replacements for normalization"""
        return {
            # Number replacements
            "1st": "first", "2nd": "second", "3rd": "third",
            "u": "you", "ur": "your", "pls": "please", "plz": "please",
            
            # Common abbreviations
            "otp": "one time password", "atm": "automated teller machine",
            "sms": "text message", "app": "application",
            
            # Common misspellings in scams
            "recieve": "receive", "beleive": "believe", "seperate": "separate",
            "occured": "occurred", "begining": "beginning",
            
            # Leetspeak replacements
            "3": "e", "4": "for", "7": "t", "0": "o", "1": "i", "5": "s",
            
            # Currency symbols
            "₹": "rupees", "$": "dollars", "€": "euros", "£": "pounds"
        }
    
    def _load_sensitive_patterns(self) -> Dict[str, str]:
        """Load patterns for detecting and masking sensitive information"""
        return {
            "otp_codes": r'\b\d{4,6}\b',  # 4-6 digit codes
            "phone_numbers": r'\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
            "account_numbers": r'\b\d{8,16}\b',  # 8-16 digit account numbers
            "credit_card": r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
            "email_addresses": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            "urls": r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        }
    
    def preprocess_text(self, text: str, mask_sensitive: bool = True) -> str:
        """
        Preprocess text for analysis
        
        Args:
            text: Raw text to process
            mask_sensitive: Whether to mask sensitive information
            
        Returns:
            Processed and normalized text
        """
        if not text or not isinstance(text, str):
            return ""
        
        # Step 1: Basic cleaning
        processed_text = self._basic_cleaning(text)
        
        # Step 2: Mask sensitive information if requested
        if mask_sensitive:
            processed_text = self._mask_sensitive_info(processed_text)
        
        # Step 3: Normalize text
        processed_text = self._normalize_text(processed_text)
        
        # Step 4: Apply replacements
        processed_text = self._apply_replacements(processed_text)
        
        return processed_text
    
    def _basic_cleaning(self, text: str) -> str:
        """Perform basic text cleaning"""
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove leading/trailing whitespace
        text = text.strip()
        
        # Remove excessive punctuation (3 or more consecutive)
        text = re.sub(r'([!?.]){3,}', r'\1\1', text)
        
        # Normalize quotes
        text = text.replace('"', '"').replace('"', '"')
        text = text.replace(''', "'").replace(''', "'")
        
        return text
    
    def _mask_sensitive_info(self, text: str) -> str:
        """Mask sensitive information in text"""
        
        masked_text = text
        
        # Mask OTP codes
        masked_text = re.sub(
            self.sensitive_patterns["otp_codes"], 
            "[OTP_CODE]", 
            masked_text
        )
        
        # Mask phone numbers
        masked_text = re.sub(
            self.sensitive_patterns["phone_numbers"], 
            "[PHONE_NUMBER]", 
            masked_text
        )
        
        # Mask account numbers
        masked_text = re.sub(
            self.sensitive_patterns["account_numbers"], 
            "[ACCOUNT_NUMBER]", 
            masked_text
        )
        
        # Mask credit card numbers
        masked_text = re.sub(
            self.sensitive_patterns["credit_card"], 
            "[CREDIT_CARD]", 
            masked_text
        )
        
        # Mask email addresses (partially)
        def mask_email(match):
            email = match.group(0)
            parts = email.split('@')
            if len(parts) == 2:
                username = parts[0][:2] + "*" * (len(parts[0]) - 2) + parts[0][-1:] if len(parts[0]) > 3 else parts[0]
                return f"{username}@{parts[1]}"
            return "[EMAIL]"
        
        masked_text = re.sub(
            self.sensitive_patterns["email_addresses"], 
            mask_email, 
            masked_text
        )
        
        return masked_text
    
    def _normalize_text(self, text: str) -> str:
        """Normalize text format and case"""
        
        # Convert to lowercase for analysis (but preserve original for display)
        normalized = text.lower()
        
        # Remove extra punctuation for analysis
        normalized = re.sub(r'[^\w\s.,!?-]', ' ', normalized)
        
        # Normalize multiple punctuation
        normalized = re.sub(r'([.,!?])+', r'\1', normalized)
        
        return normalized
    
    def _apply_replacements(self, text: str) -> str:
        """Apply common word replacements"""
        
        words = text.split()
        replaced_words = []
        
        for word in words:
            # Remove punctuation for replacement lookup
            clean_word = word.strip(string.punctuation)
            
            # Check for replacement
            if clean_word in self.common_replacements:
                # Preserve punctuation
                punctuation = ''.join([char for char in word if char in string.punctuation])
                replaced_word = self.common_replacements[clean_word] + punctuation
                replaced_words.append(replaced_word)
            else:
                replaced_words.append(word)
        
        return ' '.join(replaced_words)
    
    def extract_keywords(self, text: str) -> List[str]:
        """
        Extract important keywords from text
        
        Args:
            text: Text to extract keywords from
            
        Returns:
            List of important keywords
        """
        # Preprocess text
        processed = self.preprocess_text(text, mask_sensitive=False)
        
        # Split into words
        words = processed.split()
        
        # Filter out stop words and short words
        keywords = [
            word.strip(string.punctuation) 
            for word in words 
            if len(word) > 2 and word.lower() not in self.stop_words
        ]
        
        # Remove duplicates while preserving order
        unique_keywords = []
        seen = set()
        for keyword in keywords:
            if keyword.lower() not in seen:
                unique_keywords.append(keyword)
                seen.add(keyword.lower())
        
        return unique_keywords[:20]  # Return top 20 keywords
    
    def calculate_text_stats(self, text: str) -> Dict[str, Any]:
        """
        Calculate various text statistics
        
        Args:
            text: Text to analyze
            
        Returns:
            Dictionary with text statistics
        """
        if not text:
            return {}
        
        # Basic stats
        char_count = len(text)
        word_count = len(text.split())
        sentence_count = len(re.split(r'[.!?]+', text))
        
        # Advanced stats
        avg_word_length = sum(len(word.strip(string.punctuation)) for word in text.split()) / max(word_count, 1)
        uppercase_ratio = sum(1 for char in text if char.isupper()) / max(char_count, 1)
        punctuation_ratio = sum(1 for char in text if char in string.punctuation) / max(char_count, 1)
        
        # Suspicious patterns
        has_excessive_caps = uppercase_ratio > 0.3
        has_excessive_punctuation = punctuation_ratio > 0.1
        has_numbers = bool(re.search(r'\d', text))
        has_urls = bool(re.search(self.sensitive_patterns["urls"], text))
        
        return {
            "char_count": char_count,
            "word_count": word_count,
            "sentence_count": max(sentence_count, 1),
            "avg_word_length": round(avg_word_length, 2),
            "uppercase_ratio": round(uppercase_ratio, 3),
            "punctuation_ratio": round(punctuation_ratio, 3),
            "has_excessive_caps": has_excessive_caps,
            "has_excessive_punctuation": has_excessive_punctuation,
            "has_numbers": has_numbers,
            "has_urls": has_urls,
            "readability_score": self._calculate_readability_score(text)
        }
    
    def _calculate_readability_score(self, text: str) -> float:
        """
        Calculate a simple readability score (0-1, higher is more readable)
        
        Args:
            text: Text to analyze
            
        Returns:
            Readability score between 0 and 1
        """
        if not text:
            return 0.0
        
        stats = {
            "words": len(text.split()),
            "sentences": max(len(re.split(r'[.!?]+', text)), 1),
            "chars": len(text)
        }
        
        # Simple readability metrics
        avg_sentence_length = stats["words"] / stats["sentences"]
        avg_word_length = stats["chars"] / max(stats["words"], 1)
        
        # Normalize scores (ideal ranges: 15-20 words per sentence, 4-6 chars per word)
        sentence_score = max(0, 1 - abs(avg_sentence_length - 17.5) / 17.5)
        word_score = max(0, 1 - abs(avg_word_length - 5) / 5)
        
        # Combined readability score
        readability = (sentence_score + word_score) / 2
        
        return round(readability, 3)
    
    def detect_language(self, text: str) -> str:
        """
        Simple language detection (basic implementation)
        
        Args:
            text: Text to analyze
            
        Returns:
            Detected language code
        """
        if not text:
            return "unknown"
        
        # Hindi/Devanagari script detection
        hindi_pattern = r'[\u0900-\u097F]'
        if re.search(hindi_pattern, text):
            return "hi"
        
        # Telugu script detection
        telugu_pattern = r'[\u0C00-\u0C7F]'
        if re.search(telugu_pattern, text):
            return "te"
        
        # Tamil script detection
        tamil_pattern = r'[\u0B80-\u0BFF]'
        if re.search(tamil_pattern, text):
            return "ta"
        
        # Default to English for Latin script
        return "en"
    
    def clean_for_display(self, text: str) -> str:
        """
        Clean text for safe display (remove potentially harmful content)
        
        Args:
            text: Text to clean
            
        Returns:
            Cleaned text safe for display
        """
        if not text:
            return ""
        
        # Remove potential script injections
        cleaned = re.sub(r'<script.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
        cleaned = re.sub(r'javascript:', '', cleaned, flags=re.IGNORECASE)
        
        # Limit length for display
        if len(cleaned) > 500:
            cleaned = cleaned[:500] + "..."
        
        return cleaned