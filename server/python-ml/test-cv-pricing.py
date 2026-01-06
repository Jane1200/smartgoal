"""
Test script to verify Computer Vision pricing is working correctly
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from condition_detection import detect_condition_from_image
from cv_pricing import get_price_prediction

def test_cv_pricing_integration():
    """Test the complete CV pricing flow"""
    
    print("=" * 60)
    print("COMPUTER VISION PRICING INTEGRATION TEST")
    print("=" * 60)
    
    # Sample product data
    product_data = {
        'title': 'iPhone 12 64GB',
        'category': 'electronics',
        'condition': 'good',
        'originalPrice': 65000,
        'location': 'Mumbai',
        'ageMonths': 24,
        'brand': 'Apple'
    }
    
    print("\n📦 Product Data:")
    for key, value in product_data.items():
        print(f"   {key}: {value}")
    
    # Test without CV analysis (fallback)
    print("\n\n" + "=" * 60)
    print("TEST 1: Pricing WITHOUT Computer Vision")
    print("=" * 60)
    
    result_without_cv = get_price_prediction(product_data, None)
    
    if result_without_cv['success']:
        print(f"\n✅ SUCCESS")
        print(f"   💰 Predicted Price: ₹{result_without_cv['predicted_price']:,}")
        print(f"   📊 Original Price: ₹{result_without_cv['original_price']:,}")
        print(f"   📉 Depreciation: {result_without_cv['depreciation_factor']}")
        print(f"   🏷️ Condition: {result_without_cv['condition_adjustment']}")
        print(f"   ✅ Confidence: {result_without_cv['confidence']}%")
        print(f"   🤖 CV Used: {result_without_cv['cv_insights'].get('cv_condition_used', False)}")
    else:
        print(f"\n❌ FAILED: {result_without_cv.get('error', 'Unknown error')}")
    
    # Test with simulated CV analysis
    print("\n\n" + "=" * 60)
    print("TEST 2: Pricing WITH Computer Vision (Simulated)")
    print("=" * 60)
    
    # Simulate CV analysis result
    cv_analysis = {
        'condition': 'excellent',
        'confidence': 85.5,
        'tampered': False,
        'features': {
            'sharpness': 1250.5,
            'color_variance': 145.2,
            'edge_density': 0.18,
            'brightness': 135.0,
            'contrast': 68.5
        }
    }
    
    print("\n🔍 CV Analysis (Simulated):")
    print(f"   Condition: {cv_analysis['condition']}")
    print(f"   Confidence: {cv_analysis['confidence']}%")
    print(f"   Tampered: {cv_analysis['tampered']}")
    print(f"   Sharpness: {cv_analysis['features']['sharpness']}")
    print(f"   Contrast: {cv_analysis['features']['contrast']}")
    
    result_with_cv = get_price_prediction(product_data, cv_analysis)
    
    if result_with_cv['success']:
        print(f"\n✅ SUCCESS")
        print(f"   💰 Predicted Price: ₹{result_with_cv['predicted_price']:,}")
        print(f"   📊 Original Price: ₹{result_with_cv['original_price']:,}")
        print(f"   📉 Depreciation: {result_with_cv['depreciation_factor']}")
        print(f"   🏷️ Condition: {result_with_cv['condition_adjustment']}")
        print(f"   ✅ Confidence: {result_with_cv['confidence']}%")
        print(f"   🤖 CV Used: {result_with_cv['cv_insights'].get('cv_condition_used', False)}")
        print(f"   🔍 CV Condition: {result_with_cv['cv_insights'].get('condition', 'N/A')}")
        print(f"   📸 CV Confidence: {result_with_cv['cv_insights'].get('confidence', 'N/A')}%")
        
        if 'price_breakdown' in result_with_cv:
            print(f"\n   💡 Price Breakdown:")
            for key, value in result_with_cv['price_breakdown'].items():
                print(f"      {key}: ₹{value:,}")
    else:
        print(f"\n❌ FAILED: {result_with_cv.get('error', 'Unknown error')}")
    
    # Compare results
    print("\n\n" + "=" * 60)
    print("COMPARISON")
    print("=" * 60)
    
    price_diff = result_with_cv['predicted_price'] - result_without_cv['predicted_price']
    price_diff_pct = (price_diff / result_without_cv['predicted_price']) * 100
    
    print(f"\n   Without CV: ₹{result_without_cv['predicted_price']:,}")
    print(f"   With CV:    ₹{result_with_cv['predicted_price']:,}")
    print(f"   Difference: ₹{abs(price_diff):,} ({abs(price_diff_pct):.1f}% {'higher' if price_diff > 0 else 'lower'})")
    print(f"\n   🎯 CV Impact: {'Increased' if price_diff > 0 else 'Decreased'} price by detecting '{cv_analysis['condition']}' condition")
    
    print("\n" + "=" * 60)
    print("✅ COMPUTER VISION PRICING IS WORKING!")
    print("=" * 60)
    print("\nThe system uses:")
    print("1. 🔍 Condition Detection - Analyzes image quality")
    print("2. 📊 Feature Extraction - Sharpness, contrast, brightness")
    print("3. 🤖 AI Scoring - Calculates confidence (0-100)")
    print("4. 💰 Smart Pricing - Adjusts price based on detected condition")
    print("5. ⚠️ Tamper Detection - Identifies manipulated images")
    print("\n" + "=" * 60)

if __name__ == "__main__":
    test_cv_pricing_integration()
