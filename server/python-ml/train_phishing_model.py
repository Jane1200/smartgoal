"""
Training Script for Phishing URL Detection Model

This script trains the phishing detection model with a comprehensive dataset
of legitimate and phishing URLs.
"""

import json
import os
import sys
from pathlib import Path

# Add parent directory to path to import phishing_nb module
sys.path.insert(0, str(Path(__file__).parent))

import phishing_nb

def load_training_data(json_path: str):
    """Load training data from JSON file"""
    print(f"📂 Loading training data from: {json_path}")
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    samples = data.get('samples', [])
    print(f"✅ Loaded {len(samples)} samples")
    
    # Count by label
    legit_count = sum(1 for s in samples if s.get('label') == 'legit')
    phish_count = sum(1 for s in samples if s.get('label') == 'phish')
    
    print(f"   - Legitimate URLs: {legit_count}")
    print(f"   - Phishing URLs: {phish_count}")
    
    return samples


def train_model(samples):
    """Train the phishing detection model"""
    print("\n🧠 Training phishing detection model...")
    
    # Initialize the model
    init_result = phishing_nb.phishing_model.initialize()
    print(f"   {init_result['message']}")
    
    # Train with all samples
    result = phishing_nb.phishing_model.train(samples)
    
    if result['success']:
        print(f"\n✅ Training completed successfully!")
        print(f"   - Training samples: {result['num_samples']}")
        print(f"   - Legitimate samples: {result['legit_samples']}")
        print(f"   - Phishing samples: {result['phish_samples']}")
        print(f"   - Training accuracy: {result['train_accuracy']:.2%}")
        print(f"   - Model saved: {result['saved']}")
        return True
    else:
        print(f"\n❌ Training failed: {result.get('error', 'Unknown error')}")
        return False


def test_model(test_urls):
    """Test the model with sample URLs"""
    print("\n🧪 Testing model with sample URLs...")
    
    for i, test_case in enumerate(test_urls, 1):
        url = test_case['url']
        expected = test_case['expected']
        
        result = phishing_nb.phishing_model.predict(url)
        
        if result['success']:
            label = result['label']
            confidence = result.get('confidence', 0)
            suspicion = result['suspicionScore']
            
            # Check if prediction matches expected
            match = "✅" if label == expected else "❌"
            
            print(f"\n{match} Test {i}: {url[:60]}...")
            print(f"   Expected: {expected} | Predicted: {label}")
            print(f"   Suspicion Score: {suspicion:.2%} | Confidence: {confidence:.1f}%")
        else:
            print(f"\n❌ Test {i} failed: {result.get('error')}")


def main():
    """Main training workflow"""
    print("=" * 70)
    print("🎣 PHISHING URL DETECTION - MODEL TRAINING")
    print("=" * 70)
    
    # Get the directory of this script
    script_dir = Path(__file__).parent
    training_data_path = script_dir / "phishing_training_data.json"
    
    # Check if training data exists
    if not training_data_path.exists():
        print(f"❌ Training data not found at: {training_data_path}")
        print("   Please ensure phishing_training_data.json exists in the same directory.")
        return
    
    # Load training data
    samples = load_training_data(str(training_data_path))
    
    if len(samples) < 10:
        print("❌ Insufficient training data. Need at least 10 samples.")
        return
    
    # Train the model
    success = train_model(samples)
    
    if not success:
        print("\n❌ Training failed. Please check the error messages above.")
        return
    
    # Test with sample URLs
    test_urls = [
        {"url": "https://www.amazon.in/product/abc123", "expected": "legit"},
        {"url": "https://www.flipkart.com/item/xyz", "expected": "legit"},
        {"url": "http://secure-login-amazon.verify-account.malicious.com/login", "expected": "phish"},
        {"url": "https://free-iphone-giveaway.scam-site.xyz/claim", "expected": "phish"},
        {"url": "https://www.google.com", "expected": "legit"},
        {"url": "http://www.g00gle.com", "expected": "phish"},
        {"url": "https://www.paytm.com/", "expected": "legit"},
        {"url": "http://paytm-wallet-verify.suspicious.net/", "expected": "phish"}
    ]
    
    test_model(test_urls)
    
    print("\n" + "=" * 70)
    print("✅ TRAINING COMPLETE!")
    print("=" * 70)
    print("\n📌 Model saved to: phishing_nb_model.joblib")
    print("📌 You can now use the model for phishing detection")
    print("\n💡 To use the model:")
    print("   1. Ensure the ML service is running (python app.py)")
    print("   2. Make POST requests to /phishing/predict with a URL")
    print("   3. The model will return phishing probability and classification")


if __name__ == "__main__":
    main()
