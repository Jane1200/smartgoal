"""
KNN-based Price Prediction for Resale Items
Predicts optimal pricing based on similar products in the area
"""

import numpy as np
from sklearn.neighbors import KNeighborsRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
import json
import os
from datetime import datetime

class KNNPricingModel:
    def __init__(self, k=5):
        """
        Initialize KNN pricing model
        
        Args:
            k (int): Number of neighbors to consider (default: 5)
        """
        self.k = k
        self.model = KNeighborsRegressor(
            n_neighbors=k,
            weights='distance',  # Closer items have more influence
            metric='euclidean'
        )
        self.scaler = StandardScaler()
        self.encoders = {}
        self.is_trained = False
        self.training_data = []
        
    def load_training_data(self, data_file='sample_data.json'):
        """Load training data from JSON file"""
        file_path = os.path.join(os.path.dirname(__file__), data_file)
        
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                self.training_data = json.load(f)
            return True
        return False
    
    def add_training_data(self, product_data):
        """
        Add new product data to training set
        
        Args:
            product_data (dict): Product information
                {
                    'title': str,
                    'category': str,
                    'condition': str,
                    'location': str,
                    'originalPrice': float,
                    'sellingPrice': float,
                    'ageMonths': int,
                    'brand': str (optional)
                }
        """
        self.training_data.append(product_data)
        return True
    
    def save_training_data(self, data_file='sample_data.json'):
        """Save training data to JSON file"""
        file_path = os.path.join(os.path.dirname(__file__), data_file)
        with open(file_path, 'w') as f:
            json.dump(self.training_data, f, indent=2)
        return True
    
    def _encode_features(self, data, fit=False):
        """
        Encode categorical features to numerical values
        
        Args:
            data (list): List of product dictionaries
            fit (bool): Whether to fit encoders (training) or just transform
        
        Returns:
            numpy.ndarray: Encoded feature matrix
        """
        features = []
        
        for item in data:
            # Categorical features
            category = item.get('category', 'other')
            condition = item.get('condition', 'good')
            location = item.get('location', 'unknown')
            brand = item.get('brand', 'generic')
            
            # Numerical features
            original_price = float(item.get('originalPrice', 0))
            age_months = int(item.get('ageMonths', 0))
            
            if fit:
                # Create encoders if they don't exist
                if 'category' not in self.encoders:
                    self.encoders['category'] = LabelEncoder()
                    self.encoders['condition'] = LabelEncoder()
                    self.encoders['location'] = LabelEncoder()
                    self.encoders['brand'] = LabelEncoder()
                    
                    # Initialize with empty classes
                    self.encoders['category'].classes_ = np.array([])
                    self.encoders['condition'].classes_ = np.array([])
                    self.encoders['location'].classes_ = np.array([])
                    self.encoders['brand'].classes_ = np.array([])
                
                # Add new classes if not present
                if category not in self.encoders['category'].classes_:
                    self.encoders['category'].classes_ = np.append(
                        self.encoders['category'].classes_, category
                    )
                if condition not in self.encoders['condition'].classes_:
                    self.encoders['condition'].classes_ = np.append(
                        self.encoders['condition'].classes_, condition
                    )
                if location not in self.encoders['location'].classes_:
                    self.encoders['location'].classes_ = np.append(
                        self.encoders['location'].classes_, location
                    )
                if brand not in self.encoders['brand'].classes_:
                    self.encoders['brand'].classes_ = np.append(
                        self.encoders['brand'].classes_, brand
                    )
            
            # Encode categorical features
            try:
                category_encoded = self.encoders['category'].transform([category])[0]
            except:
                category_encoded = 0
                
            try:
                condition_encoded = self.encoders['condition'].transform([condition])[0]
            except:
                condition_encoded = 0
                
            try:
                location_encoded = self.encoders['location'].transform([location])[0]
            except:
                location_encoded = 0
                
            try:
                brand_encoded = self.encoders['brand'].transform([brand])[0]
            except:
                brand_encoded = 0
            
            # Combine all features
            feature_vector = [
                category_encoded,
                condition_encoded,
                location_encoded,
                brand_encoded,
                original_price,
                age_months
            ]
            
            features.append(feature_vector)
        
        return np.array(features)
    
    def train(self):
        """Train the KNN model on available data"""
        if len(self.training_data) < self.k:
            return {
                'success': False,
                'message': f'Need at least {self.k} training samples, have {len(self.training_data)}'
            }
        
        # Prepare features (X) and target (y)
        X = self._encode_features(self.training_data, fit=True)
        y = np.array([item['sellingPrice'] for item in self.training_data])
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train model
        self.model.fit(X_scaled, y)
        self.is_trained = True
        
        return {
            'success': True,
            'message': f'Model trained on {len(self.training_data)} samples',
            'samples': len(self.training_data)
        }
    
    def predict(self, product_data):
        """
        Predict optimal price for a product
        
        Args:
            product_data (dict): Product information
        
        Returns:
            dict: Prediction results with price, range, and similar items
        """
        if not self.is_trained:
            return {
                'success': False,
                'message': 'Model not trained yet'
            }
        
        # Encode input features
        X_input = self._encode_features([product_data], fit=False)
        X_input_scaled = self.scaler.transform(X_input)
        
        # Predict price
        predicted_price = self.model.predict(X_input_scaled)[0]
        
        # Get K nearest neighbors
        distances, indices = self.model.kneighbors(X_input_scaled)
        
        # Get similar products info
        similar_products = []
        prices = []
        
        for idx, distance in zip(indices[0], distances[0]):
            similar_item = self.training_data[idx]
            price = similar_item['sellingPrice']
            prices.append(price)
            
            similar_products.append({
                'title': similar_item.get('title', 'Unknown'),
                'price': price,
                'condition': similar_item.get('condition', 'N/A'),
                'location': similar_item.get('location', 'N/A'),
                'similarity': float(1 / (1 + distance))  # Convert distance to similarity
            })
        
        # Calculate price range
        min_price = min(prices)
        max_price = max(prices)
        avg_price = np.mean(prices)
        median_price = np.median(prices)
        
        # Round to nearest 50
        predicted_price = round(predicted_price / 50) * 50
        avg_price = round(avg_price / 50) * 50
        median_price = round(median_price / 50) * 50
        
        return {
            'success': True,
            'predicted_price': int(predicted_price),
            'average_price': int(avg_price),
            'median_price': int(median_price),
            'price_range': {
                'min': int(min_price),
                'max': int(max_price)
            },
            'similar_products': similar_products,
            'k_neighbors': self.k,
            'confidence': self._calculate_confidence(distances[0])
        }
    
    def _calculate_confidence(self, distances):
        """
        Calculate confidence score based on neighbor distances
        
        Args:
            distances (array): Distances to K nearest neighbors
        
        Returns:
            float: Confidence score (0-100)
        """
        # Lower average distance = higher confidence
        avg_distance = np.mean(distances)
        
        # Normalize to 0-100 scale (arbitrary scaling)
        # If avg distance is < 1, confidence is high (>80)
        # If avg distance is > 5, confidence is low (<50)
        if avg_distance < 1:
            confidence = 90
        elif avg_distance < 2:
            confidence = 80
        elif avg_distance < 3:
            confidence = 70
        elif avg_distance < 5:
            confidence = 60
        else:
            confidence = 50
        
        return confidence


# Global model instance
knn_model = KNNPricingModel(k=5)


def initialize_model():
    """Initialize and train the model with sample data"""
    # Load training data
    if knn_model.load_training_data():
        result = knn_model.train()
        return result
    else:
        return {
            'success': False,
            'message': 'No training data found'
        }


def get_price_prediction(product_data):
    """
    Get price prediction for a product
    
    Args:
        product_data (dict): Product information
    
    Returns:
        dict: Prediction results
    """
    return knn_model.predict(product_data)


def add_product_to_training(product_data):
    """
    Add sold product to training data
    
    Args:
        product_data (dict): Sold product information
    
    Returns:
        dict: Success status
    """
    knn_model.add_training_data(product_data)
    knn_model.save_training_data()
    
    # Retrain model
    train_result = knn_model.train()
    
    return {
        'success': True,
        'message': 'Product added to training data',
        'training_result': train_result
    }

