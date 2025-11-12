"""
KNN-based Buyer-Seller Matching
Matches buyers with nearby sellers based on location, budget, and preferences
"""

import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler
import math

class BuyerSellerMatcher:
    def __init__(self, k=5):
        """
        Initialize KNN matcher for buyer-seller matching
        
        Args:
            k (int): Number of nearest sellers to return (default: 5)
        """
        self.k = k
        self.scaler = StandardScaler()
        self.model = NearestNeighbors(
            n_neighbors=k,
            metric='euclidean',
            algorithm='auto'
        )
        self.sellers_data = []
        self.is_fitted = False
        
    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """
        Calculate distance between two coordinates using Haversine formula
        
        Args:
            lat1, lon1: First location coordinates
            lat2, lon2: Second location coordinates
        
        Returns:
            float: Distance in kilometers
        """
        R = 6371  # Earth's radius in kilometers
        
        # Convert to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    def _encode_category(self, category):
        """
        Encode product category to numerical value
        
        Args:
            category (str): Product category
        
        Returns:
            int: Encoded category value
        """
        category_map = {
            'electronics': 0,
            'phone': 1,
            'smartwatch': 2,
            'earphones': 3,
            'laptop': 4,
            'tablet': 5,
            'other': 6
        }
        return category_map.get(category.lower(), 6)
    
    def _encode_condition(self, condition):
        """
        Encode product condition to numerical value
        
        Args:
            condition (str): Product condition
        
        Returns:
            float: Encoded condition value (0-1)
        """
        condition_map = {
            'new': 1.0,
            'like-new': 0.9,
            'excellent': 0.8,
            'good': 0.6,
            'fair': 0.4,
            'poor': 0.2
        }
        return condition_map.get(condition.lower(), 0.5)
    
    def add_sellers(self, sellers):
        """
        Add sellers to the matching pool
        
        Args:
            sellers (list): List of seller dictionaries with:
                {
                    'sellerId': str,
                    'sellerName': str,
                    'productId': str,
                    'productTitle': str,
                    'productPrice': float,
                    'productCategory': str,
                    'productCondition': str,
                    'latitude': float,
                    'longitude': float,
                    'location': str (optional)
                }
        """
        self.sellers_data = sellers
        self.is_fitted = False
        
    def fit(self):
        """
        Fit the KNN model with seller data
        """
        if len(self.sellers_data) == 0:
            return {
                'success': False,
                'message': 'No sellers data available'
            }
        
        # Prepare feature matrix
        features = []
        for seller in self.sellers_data:
            feature_vector = [
                float(seller.get('latitude', 0)),
                float(seller.get('longitude', 0)),
                float(seller.get('productPrice', 0)),
                self._encode_category(seller.get('productCategory', 'other')),
                self._encode_condition(seller.get('productCondition', 'good'))
            ]
            features.append(feature_vector)
        
        X = np.array(features)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Fit KNN model
        k = min(self.k, len(self.sellers_data))  # Adjust k if fewer sellers
        self.model = NearestNeighbors(n_neighbors=k, metric='euclidean', algorithm='auto')
        self.model.fit(X_scaled)
        
        self.is_fitted = True
        
        return {
            'success': True,
            'message': f'Model fitted with {len(self.sellers_data)} sellers'
        }
    
    def find_matches(self, buyer_data):
        """
        Find best matching sellers for a buyer
        
        Args:
            buyer_data (dict): Buyer information:
                {
                    'latitude': float,
                    'longitude': float,
                    'budgetMin': float,
                    'budgetMax': float,
                    'preferredCategory': str,
                    'preferredCondition': str,
                    'maxDistance': float (optional, default 10 km)
                }
        
        Returns:
            dict: Matching results with seller information
        """
        if not self.is_fitted:
            fit_result = self.fit()
            if not fit_result['success']:
                return fit_result
        
        buyer_lat = float(buyer_data.get('latitude', 0))
        buyer_lon = float(buyer_data.get('longitude', 0))
        budget_min = float(buyer_data.get('budgetMin', 0))
        budget_max = float(buyer_data.get('budgetMax', 100000))
        max_distance = float(buyer_data.get('maxDistance', 10))  # Default 10 km
        preferred_category = buyer_data.get('preferredCategory', 'electronics')
        preferred_condition = buyer_data.get('preferredCondition', 'good')
        
        # Create buyer feature vector
        buyer_feature = np.array([[
            buyer_lat,
            buyer_lon,
            (budget_min + budget_max) / 2,  # Use average budget
            self._encode_category(preferred_category),
            self._encode_condition(preferred_condition)
        ]])
        
        # Scale buyer feature
        buyer_feature_scaled = self.scaler.transform(buyer_feature)
        
        # Find K nearest sellers
        k = min(self.k, len(self.sellers_data))
        distances, indices = self.model.kneighbors(buyer_feature_scaled, n_neighbors=k)
        
        # Prepare matched sellers with additional info
        matches = []
        for idx, distance in zip(indices[0], distances[0]):
            seller = self.sellers_data[idx]
            
            # Calculate actual geographical distance
            actual_distance = self.calculate_distance(
                buyer_lat, buyer_lon,
                float(seller.get('latitude', 0)),
                float(seller.get('longitude', 0))
            )
            
            # Check if within budget
            price = float(seller.get('productPrice', 0))
            within_budget = budget_min <= price <= budget_max
            
            # Check if within distance limit
            within_distance = actual_distance <= max_distance
            
            # Calculate match score (0-100)
            # Based on: distance (40%), budget match (40%), similarity (20%)
            distance_score = max(0, 100 - (actual_distance / max_distance * 100))
            
            if within_budget:
                budget_score = 100
            else:
                # Penalize out-of-budget items
                if price < budget_min:
                    budget_score = max(0, 100 - ((budget_min - price) / budget_min * 100))
                else:
                    budget_score = max(0, 100 - ((price - budget_max) / budget_max * 100))
            
            similarity_score = (1 / (1 + distance)) * 100  # Convert KNN distance to score
            
            match_score = (
                distance_score * 0.4 +
                budget_score * 0.4 +
                similarity_score * 0.2
            )
            
            matches.append({
                'sellerId': seller.get('sellerId'),
                'sellerName': seller.get('sellerName'),
                'productId': seller.get('productId'),
                'productTitle': seller.get('productTitle'),
                'productPrice': price,
                'productCategory': seller.get('productCategory'),
                'productCondition': seller.get('productCondition'),
                'productImage': seller.get('productImage', ''),
                'location': seller.get('location', 'Unknown'),
                'distance': round(actual_distance, 2),
                'withinBudget': within_budget,
                'withinDistance': within_distance,
                'matchScore': round(match_score, 1),
                'recommended': within_budget and within_distance
            })
        
        # Sort by match score (descending)
        matches.sort(key=lambda x: x['matchScore'], reverse=True)
        
        # Separate recommended and other matches
        recommended_matches = [m for m in matches if m['recommended']]
        other_matches = [m for m in matches if not m['recommended']]
        
        return {
            'success': True,
            'buyerLocation': {
                'latitude': buyer_lat,
                'longitude': buyer_lon
            },
            'budget': {
                'min': budget_min,
                'max': budget_max
            },
            'maxDistance': max_distance,
            'totalMatches': len(matches),
            'recommendedMatches': len(recommended_matches),
            'matches': recommended_matches + other_matches[:10 - len(recommended_matches)],  # Top 10 total
            'statistics': {
                'averageDistance': round(np.mean([m['distance'] for m in matches]), 2),
                'averagePrice': round(np.mean([m['productPrice'] for m in matches]), 2),
                'withinBudget': len([m for m in matches if m['withinBudget']]),
                'withinDistance': len([m for m in matches if m['withinDistance']])
            }
        }


# Global matcher instance
buyer_seller_matcher = BuyerSellerMatcher(k=10)  # Find top 10 matches









