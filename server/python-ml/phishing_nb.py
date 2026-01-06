"""
Enhanced URL Phishing Detector with Feature Engineering

Uses multiple features extracted from URLs combined with TF-IDF character n-grams
and a Naive Bayes classifier for robust phishing detection.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import List, Dict, Any
from urllib.parse import urlparse

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support


MODEL_PATH = os.environ.get("PHISHING_MODEL_PATH", os.path.join(os.path.dirname(__file__), "phishing_nb_model.joblib"))

# Suspicious keywords commonly found in phishing URLs
SUSPICIOUS_KEYWORDS = [
    'verify', 'account', 'update', 'confirm', 'login', 'secure', 'banking',
    'alert', 'suspended', 'locked', 'urgent', 'click', 'free', 'prize', 'winner',
    'claim', 'gift', 'bonus', 'offer', 'password', 'security', 'warning', 'limited',
    'expire', 'refund', 'tax', 'relief', 'customer', 'support', 'help', 'service'
]

# Trusted domains (legitimate sites)
TRUSTED_DOMAINS = [
    'google.com', 'facebook.com', 'youtube.com', 'amazon.in', 'amazon.com', 
    'flipkart.com', 'myntra.com', 'instagram.com', 'twitter.com', 'linkedin.com',
    'wikipedia.org', 'github.com', 'microsoft.com', 'apple.com', 'netflix.com',
    'reddit.com', 'stackoverflow.com', 'bbc.com', 'cnn.com', 'nytimes.com',
    'snapdeal.com', 'ajio.com', 'nykaa.com', 'zomato.com', 'swiggy.com',
    'paytm.com', 'phonepe.com', 'makemytrip.com', 'bookmyshow.com',
    'hdfc.com', 'icicibank.com', 'sbi.co.in', 'axisbank.com'
]


def _normalize_url(url: str) -> str:
    """Basic normalization: lowercase, strip scheme and www., remove trailing slash."""
    if not isinstance(url, str):
        return ""
    u = url.strip().lower()
    u = re.sub(r"^https?://", "", u)
    u = re.sub(r"^www\.", "", u)
    if len(u) > 1 and u.endswith("/"):
        u = u[:-1]
    return u


def extract_url_features(url: str) -> Dict[str, float]:
    """
    Extract multiple features from URL for better phishing detection
    
    Features include:
    - URL length
    - Number of dots, hyphens, underscores, digits
    - Use of suspicious keywords
    - Domain characteristics (subdomain count, TLD)
    - Use of IP address
    - Special character ratios
    """
    features = {}
    
    # Basic length features
    features['url_length'] = len(url)
    
    # Character count features
    features['dot_count'] = url.count('.')
    features['hyphen_count'] = url.count('-')
    features['underscore_count'] = url.count('_')
    features['digit_count'] = sum(c.isdigit() for c in url)
    features['at_count'] = url.count('@')
    features['slash_count'] = url.count('/')
    features['question_count'] = url.count('?')
    features['equals_count'] = url.count('=')
    features['ampersand_count'] = url.count('&')
    
    # Suspicious keywords
    url_lower = url.lower()
    features['suspicious_keyword_count'] = sum(1 for keyword in SUSPICIOUS_KEYWORDS if keyword in url_lower)
    
    # Domain features
    try:
        parsed = urlparse(url if url.startswith(('http://', 'https://')) else 'http://' + url)
        domain = parsed.netloc or parsed.path.split('/')[0]
        
        # Check if domain is in trusted list
        features['is_trusted_domain'] = 1 if any(trusted in domain for trusted in TRUSTED_DOMAINS) else 0
        
        # Subdomain count
        domain_parts = domain.split('.')
        features['subdomain_count'] = max(0, len(domain_parts) - 2)
        
        # Check for IP address
        features['has_ip_address'] = 1 if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', domain) else 0
        
        # Domain length
        features['domain_length'] = len(domain)
        
        # Path length
        features['path_length'] = len(parsed.path)
        
        # Has port
        features['has_port'] = 1 if ':' in domain and not domain.startswith('[') else 0
        
    except Exception:
        # If parsing fails, set default values
        features['is_trusted_domain'] = 0
        features['subdomain_count'] = 0
        features['has_ip_address'] = 0
        features['domain_length'] = 0
        features['path_length'] = 0
        features['has_port'] = 0
    
    # Entropy of URL (measure of randomness)
    from collections import Counter
    if len(url) > 0:
        freq = Counter(url)
        prob = [float(freq[c]) / len(url) for c in freq]
        features['entropy'] = -sum(p * np.log2(p) for p in prob)
    else:
        features['entropy'] = 0
    
    # Special character ratio
    special_chars = sum(1 for c in url if not c.isalnum())
    features['special_char_ratio'] = special_chars / len(url) if len(url) > 0 else 0
    
    # Check for common homograph attacks (0 for o, 1 for l, etc.)
    features['has_digit_letter_substitution'] = 1 if re.search(r'[a-z]0|[a-z]1|0[a-z]|1[a-z]', url_lower) else 0
    
    # HTTPS usage (more secure)
    features['uses_https'] = 1 if url.startswith('https://') else 0
    
    return features


@dataclass
class URLPhishingModel:
    pipeline: Pipeline = field(default=None)
    is_trained: bool = field(default=False)
    classes_: List[str] = field(default_factory=lambda: ["legit", "phish"])  # label names
    feature_names: List[str] = field(default_factory=list)

    def _create_pipeline(self) -> Pipeline:
        # Character n-grams capture URL structure well
        # Using a simpler approach - just character TF-IDF + features
        vectorizer = TfidfVectorizer(
            analyzer="char",
            ngram_range=(2, 5),
            min_df=1,
            max_features=3000,
            lowercase=True
        )
        clf = MultinomialNB(alpha=0.1)
        return Pipeline([
            ("tfidf", vectorizer),
            ("nb", clf),
        ])

    def initialize(self) -> Dict[str, Any]:
        if os.path.exists(MODEL_PATH):
            try:
                saved_data = joblib.load(MODEL_PATH)
                self.pipeline = saved_data.get('pipeline')
                self.feature_names = saved_data.get('feature_names', [])
                self.is_trained = True
                return {"success": True, "message": f"Loaded model from {MODEL_PATH}"}
            except Exception as exc:
                # Fall back to fresh pipeline
                self.pipeline = self._create_pipeline()
                self.is_trained = False
                return {"success": False, "message": f"Failed to load model: {exc}. Initialized new pipeline."}
        else:
            self.pipeline = self._create_pipeline()
            self.is_trained = False
            return {"success": True, "message": "Initialized new pipeline (no saved model found)"}

    def train(self, samples: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Train the model.
        samples: list of { url: str, label: 'phish'|'legit'|1|0|True|False }
        """
        if not samples or not isinstance(samples, list):
            return {"success": False, "error": "No training samples provided"}

        urls: List[str] = []
        labels: List[str] = []
        for item in samples:
            url = str(item.get("url", ""))
            if not url:
                continue
            label_raw = item.get("label")
            # Normalize labels to 'phish' or 'legit'
            label = None
            if isinstance(label_raw, str):
                lr = label_raw.strip().lower()
                if lr in ("phish", "phishing", "malicious", "suspicious"):
                    label = "phish"
                elif lr in ("legit", "benign", "safe", "clean"):
                    label = "legit"
            elif isinstance(label_raw, (int, bool)):
                label = "phish" if bool(label_raw) else "legit"

            if label is None:
                continue

            urls.append(url)
            labels.append(label)

        if len(urls) < 2 or len(set(labels)) < 2:
            return {"success": False, "error": "Need at least 2 samples and both classes to train"}

        if self.pipeline is None:
            self.pipeline = self._create_pipeline()

        # Train the model
        self.pipeline.fit(urls, labels)
        self.is_trained = True

        # Calculate training accuracy
        train_pred = self.pipeline.predict(urls)
        train_accuracy = accuracy_score(labels, train_pred)

        # Persist model
        try:
            saved_data = {
                'pipeline': self.pipeline,
                'feature_names': []
            }
            joblib.dump(saved_data, MODEL_PATH)
            saved = True
        except Exception as exc:
            saved = False
            return {
                "success": True, 
                "message": "Trained in-memory (save failed)", 
                "saved": saved, 
                "error": str(exc),
                "num_samples": len(urls),
                "train_accuracy": float(train_accuracy)
            }

        return {
            "success": True, 
            "message": "Model trained and saved", 
            "saved": saved, 
            "num_samples": len(urls),
            "train_accuracy": float(train_accuracy),
            "phish_samples": labels.count("phish"),
            "legit_samples": labels.count("legit")
        }

    def predict(self, url: str) -> Dict[str, Any]:
        if not self.is_trained or self.pipeline is None:
            return {"success": False, "error": "Model not trained"}

        if not url or not isinstance(url, str):
            return {"success": False, "error": "Empty or invalid URL"}

        proba = None
        try:
            proba = self.pipeline.predict_proba([url])[0]
            classes = list(self.pipeline.classes_)
            pred_idx = int(np.argmax(proba))
            pred_label = classes[pred_idx]
            
            # Get phishing probability
            phish_prob = float(proba[classes.index("phish")]) if "phish" in classes else 0.0
            
            return {
                "success": True,
                "label": pred_label,
                "probabilities": {cls: float(p) for cls, p in zip(classes, proba)},
                "suspicionScore": phish_prob,
                "normalizedUrl": _normalize_url(url),
                "confidence": float(proba[pred_idx]) * 100
            }
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    def evaluate(self, samples: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.is_trained or self.pipeline is None:
            return {"success": False, "error": "Model not trained"}

        urls: List[str] = []
        labels: List[str] = []
        for item in samples:
            url = str(item.get("url", ""))
            label_raw = item.get("label")
            if not url:
                continue
            if isinstance(label_raw, str):
                lr = label_raw.strip().lower()
                if lr in ("phish", "phishing", "malicious", "suspicious"):
                    labels.append("phish")
                elif lr in ("legit", "benign", "safe", "clean"):
                    labels.append("legit")
                else:
                    continue
            elif isinstance(label_raw, (int, bool)):
                labels.append("phish" if bool(label_raw) else "legit")
            else:
                continue
            urls.append(url)

        if not urls:
            return {"success": False, "error": "No valid samples"}

        y_true = np.array(labels)
        y_pred = self.pipeline.predict(urls)
        
        # Get detailed metrics
        accuracy = accuracy_score(y_true, y_pred)
        precision, recall, f1, support = precision_recall_fscore_support(y_true, y_pred, average='weighted')
        report = classification_report(y_true, y_pred, output_dict=True)
        
        return {
            "success": True, 
            "report": report,
            "accuracy": float(accuracy),
            "precision": float(precision),
            "recall": float(recall),
            "f1_score": float(f1),
            "test_samples": len(urls)
        }


# Singleton instance used by Flask app
phishing_model = URLPhishingModel()


def initialize_model() -> Dict[str, Any]:
    return phishing_model.initialize()


