"""
Computer Vision for Product Condition Detection
"""

import cv2
import numpy as np
import os
from sklearn.ensemble import RandomForestClassifier
import joblib
import hashlib
from datetime import datetime

class ConditionDetector:
    def __init__(self):
        self.model = None
        self.is_trained = False
        self.model_path = 'condition_model.joblib'
        self.load_model()
    
    def load_model(self):
        """Load pre-trained model if exists"""
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                self.is_trained = True
                print("✅ Condition detection model loaded")
            else:
                print("⚠️  No pre-trained condition detection model found")
        except Exception as e:
            print(f"⚠️  Failed to load condition detection model: {e}")
            self.model = None
            self.is_trained = False
    
    def save_model(self):
        """Save trained model"""
        try:
            joblib.dump(self.model, self.model_path)
            print("✅ Condition detection model saved")
        except Exception as e:
            print(f"⚠️  Failed to save condition detection model: {e}")
    
    def extract_features(self, image_path):
        """
        Extract features from image for condition detection
        Features include: blur, color variance, edge density, brightness, contrast
        """
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError("Could not read image")
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Feature 1: Blur detection (Laplacian variance)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Feature 2: Color variance
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            color_variance = np.var(hsv.reshape(-1, 3), axis=0).mean()
            
            # Feature 3: Edge density
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
            
            # Feature 4: Brightness
            brightness = np.mean(gray)
            
            # Feature 5: Contrast
            contrast = np.std(gray)
            
            # Feature 6: Image hash for tampering detection
            image_hash = hashlib.md5(cv2.imencode('.jpg', img)[1]).hexdigest()
            
            return np.array([laplacian_var, color_variance, edge_density, brightness, contrast]), image_hash
            
        except Exception as e:
            print(f"Error extracting features: {e}")
            # Return default features if extraction fails
            return np.array([1000, 100, 0.1, 128, 50]), "error"
    
    def detect_condition(self, image_path):
        """
        Detect product condition from image
        Returns: condition (new/excellent/good/fair/poor), confidence, tampered flag
        """
        try:
            # Extract features
            features, image_hash = self.extract_features(image_path)
            
            # Check for tampering (simple hash-based detection)
            tampered = self.check_tampering(image_hash)
            
            # If model is trained, use it for prediction
            if self.is_trained and self.model:
                # Reshape features for prediction
                features_reshaped = features.reshape(1, -1)
                
                # Get prediction and confidence
                prediction_proba = self.model.predict_proba(features_reshaped)[0]
                predicted_class = self.model.predict(features_reshaped)[0]
                confidence = np.max(prediction_proba) * 100
                
                # Map numeric classes to condition labels
                condition_labels = ['poor', 'fair', 'good', 'excellent', 'new']
                condition = condition_labels[predicted_class] if predicted_class < len(condition_labels) else 'unknown'
            else:
                # Fallback heuristic-based detection
                condition, confidence = self.heuristic_condition_detection(features)
            
            return {
                'condition': condition,
                'confidence': round(confidence, 2),
                'tampered': tampered,
                'features': {
                    'sharpness': round(features[0], 2),
                    'color_variance': round(features[1], 2),
                    'edge_density': round(features[2], 4),
                    'brightness': round(features[3], 2),
                    'contrast': round(features[4], 2)
                }
            }
            
        except Exception as e:
            print(f"Error in condition detection: {e}")
            return {
                'condition': 'unknown',
                'confidence': 0,
                'tampered': False,
                'error': str(e)
            }
    
    def heuristic_condition_detection(self, features):
        """
        Heuristic-based condition detection when model is not available
        """
        sharpness, color_variance, edge_density, brightness, contrast = features
        
        # Simple heuristic rules
        if sharpness > 1000 and contrast > 60:
            condition = 'new'
            confidence = 90
        elif sharpness > 500 and contrast > 40:
            condition = 'excellent'
            confidence = 80
        elif sharpness > 200 and contrast > 30:
            condition = 'good'
            confidence = 70
        elif sharpness > 100 and contrast > 20:
            condition = 'fair'
            confidence = 60
        else:
            condition = 'poor'
            confidence = 50
            
        return condition, confidence
    
    def check_tampering(self, image_hash):
        """
        Simple tampering detection based on image hash
        In a real implementation, this would check against a database of known good hashes
        """
        # This is a placeholder - in reality, you'd maintain a database of legitimate image hashes
        # For now, we'll just return False to indicate no tampering detected
        return False
    
    def train_model(self, training_data):
        """
        Train the condition detection model
        training_data: list of tuples (image_path, condition_label)
        condition_label: 0=p, 1=f, 2=g, 3=e, 4=n
        """
        try:
            features_list = []
            labels_list = []
            
            # Extract features from all training images
            for image_path, label in training_data:
                if os.path.exists(image_path):
                    features, _ = self.extract_features(image_path)
                    features_list.append(features)
                    labels_list.append(label)
            
            if len(features_list) < 5:
                return {
                    'success': False,
                    'message': 'Need at least 5 training samples'
                }
            
            # Train Random Forest classifier
            self.model = RandomForestClassifier(n_estimators=100, random_state=42)
            self.model.fit(features_list, labels_list)
            self.is_trained = True
            
            # Save model
            self.save_model()
            
            return {
                'success': True,
                'message': f'Model trained on {len(features_list)} samples',
                'samples': len(features_list)
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Training failed: {str(e)}'
            }

# Global instance
condition_detector = ConditionDetector()

def initialize_model():
    """Initialize the condition detection model"""
    global condition_detector
    return {
        'success': True,
        'message': 'Condition detection module initialized',
        'model_available': condition_detector.is_trained
    }

def detect_condition_from_image(image_path):
    """
    Detect condition from uploaded image
    """
    global condition_detector
    return condition_detector.detect_condition(image_path)

def train_condition_model(training_data):
    """
    Train the condition detection model
    """
    global condition_detector
    return condition_detector.train_model(training_data)

# Example usage for testing
if __name__ == "__main__":
    # Test the condition detection
    print("Testing condition detection...")
    result = initialize_model()
    print(result)