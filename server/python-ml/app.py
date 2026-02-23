"""
Flask API for ML Services
Microservice for buyer-seller matching
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import buyer_seller_matching
import os
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/', methods=['GET'])
def home():
    """Health check endpoint"""
    return jsonify({
        'service': 'SmartGoal ML Service',
        'status': 'running',
        'version': '1.0.0',
        'features': ['buyer_seller_matching']
    })


@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        'status': 'healthy'
    })


@app.route('/match/sellers', methods=['POST'])
def match_sellers():
    """
    Find matching sellers for a buyer
    
    Request body:
    {
        "sellers": [
            {
                "sellerId": "seller123",
                "sellerName": "John Doe",
                "productId": "prod456",
                "productTitle": "iPhone 12",
                "productPrice": 30000,
                "productCategory": "phone",
                "productCondition": "excellent",
                "latitude": 9.9312,
                "longitude": 76.2673,
                "location": "Kochi"
            }
        ],
        "buyer": {
            "latitude": 9.9252,
            "longitude": 76.2667,
            "budgetMin": 25000,
            "budgetMax": 35000,
            "preferredCategory": "phone",
            "preferredCondition": "excellent",
            "maxDistance": 5
        }
    }
    
    Response:
    {
        "success": true,
        "matches": [...],
        "totalMatches": 10,
        "recommendedMatches": 5
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'sellers' not in data or 'buyer' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: sellers and buyer'
            }), 400
        
        sellers = data['sellers']
        buyer = data['buyer']
        
        if len(sellers) == 0:
            return jsonify({
                'success': False,
                'message': 'No sellers available in the area'
            })
        
        # Add sellers to matcher
        buyer_seller_matching.buyer_seller_matcher.add_sellers(sellers)
        
        # Find matches
        result = buyer_seller_matching.buyer_seller_matcher.find_matches(buyer)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('DEBUG', 'False') == 'True'
    
    print(f"\n🎯 Starting SmartGoal ML Service on port {port}")
    print(f"\n🌐 Access the service at: http://localhost:{port}")
    print(f"📖 API Documentation:")
    print(f"   GET  /              - Service info")
    print(f"   GET  /health        - Health check")
    print(f"   POST /match/sellers - Match buyers with sellers\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)

