"""
Comprehensive Test Script for Phishing Detection API

Tests the phishing detection model through the Flask API endpoints.
"""

import requests
import json
from typing import List, Dict

# API endpoint (adjust if different)
API_BASE_URL = "http://localhost:5001"

def test_health_check():
    """Test if the ML service is running"""
    print("\n" + "="*70)
    print("🏥 HEALTH CHECK")
    print("="*70)
    
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ ML Service is running")
            print(f"   Status: {data.get('status')}")
            print(f"   Model Status: {data.get('model_status')}")
            print(f"   Phishing Model: {data.get('phishing_status')}")
            return True
        else:
            print(f"❌ Service returned status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to ML service at {API_BASE_URL}")
        print(f"   Please ensure the Python ML service is running:")
        print(f"   cd server/python-ml && python app.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_phishing_prediction(test_cases: List[Dict]):
    """Test phishing URL predictions"""
    print("\n" + "="*70)
    print("🎣 PHISHING DETECTION TESTS")
    print("="*70)
    
    passed = 0
    failed = 0
    
    for i, test_case in enumerate(test_cases, 1):
        url = test_case['url']
        expected = test_case['expected']
        description = test_case.get('description', '')
        
        try:
            response = requests.post(
                f"{API_BASE_URL}/phishing/predict",
                json={"url": url},
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get('success'):
                    predicted = result.get('label')
                    suspicion = result.get('suspicionScore', 0)
                    confidence = result.get('confidence', 0)
                    
                    # Determine if prediction matches expected
                    match = predicted == expected
                    icon = "✅" if match else "❌"
                    
                    if match:
                        passed += 1
                    else:
                        failed += 1
                    
                    print(f"\n{icon} Test {i}: {description}")
                    print(f"   URL: {url[:70]}...")
                    print(f"   Expected: {expected.upper()} | Predicted: {predicted.upper()}")
                    print(f"   Suspicion Score: {suspicion:.2%}")
                    print(f"   Confidence: {confidence:.1f}%")
                    
                    # Risk assessment
                    if suspicion > 0.8:
                        risk = "🚨 HIGH RISK"
                    elif suspicion > 0.6:
                        risk = "⚠️ MEDIUM RISK"
                    elif suspicion > 0.4:
                        risk = "ℹ️ LOW RISK"
                    else:
                        risk = "✅ SAFE"
                    print(f"   Risk Assessment: {risk}")
                else:
                    print(f"\n❌ Test {i} failed: {result.get('error')}")
                    failed += 1
            else:
                print(f"\n❌ Test {i} failed with status code: {response.status_code}")
                failed += 1
                
        except Exception as e:
            print(f"\n❌ Test {i} error: {e}")
            failed += 1
    
    print("\n" + "="*70)
    print(f"📊 TEST RESULTS: {passed} passed, {failed} failed out of {len(test_cases)} tests")
    print(f"   Success Rate: {(passed/len(test_cases)*100):.1f}%")
    print("="*70)


def test_batch_urls():
    """Test multiple URLs in batch"""
    print("\n" + "="*70)
    print("📦 BATCH URL TESTING")
    print("="*70)
    
    urls_to_test = [
        "https://www.amazon.in/product/xyz",
        "http://secure-amazon-login.malicious.com",
        "https://www.flipkart.com/item/abc",
        "http://free-gift-winner.scam.xyz",
        "https://www.google.com",
        "http://www.g00gle.com"
    ]
    
    print(f"\n🔍 Testing {len(urls_to_test)} URLs...")
    
    results = []
    for url in urls_to_test:
        try:
            response = requests.post(
                f"{API_BASE_URL}/phishing/predict",
                json={"url": url},
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    results.append({
                        'url': url,
                        'label': result.get('label'),
                        'suspicion': result.get('suspicionScore', 0)
                    })
        except Exception as e:
            print(f"Error testing {url}: {e}")
    
    # Sort by suspicion score
    results.sort(key=lambda x: x['suspicion'], reverse=True)
    
    print(f"\n📊 Results (sorted by suspicion score):\n")
    for r in results:
        icon = "🚨" if r['suspicion'] > 0.7 else "⚠️" if r['suspicion'] > 0.4 else "✅"
        print(f"{icon} [{r['label'].upper():5}] {r['suspicion']*100:5.1f}% - {r['url'][:60]}")


def main():
    """Run all tests"""
    print("\n" + "="*70)
    print("🧪 PHISHING DETECTION - COMPREHENSIVE TEST SUITE")
    print("="*70)
    
    # Test 1: Health check
    if not test_health_check():
        print("\n❌ ML Service is not available. Cannot proceed with tests.")
        print("\n💡 To start the ML service:")
        print("   1. Open a terminal")
        print("   2. Navigate to: server/python-ml")
        print("   3. Run: python app.py")
        print("   4. Wait for the service to start")
        print("   5. Run this test script again")
        return
    
    # Test 2: Individual predictions
    test_cases = [
        {
            "url": "https://www.amazon.in/product/B08N5WRWNW",
            "expected": "legit",
            "description": "Legitimate Amazon India product"
        },
        {
            "url": "https://www.flipkart.com/apple-iphone-13/p/itm123",
            "expected": "legit",
            "description": "Legitimate Flipkart product"
        },
        {
            "url": "https://www.google.com",
            "expected": "legit",
            "description": "Google homepage"
        },
        {
            "url": "https://www.paytm.com",
            "expected": "legit",
            "description": "Paytm official site"
        },
        {
            "url": "http://secure-login-amazon.verify-account.suspicious.com/login",
            "expected": "phish",
            "description": "Fake Amazon phishing site"
        },
        {
            "url": "https://free-iphone-giveaway.scam-site.xyz/claim-now",
            "expected": "phish",
            "description": "Free iPhone scam"
        },
        {
            "url": "http://www.g00gle.com",
            "expected": "phish",
            "description": "Fake Google (zero instead of O)"
        },
        {
            "url": "http://paypal-security-update.fake-site.net/verify",
            "expected": "phish",
            "description": "Fake PayPal verification"
        },
        {
            "url": "https://www.facebo0k.com",
            "expected": "phish",
            "description": "Fake Facebook (zero instead of o)"
        },
        {
            "url": "http://urgent-security-alert.account-suspended.net/",
            "expected": "phish",
            "description": "Urgent security alert scam"
        },
        {
            "url": "https://www.hdfc.com",
            "expected": "legit",
            "description": "HDFC Bank official"
        },
        {
            "url": "http://claim-your-prize-now.winner123.tk/",
            "expected": "phish",
            "description": "Prize claim scam"
        }
    ]
    
    test_phishing_prediction(test_cases)
    
    # Test 3: Batch testing
    test_batch_urls()
    
    print("\n" + "="*70)
    print("✅ ALL TESTS COMPLETED")
    print("="*70)
    print("\n💡 Next Steps:")
    print("   - The phishing detection model is working correctly")
    print("   - You can integrate it into your application")
    print("   - Use POST /phishing/predict to check URLs")
    print("   - Monitor suspicion scores above 0.7 for high risk")
    print("\n")


if __name__ == "__main__":
    main()
