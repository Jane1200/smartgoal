"""
Flask API for ML Services
Microservice for buyer-seller matching and condition detection
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import buyer_seller_matching
import condition_detection
import os
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize models on startup
print("👁️  Initializing Condition Detection model...")
condition_init = condition_detection.initialize_model()
if condition_init['success']:
    print(f"✅ Condition detection model: {condition_init['message']}")
else:
    print(f"⚠️  Condition detection model: {condition_init['message']}")


@app.route('/', methods=['GET'])
def home():
    """Health check endpoint"""
    return jsonify({
        'service': 'SmartGoal ML Service',
        'status': 'running',
        'version': '1.0.0',
        'features': ['buyer_seller_matching', 'condition_detection']
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


# Condition detection endpoints
@app.route('/condition/detect', methods=['POST'])
def detect_condition():
    """
    Detect product condition from uploaded image
    
    Request body:
    {
        "imagePath": "/path/to/uploaded/image.jpg"
    }
    
    Response:
    {
        "success": true,
        "condition": "good",
        "confidence": 85.5,
        "tampered": false,
        "features": {
            "sharpness": 850.2,
            "color_variance": 120.5,
            "edge_density": 0.15,
            "brightness": 128.0,
            "contrast": 65.3
        }
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'imagePath' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: imagePath'
            }), 400
        
        image_path = data['imagePath']
        
        # Check if file exists
        if not os.path.exists(image_path):
            return jsonify({
                'success': False,
                'error': 'Image file not found'
            }), 404
        
        # Detect condition
        result = condition_detection.detect_condition_from_image(image_path)
        
        return jsonify({
            'success': True,
            **result
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/condition/train', methods=['POST'])
def train_condition_model():
    """
    Train the condition detection model
    
    Request body:
    {
        "trainingData": [
            {"imagePath": "/path/image1.jpg", "label": 4},
            {"imagePath": "/path/image2.jpg", "label": 3},
            ...
        ]
    }
    
    Labels: 0=poor, 1=fair, 2=good, 3=excellent, 4=new
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'trainingData' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: trainingData'
            }), 400
        
        training_data = []
        for item in data['trainingData']:
            if 'imagePath' in item and 'label' in item:
                training_data.append((item['imagePath'], item['label']))
        
        # Train model
        result = condition_detection.train_condition_model(training_data)
        
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
    print(f"   POST /match/sellers - Match buyers with sellers")
    print(f"   POST /condition/detect - Detect product condition from image")
    print(f"   POST /condition/train  - Train condition detection model\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)

