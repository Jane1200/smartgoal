"""
Test script for KNN Buyer-Seller Matching
"""

import requests
import json

# ML Service URL
ML_SERVICE_URL = "http://127.0.0.1:5001"

def test_matching():
    """Test buyer-seller matching endpoint"""
    
    print("\n" + "="*60)
    print("🧪 Testing KNN Buyer-Seller Matching")
    print("="*60 + "\n")
    
    # Sample sellers data
    sellers = [
        {
            "sellerId": "seller1",
            "sellerName": "Rajesh Kumar",
            "productId": "prod1",
            "productTitle": "iPhone 12 64GB (Black)",
            "productPrice": 32000,
            "productCategory": "phone",
            "productCondition": "excellent",
            "latitude": 9.9312,
            "longitude": 76.2673,
            "location": "Kochi, Kerala"
        },
        {
            "sellerId": "seller2",
            "sellerName": "Priya Sharma",
            "productId": "prod2",
            "productTitle": "iPhone 11 128GB (White)",
            "productPrice": 28000,
            "productCategory": "phone",
            "productCondition": "good",
            "latitude": 9.9252,
            "longitude": 76.2667,
            "location": "Ernakulam, Kerala"
        },
        {
            "sellerId": "seller3",
            "sellerName": "Amit Patel",
            "productId": "prod3",
            "productTitle": "Samsung Galaxy S21",
            "productPrice": 35000,
            "productCategory": "phone",
            "productCondition": "excellent",
            "latitude": 9.9400,
            "longitude": 76.2800,
            "location": "Kochi North"
        },
        {
            "sellerId": "seller4",
            "sellerName": "Sneha Reddy",
            "productId": "prod4",
            "productTitle": "OnePlus 9 Pro",
            "productPrice": 38000,
            "productCategory": "phone",
            "productCondition": "like-new",
            "latitude": 9.9200,
            "longitude": 76.2600,
            "location": "Fort Kochi"
        },
        {
            "sellerId": "seller5",
            "sellerName": "Vikram Singh",
            "productId": "prod5",
            "productTitle": "iPhone 13 256GB",
            "productPrice": 52000,
            "productCategory": "phone",
            "productCondition": "excellent",
            "latitude": 9.9500,
            "longitude": 76.2900,
            "location": "Kakkanad"
        },
        {
            "sellerId": "seller6",
            "sellerName": "Anjali Nair",
            "productId": "prod6",
            "productTitle": "iPhone 12 Mini",
            "productPrice": 29000,
            "productCategory": "phone",
            "productCondition": "good",
            "latitude": 9.9150,
            "longitude": 76.2550,
            "location": "Marine Drive"
        }
    ]
    
    # Buyer looking for a phone
    buyer = {
        "latitude": 9.9252,
        "longitude": 76.2667,
        "budgetMin": 25000,
        "budgetMax": 35000,
        "preferredCategory": "phone",
        "preferredCondition": "excellent",
        "maxDistance": 5  # 5 km radius
    }
    
    print("📍 Buyer Location: Ernakulam, Kochi")
    print(f"💰 Budget: ₹{buyer['budgetMin']:,} - ₹{buyer['budgetMax']:,}")
    print(f"🔍 Looking for: {buyer['preferredCategory']} ({buyer['preferredCondition']})")
    print(f"📏 Max Distance: {buyer['maxDistance']} km\n")
    
    print("🔄 Sending matching request...\n")
    
    try:
        response = requests.post(
            f"{ML_SERVICE_URL}/match/sellers",
            json={
                "sellers": sellers,
                "buyer": buyer
            },
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('success'):
                print("✅ Matching Successful!\n")
                print("="*60)
                
                # Statistics
                stats = result.get('statistics', {})
                print(f"\n📊 Statistics:")
                print(f"   • Total Matches: {result.get('totalMatches', 0)}")
                print(f"   • Recommended: {result.get('recommendedMatches', 0)}")
                print(f"   • Within Budget: {stats.get('withinBudget', 0)}")
                print(f"   • Within Distance: {stats.get('withinDistance', 0)}")
                print(f"   • Average Distance: {stats.get('averageDistance', 0)} km")
                print(f"   • Average Price: ₹{stats.get('averagePrice', 0):,.0f}")
                
                # Show matches
                matches = result.get('matches', [])
                print(f"\n🎯 Top {len(matches)} Matched Sellers:\n")
                
                for i, match in enumerate(matches, 1):
                    print(f"{i}. {match['productTitle']}")
                    print(f"   Seller: {match['sellerName']}")
                    print(f"   Price: ₹{match['productPrice']:,}")
                    print(f"   Location: {match['location']} ({match['distance']} km away)")
                    print(f"   Condition: {match['productCondition']}")
                    print(f"   Match Score: {match['matchScore']}%")
                    
                    badges = []
                    if match['withinBudget']:
                        badges.append("✓ Within Budget")
                    if match['withinDistance']:
                        badges.append("✓ Within Range")
                    if match['recommended']:
                        badges.append("⭐ RECOMMENDED")
                    
                    if badges:
                        print(f"   {' | '.join(badges)}")
                    print()
                
                print("="*60)
                print("✅ Test Passed!\n")
                
            else:
                print(f"❌ Matching failed: {result.get('message', 'Unknown error')}")
        else:
            print(f"❌ HTTP Error {response.status_code}")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error!")
        print("   Make sure the ML service is running on port 5001")
        print("   Run: cd server/python-ml && python app.py")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_matching()









