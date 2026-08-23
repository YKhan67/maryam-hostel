# backend/accounts/parsers.py

from rest_framework.parsers import MultiPartParser
import json


class CustomMultiPartParser(MultiPartParser):
    """
    Custom MultiPartParser that properly handles FormData.
    Converts list values to single values and parses JSON strings.
    """
    def parse(self, stream, media_type=None, parser_context=None):
        """
        Parse the incoming data and normalize it.
        """
        # Let DRF do the initial parsing
        result = super().parse(stream, media_type, parser_context)
        
        # Get the data as a mutable dict
        if hasattr(result, 'data'):
            data = dict(result.data)
        else:
            data = {}
        
        # Normalize all values - convert lists to single values
        normalized = {}
        for key, value in data.items():
            if isinstance(value, list):
                # If it's a list with one item, take that item
                normalized[key] = value[0] if value else ''
            else:
                normalized[key] = value
        
        # Handle profile JSON if it's a string
        if 'profile' in normalized and isinstance(normalized['profile'], str):
            try:
                normalized['profile'] = json.loads(normalized['profile'])
            except:
                pass
        
        # Convert string boolean to actual boolean
        if 'is_active' in normalized and isinstance(normalized['is_active'], str):
            normalized['is_active'] = normalized['is_active'].lower() == 'true'
        
        # Override the data
        result.data = normalized
        return result