"""
Naïve Bayes URL Phishing Detector

Provides a simple text classifier for detecting suspicious/phishing URLs.
Uses a character n-gram TF-IDF + MultinomialNB pipeline, which works well
for URL-like strings, and persists the trained model to disk.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import List, Dict, Any

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report


MODEL_PATH = os.environ.get("PHISHING_MODEL_PATH", os.path.join(os.path.dirname(__file__), "phishing_nb_model.joblib"))


def _normalize_url(url: str) -> str:
    """Basic normalization: lowercase, strip scheme and www., remove trailing slash."""
    if not isinstance(url, str):
        return ""
    u = url.strip().lower()
    u = re.sub(r"^https?://", "", u)
    u = re.sub(r"^www\\.", "", u)
    if len(u) > 1 and u.endswith("/"):
        u = u[:-1]
    return u


@dataclass
class URLPhishingModel:
    pipeline: Pipeline = field(default=None)
    is_trained: bool = field(default=False)
    classes_: List[str] = field(default_factory=lambda: ["legit", "phish"])  # label names

    def _create_pipeline(self) -> Pipeline:
        # Character n-grams capture URL structure well
        vectorizer = TfidfVectorizer(
            analyzer="char",
            ngram_range=(3, 5),
            min_df=1,
            max_features=50000,
        )
        clf = MultinomialNB(alpha=0.5)
        return Pipeline([
            ("tfidf", vectorizer),
            ("nb", clf),
        ])

    def initialize(self) -> Dict[str, Any]:
        if os.path.exists(MODEL_PATH):
            try:
                self.pipeline = joblib.load(MODEL_PATH)
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
            url = _normalize_url(str(item.get("url", "")))
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

        self.pipeline.fit(urls, labels)
        self.is_trained = True

        # Persist
        try:
            joblib.dump(self.pipeline, MODEL_PATH)
            saved = True
        except Exception as exc:
            saved = False
            return {"success": True, "message": "Trained in-memory (save failed)", "saved": saved, "error": str(exc)}

        return {"success": True, "message": "Model trained and saved", "saved": saved, "num_samples": len(urls)}

    def predict(self, url: str) -> Dict[str, Any]:
        if not self.is_trained or self.pipeline is None:
            return {"success": False, "error": "Model not trained"}

        norm = _normalize_url(url)
        if not norm:
            return {"success": False, "error": "Empty URL"}

        proba = None
        try:
            proba = self.pipeline.predict_proba([norm])[0]
            classes = list(self.pipeline.classes_)
            pred_idx = int(np.argmax(proba))
            pred_label = classes[pred_idx]
            return {
                "success": True,
                "label": pred_label,
                "probabilities": {cls: float(p) for cls, p in zip(classes, proba)},
                "suspicionScore": float(proba[classes.index("phish")]) if "phish" in classes else float(proba[pred_idx]),
                "normalizedUrl": norm,
            }
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    def evaluate(self, samples: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.is_trained or self.pipeline is None:
            return {"success": False, "error": "Model not trained"}

        urls: List[str] = []
        labels: List[str] = []
        for item in samples:
            url = _normalize_url(str(item.get("url", "")))
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
        report = classification_report(y_true, y_pred, output_dict=True)
        return {"success": True, "report": report}


# Singleton instance used by Flask app
phishing_model = URLPhishingModel()


def initialize_model() -> Dict[str, Any]:
    return phishing_model.initialize()


