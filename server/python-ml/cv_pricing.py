"""
Computer Vision-based Price Prediction for Resale Items
Predicts optimal pricing based on computer vision analysis of product images
AUTOMATIC PRICING - NO ORIGINAL PRICE NEEDED
"""

import numpy as np
import json
import os
from datetime import datetime
from condition_detection import condition_detector

class CVPricingModel:
    def __init__(self):
        """
        Initialize Computer Vision pricing model
        """
        self.is_trained = False
        self.training_data = []
        self.price_multipliers = {
            'new': 0.95,
            'like-new': 0.90,
            'excellent': 0.85,
            'good': 0.70,
            'fair': 0.55,
            'poor': 0.30
        }
        
        # Location-based market factors
        self.location_factors = {
            'Mumbai': 1.1,
            'Delhi': 1.05,
            'Bangalore': 1.08,
            'Hyderabad': 1.02,
            'Pune': 1.03,
            'Chennai': 1.01,
            'India': 1.0
        }
    
    def load_training_data(self, data_file='sample_data.json'):
        """Load training data from JSON file"""
        file_path = os.path.join(os.path.dirname(__file__), data_file)
        
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                self.training_data = json.load(f)
            return True
        return False
    
    def add_training_data(self, product_data):
        """Add new product data to training set"""
        self.training_data.append(product_data)
        return True
    
    def save_training_data(self, data_file='sample_data.json'):
        """Save training data to JSON file"""
        file_path = os.path.join(os.path.dirname(__file__), data_file)
        with open(file_path, 'w') as f:
            json.dump(self.training_data, f, indent=2)
        return True
    
    def predict_with_cv(self, product_data, cv_analysis=None):
        """
        Predict optimal price using ONLY computer vision analysis - NO ORIGINAL PRICE NEEDED
        Uses CV-detected condition as primary factor with market-based pricing
        
        Args:
            product_data (dict): Product information (category, brand, location, title)
            cv_analysis (dict): Computer vision analysis results (required for accurate pricing)
            
        Returns:
            dict: Prediction results with price and confidence
        """
        # Extract product features
        category = product_data.get('category', 'electronics')
        location = product_data.get('location', 'India')
        brand = product_data.get('brand', 'generic')
        title = product_data.get('title', 'Unknown Product')
        subcategory = product_data.get('subCategory', 'other')
        
        print(f"\n💰 CV-ONLY PRICING for: {title}")
        print(f"   Category: {category}, SubCategory: {subcategory}, Brand: {brand}")
        
        # Base market prices by subcategory (average market values in INR)
        base_market_prices = {
            # Phone subcategories
            'phone': 25000,
            'smartphone': 25000,
            'budget-phone': 12000,
            'mid-range-phone': 25000,
            'flagship-phone': 60000,
            
            # Smartwatch subcategories
            'smartwatch': 8000,
            'fitness-band': 3000,
            'premium-smartwatch': 25000,
            
            # Earphones subcategories
            'earphones': 3000,
            'tws-earbuds': 4000,
            'headphones': 5000,
            'premium-audio': 15000,
            
            # Other electronics
            'laptop': 45000,
            'tablet': 30000,
            'electronics': 15000,
            'other': 10000
        }
        
        # Get base price from subcategory, fallback to category
        base_price = base_market_prices.get(subcategory.lower(), 
                     base_market_prices.get(category.lower(), 10000))
        
        print(f"   📊 Base market price for {subcategory}: ₹{int(base_price)}")
        
        # Brand multipliers (premium brands get higher base prices)
        brand_multipliers = {
            'Apple': 2.5,
            'Samsung': 1.8,
            'Sony': 1.7,
            'OnePlus': 1.5,
            'Google': 1.6,
            'Xiaomi': 1.2,
            'Realme': 1.1,
            'Oppo': 1.2,
            'Vivo': 1.2,
            'Nothing': 1.3,
            'Motorola': 1.1,
            'Nokia': 1.0,
            'Boat': 0.9,
            'Noise': 0.8,
            'boAt': 0.9,
            'realme': 1.1,
            'generic': 1.0
        }
        
        brand_factor = brand_multipliers.get(brand, 1.0)
        base_price = base_price * brand_factor
        print(f"   🏷️ Brand multiplier for {brand}: {brand_factor}x = ₹{int(base_price)}")
        
        # Apply location factor
        location_factor = self.location_factors.get(location, 1.0)
        base_price = base_price * location_factor
        print(f"   📍 Location factor for {location}: {location_factor}x = ₹{int(base_price)}")
        
        # CV ANALYSIS - PRIMARY PRICING FACTOR
        final_price = base_price
        cv_insights = {}
        condition = 'good'  # default fallback
        confidence_score = 50
        
        if cv_analysis:
            print(f"\n   🔍 CV Analysis Active - Using Image Quality Metrics")
            
            # Extract CV features
            cv_condition = cv_analysis.get('condition', 'good')
            confidence = cv_analysis.get('confidence', 50)
            tampered = cv_analysis.get('tampered', False)
            features = cv_analysis.get('features', {})
            
            condition = cv_condition
            confidence_score = confidence
            
            # Store full CV analysis
            cv_insights = {
                'condition': cv_condition,
                'confidence': confidence,
                'tampered': tampered,
                'features': features,
                'cv_condition_used': True,
                'pricing_method': 'cv_automatic'
            }
            
            # Use CV-detected condition as PRIMARY factor
            cv_multiplier = self.price_multipliers.get(cv_condition, 0.65)
            final_price = base_price * cv_multiplier
            
            print(f"   ✅ Detected Condition: {cv_condition.upper()} (confidence: {confidence}%)")
            print(f"   📉 Condition multiplier: {cv_multiplier}x")
            print(f"   💵 Calculated price: ₹{int(final_price)}")
            
            # Apply image quality adjustments
            if features:
                sharpness = features.get('sharpness', 0)
                brightness = features.get('brightness', 0)
                
                # Bonus for high-quality images (indicates better product care)
                if sharpness > 150:
                    final_price *= 1.05  # 5% bonus for sharp images
                    cv_insights['quality_bonus'] = '5% for high-quality image'
                    print(f"   ✨ Quality bonus applied: +5%")
                
                # Penalty for poor lighting (suggests hiding defects)
                if brightness < 100 or brightness > 200:
                    final_price *= 0.95  # 5% reduction for poor lighting
                    cv_insights['lighting_penalty'] = '5% for poor lighting'
                    print(f"   ⚠️ Lighting penalty: -5%")
            
            # Apply tampered image penalty
            if tampered:
                final_price *= 0.70  # 30% reduction for suspected tampering
                cv_insights['tampered_penalty_applied'] = True
                print(f"   🚨 TAMPERED IMAGE DETECTED - 30% penalty applied")
        else:
            print(f"\n   ⚠️ No CV analysis available - using default condition: {condition}")
            cv_insights = {
                'message': 'No CV analysis provided - using default condition',
                'used_default_condition': condition,
                'pricing_method': 'fallback_manual'
            }
            # Use default condition multiplier
            condition_multiplier = self.price_multipliers.get(condition, 0.65)
            final_price = base_price * condition_multiplier
            print(f"   💵 Fallback price: ₹{int(final_price)}")
        
        # Round to nearest 100 for cleaner pricing
        final_price = round(final_price / 100) * 100
        
        # Ensure minimum viable price
        final_price = max(500, final_price)
        
        print(f"\n   🎯 FINAL ESTIMATED PRICE: ₹{int(final_price)}")
        
        return {
            'success': True,
            'predicted_price': int(final_price),
            'condition_detected': condition,
            'confidence': confidence_score,
            'cv_insights': cv_insights,
            'pricing_breakdown': {
                'base_market_price': int(base_market_prices.get(subcategory.lower(), 10000)),
                'brand_adjusted': int(base_price / location_factor),
                'location_adjusted': int(base_price),
                'condition_adjusted': int(final_price)
            },
            'automatic_pricing': True,
            'message': f'Price estimated from CV analysis - {condition} condition detected'
        }
    
    def train(self):
        """Train the model (placeholder for CV model)"""
        if len(self.training_data) > 0:
            self.is_trained = True
            return {
                'success': True,
                'message': f'CV pricing model initialized with {len(self.training_data)} reference samples',
                'samples': len(self.training_data)
            }
        else:
            return {
                'success': False,
                'message': 'No training data found'
            }


# Global model instance
cv_model = CVPricingModel()


def initialize_model():
    """Initialize and train the model with sample data"""
    # Load training data
    if cv_model.load_training_data():
        result = cv_model.train()
        return result
    else:
        return {
            'success': False,
            'message': 'No training data found'
        }


def get_price_prediction(product_data, cv_analysis=None):
    """
    Get price prediction for a product using computer vision
    
    Args:
        product_data (dict): Product information
        cv_analysis (dict): Computer vision analysis results (optional)
    
    Returns:
        dict: Prediction results
    """
    return cv_model.predict_with_cv(product_data, cv_analysis)


def add_product_to_training(product_data):
    """
    Add sold product to training data
    
    Args:
        product_data (dict): Sold product information
    
    Returns:
        dict: Success status
    """
    cv_model.add_training_data(product_data)
    cv_model.save_training_data()
    
    # Retrain model
    train_result = cv_model.train()
    
    return {
        'success': True,
        'message': 'Product added to training data',
        'training_result': train_result
    }
