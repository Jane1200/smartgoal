"""
Flask API for KNN-based Price Prediction
Microservice for ML pricing suggestions
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv_pricing as knn_pricing  # Using CV pricing instead of KNN
import buyer_seller_matching
import phishing_nb
import condition_detection
import os
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize models on startup
print("🚀 Initializing KNN pricing model...")
init_result = knn_pricing.initialize_model()
if init_result['success']:
    print(f"✅ Model initialized: {init_result['message']}")
else:
    print(f"⚠️  Model initialization: {init_result['message']}")

print("🛡️  Initializing Phishing NB model...")
phish_init = phishing_nb.initialize_model()
if phish_init['success']:
    print(f"✅ Phishing model: {phish_init['message']}")
else:
    print(f"⚠️  Phishing model: {phish_init['message']}")

print("👁️  Initializing Condition Detection model...")
condition_init = condition_detection.initialize_model()
if condition_init['success']:
    print(f"✅ Condition detection model: {condition_init['message']}")
else:
    print(f"⚠️  Condition detection model: {condition_init['message']}")


def calculate_ai_score(cv_analysis, condition):
    """
    Calculate AI score (0-100) based on condition analysis and image quality
    
    Args:
        cv_analysis: Computer vision analysis data
        condition: Product condition (new, excellent, good, fair, poor)
    
    Returns:
        int: AI score between 0-100
    """
    # Base score from condition confidence
    confidence = cv_analysis.get('confidence', 50)
    base_score = confidence
    
    # Condition multipliers
    condition_scores = {
        'new': 1.0,
        'like-new': 0.95,
        'excellent': 0.85,
        'good': 0.70,
        'fair': 0.55,
        'poor': 0.30
    }
    
    condition_multiplier = condition_scores.get(condition, 0.70)
    
    # Image quality adjustments
    features = cv_analysis.get('features', {})
    sharpness = features.get('sharpness', 500)
    contrast = features.get('contrast', 40)
    
    # Quality bonus (up to 10 points)
    quality_bonus = 0
    if sharpness > 1000:
        quality_bonus += 5
    elif sharpness > 500:
        quality_bonus += 3
    
    if contrast > 50:
        quality_bonus += 5
    elif contrast > 30:
        quality_bonus += 2
    
    # Tampered penalty
    tampered_penalty = 20 if cv_analysis.get('tampered', False) else 0
    
    # Calculate final score
    final_score = (base_score * condition_multiplier) + quality_bonus - tampered_penalty
    
    # Clamp between 0-100
    return max(0, min(100, int(final_score)))


@app.route('/', methods=['GET'])
def home():
    """Health check endpoint"""
    return jsonify({
        'service': 'SmartGoal KNN Pricing Service',
        'status': 'running',
        'version': '1.0.0',
        'model_trained': knn_pricing.knn_model.is_trained,
        'training_samples': len(knn_pricing.knn_model.training_data),
        'phishing_model_trained': phishing_nb.phishing_model.is_trained
    })


@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        'status': 'healthy',
        'model_status': 'trained' if knn_pricing.knn_model.is_trained else 'not_trained',
        'phishing_status': 'trained' if phishing_nb.phishing_model.is_trained else 'not_trained'
    })


@app.route('/predict', methods=['POST'])
def predict_price():
    """
    Predict optimal price for a product using AUTOMATIC computer vision analysis
    NO ORIGINAL PRICE NEEDED - estimates directly from CV-detected condition
    
    Request body:
    {
        "title": "iPhone 12 64GB",
        "category": "electronics",
        "subCategory": "phone",
        "brand": "Apple",
        "location": "Mumbai",
        "cvAnalysis": {  // Required for automatic CV pricing
            "condition": "good",
            "confidence": 85.5,
            "tampered": false,
            "features": {
                "sharpness": 120.5,
                "brightness": 150.2,
                "contrast": 45.8,
                "edge_density": 0.35
            }
        }
    }
    
    Response:
    {
        "success": true,
        "predicted_price": 32000,
        "condition_detected": "good",
        "confidence": 85.5,
        "cv_insights": {...},
        "ai_score": 92,
        "pricing_breakdown": {...},
        "automatic_pricing": true,
        "message": "Price estimated from CV analysis - good condition detected"
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields for CV-only pricing
        if 'category' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: category'
            }), 400
        
        # Set defaults
        if 'location' not in data:
            data['location'] = 'India'
        if 'brand' not in data:
            data['brand'] = 'generic'
        if 'subCategory' not in data:
            data['subCategory'] = 'other'
        
        # Extract CV analysis (highly recommended for accurate pricing)
        cv_analysis = data.get('cvAnalysis', None)
        
        # Get prediction using AUTOMATIC computer vision pricing
        result = knn_pricing.get_price_prediction(data, cv_analysis)
        
        # Calculate AI score if CV analysis is available
        if cv_analysis and 'confidence' in cv_analysis:
            ai_score = calculate_ai_score(cv_analysis, result.get('condition_detected', 'good'))
            result['ai_score'] = ai_score
            print(f"✅ AI Score calculated: {ai_score}/100")
        
        return jsonify(result)
    
    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to estimate price from CV analysis'
        }), 500


@app.route('/train', methods=['POST'])
def add_training_data():
    """
    Add sold product to training data for computer vision pricing model
    
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
    categories = list(set([item.get('category', 'N/A') for item in knn_pricing.cv_model.training_data]))
    locations = list(set([item.get('location', 'N/A') for item in knn_pricing.cv_model.training_data]))
    
    return jsonify({
        'model_trained': knn_pricing.cv_model.is_trained,
        'training_samples': len(knn_pricing.cv_model.training_data),
        'categories': categories,
        'locations': locations,
        'phishing_model_trained': phishing_nb.phishing_model.is_trained
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


# Phishing detection endpoints
@app.route('/phishing/train', methods=['POST'])
def phishing_train():
    """
    Train the Naïve Bayes phishing detector.
    Body: { samples: [{ url: string, label: 'phish'|'legit'|1|0 }] }
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        samples = data.get('samples')
        result = phishing_nb.phishing_model.train(samples)
        code = 200 if result.get('success') else 400
        return jsonify(result), code
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/phishing/predict', methods=['POST'])
def phishing_predict():
    """
    Predict if a URL is phishing.
    Body: { url: string }
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        url = data.get('url', '')
        result = phishing_nb.phishing_model.predict(url)
        code = 200 if result.get('success') else 400
        return jsonify(result), code
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/phishing/evaluate', methods=['POST'])
def phishing_evaluate():
    """Evaluate the phishing model on labeled samples."""
    try:
        data = request.get_json(force=True, silent=True) or {}
        samples = data.get('samples')
        result = phishing_nb.phishing_model.evaluate(samples)
        code = 200 if result.get('success') else 400
        return jsonify(result), code
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


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
    
    print(f"\n🎯 Starting Computer Vision Pricing Service on port {port}")
    print(f"📊 Training samples: {len(knn_pricing.cv_model.training_data)}")
    print(f"\n🌐 Access the service at: http://localhost:{port}")
    print(f"📖 API Documentation:")
    print(f"   GET  /              - Service info")
    print(f"   GET  /health        - Health check")
    print(f"   POST /predict       - Get price prediction")
    print(f"   POST /train         - Add training data")
    print(f"   GET  /stats         - Model statistics")
    print(f"   POST /match/sellers - Match buyers with sellers")
    print(f"   POST /phishing/train   - Train phishing URL detector")
    print(f"   POST /phishing/predict - Predict phishing URL")
    print(f"   POST /condition/detect - Detect product condition from image")
    print(f"   POST /condition/train  - Train condition detection model\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)

