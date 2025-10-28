"""
Test script for KNN ML Service
Run this to verify everything works
"""

import requests
import json

ML_SERVICE_URL = 'http://localhost:5001'

def test_health():
    """Test health check"""
    print("\n🔍 Testing health check...")
    try:
        response = requests.get(f'{ML_SERVICE_URL}/health')
        print(f"✅ Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_prediction():
    """Test price prediction"""
    print("\n🔍 Testing price prediction...")
    
    test_data = {
        "title": "iPhone 12 64GB",
        "category": "electronics",
        "condition": "excellent",
        "originalPrice": 65000,
        "ageMonths": 24,
        "location": "Mumbai",
        "brand": "Apple"
    }
    
    try:
        response = requests.post(
            f'{ML_SERVICE_URL}/predict',
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"✅ Status: {response.status_code}")
        result = response.json()
        
        if result.get('success'):
            print(f"   Predicted Price: ₹{result['predicted_price']:,}")
            print(f"   Price Range: ₹{result['price_range']['min']:,} - ₹{result['price_range']['max']:,}")
            print(f"   Confidence: {result['confidence']}%")
            print(f"   Similar Products: {len(result['similar_products'])}")
        else:
            print(f"   Error: {result.get('message')}")
        
        return result.get('success', False)
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_stats():
    """Test statistics endpoint"""
    print("\n🔍 Testing statistics...")
    try:
        response = requests.get(f'{ML_SERVICE_URL}/stats')
        print(f"✅ Status: {response.status_code}")
        stats = response.json()
        print(f"   Model Trained: {stats['model_trained']}")
        print(f"   Training Samples: {stats['training_samples']}")
        print(f"   K Neighbors: {stats['k_neighbors']}")
        print(f"   Categories: {', '.join(stats['categories'])}")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_training():
    """Test adding training data"""
    print("\n🔍 Testing training data addition...")
    
    new_data = {
        "title": "Test Product",
        "category": "electronics",
        "condition": "good",
        "originalPrice": 50000,
        "sellingPrice": 30000,
        "ageMonths": 18,
        "location": "Test City",
        "brand": "Test Brand"
    }
    
    try:
        response = requests.post(
            f'{ML_SERVICE_URL}/train',
            json=new_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"✅ Status: {response.status_code}")
        result = response.json()
        
        if result.get('success'):
            print(f"   Message: {result['message']}")
            print(f"   New sample count: {result['training_result']['samples']}")
        else:
            print(f"   Error: {result.get('message')}")
        
        return result.get('success', False)
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Run all tests"""
    print("="*50)
    print("  SmartGoal KNN ML Service - Test Suite")
    print("="*50)
    
    # Check if service is running
    print("\n⚡ Checking if ML service is running...")
    try:
        requests.get(ML_SERVICE_URL, timeout=2)
        print("✅ Service is running!")
    except:
        print("❌ Service is NOT running!")
        print("\nPlease start the service first:")
        print("  Windows: start.bat")
        print("  Mac/Linux: ./start.sh")
        print("  Or: python app.py")
        return
    
    # Run tests
    results = {
        'Health Check': test_health(),
        'Price Prediction': test_prediction(),
        'Statistics': test_stats(),
        'Training Data': test_training()
    }
    
    # Summary
    print("\n" + "="*50)
    print("  Test Results Summary")
    print("="*50)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status}  {test_name}")
    
    print("\n" + "-"*50)
    print(f"  Total: {passed}/{total} tests passed")
    print("="*50)
    
    if passed == total:
        print("\n🎉 All tests passed! ML service is working perfectly!")
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")

if __name__ == '__main__':
    main()



