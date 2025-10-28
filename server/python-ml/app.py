"""
Flask API for KNN-based Price Prediction
Microservice for ML pricing suggestions
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import knn_pricing
import buyer_seller_matching
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize model on startup
print("🚀 Initializing KNN pricing model...")
init_result = knn_pricing.initialize_model()
if init_result['success']:
    print(f"✅ Model initialized: {init_result['message']}")
else:
    print(f"⚠️  Model initialization: {init_result['message']}")


@app.route('/', methods=['GET'])
def home():
    """Health check endpoint"""
    return jsonify({
        'service': 'SmartGoal KNN Pricing Service',
        'status': 'running',
        'version': '1.0.0',
        'model_trained': knn_pricing.knn_model.is_trained,
        'training_samples': len(knn_pricing.knn_model.training_data)
    })


@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        'status': 'healthy',
        'model_status': 'trained' if knn_pricing.knn_model.is_trained else 'not_trained'
    })


@app.route('/predict', methods=['POST'])
def predict_price():
    """
    Predict optimal price for a product
    
    Request body:
    {
        "title": "iPhone 12 64GB",
        "category": "electronics",
        "condition": "excellent",
        "location": "Mumbai",
        "originalPrice": 65000,
        "ageMonths": 24,
        "brand": "Apple"
    }
    
    Response:
    {
        "success": true,
        "predicted_price": 32000,
        "average_price": 31500,
        "median_price": 32000,
        "price_range": {
            "min": 28000,
            "max": 35000
        },
        "similar_products": [...],
        "confidence": 85
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['category', 'condition', 'originalPrice']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Set defaults
        if 'location' not in data:
            data['location'] = 'India'
        if 'ageMonths' not in data:
            data['ageMonths'] = 0
        if 'brand' not in data:
            data['brand'] = 'generic'
        
        # Get prediction
        result = knn_pricing.get_price_prediction(data)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/train', methods=['POST'])
def add_training_data():
    """
    Add sold product to training data and retrain model
    
    Request body:
    {
        "title": "iPhone 12 64GB",
        "category": "electronics",
        "condition": "excellent",
        "location": "Mumbai",
        "originalPrice": 65000,
        "sellingPrice": 32000,
        "ageMonths": 24,
        "brand": "Apple"
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['category', 'condition', 'originalPrice', 'sellingPrice']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Add to training data
        result = knn_pricing.add_product_to_training(data)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/retrain', methods=['POST'])
def retrain_model():
    """Retrain the model with current data"""
    try:
        result = knn_pricing.knn_model.train()
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/stats', methods=['GET'])
def get_stats():
    """Get model statistics"""
    return jsonify({
        'model_trained': knn_pricing.knn_model.is_trained,
        'training_samples': len(knn_pricing.knn_model.training_data),
        'k_neighbors': knn_pricing.knn_model.k,
        'categories': list(set([item.get('category', 'N/A') for item in knn_pricing.knn_model.training_data])),
        'locations': list(set([item.get('location', 'N/A') for item in knn_pricing.knn_model.training_data]))
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
    
    print(f"\n🎯 Starting KNN Pricing Service on port {port}")
    print(f"📊 Training samples: {len(knn_pricing.knn_model.training_data)}")
    print(f"🔍 K neighbors: {knn_pricing.knn_model.k}")
    print(f"\n🌐 Access the service at: http://localhost:{port}")
    print(f"📖 API Documentation:")
    print(f"   GET  /              - Service info")
    print(f"   GET  /health        - Health check")
    print(f"   POST /predict       - Get price prediction")
    print(f"   POST /train         - Add training data")
    print(f"   GET  /stats         - Model statistics")
    print(f"   POST /match/sellers - Match buyers with sellers\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)

