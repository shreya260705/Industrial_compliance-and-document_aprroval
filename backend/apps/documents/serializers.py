"""
Document Vault DRF Serializers.
Supports both 'document_name' and 'title' for flexible client interoperability.
"""

from rest_framework import serializers
from apps.documents.repository import VALID_DOCUMENT_CATEGORIES

class UploadSessionRequestSerializer(serializers.Serializer):
    business_id = serializers.CharField(required=True)
    document_name = serializers.CharField(required=False, min_length=2, max_length=150)
    title = serializers.CharField(required=False, min_length=2, max_length=150)
    document_category = serializers.ChoiceField(choices=VALID_DOCUMENT_CATEGORIES, required=True)
    filename = serializers.CharField(required=True, min_length=3, max_length=150)
    location_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    expiry_date = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        name = attrs.get('document_name') or attrs.get('title')
        if not name:
            raise serializers.ValidationError({"document_name": "Document name or title is required."})
        attrs['document_name'] = name.strip()
        return attrs


class UploadConfirmRequestSerializer(serializers.Serializer):
    business_id = serializers.CharField(required=True)
    document_name = serializers.CharField(required=False, min_length=2, max_length=150)
    title = serializers.CharField(required=False, min_length=2, max_length=150)
    document_category = serializers.ChoiceField(choices=VALID_DOCUMENT_CATEGORIES, required=True)
    original_filename = serializers.CharField(required=True)
    storage_object_path = serializers.CharField(required=True)
    location_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    expiry_date = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        name = attrs.get('document_name') or attrs.get('title')
        if not name:
            raise serializers.ValidationError({"document_name": "Document name or title is required."})
        attrs['document_name'] = name.strip()
        return attrs


class DirectUploadSerializer(serializers.Serializer):
    business_id = serializers.CharField(required=True)
    document_name = serializers.CharField(required=False, min_length=2, max_length=150)
    title = serializers.CharField(required=False, min_length=2, max_length=150)
    document_category = serializers.ChoiceField(choices=VALID_DOCUMENT_CATEGORIES, required=True)
    file = serializers.FileField(required=True)
    location_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    expiry_date = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        name = attrs.get('document_name') or attrs.get('title')
        if not name:
            raise serializers.ValidationError({"document_name": "Document name or title is required."})
        attrs['document_name'] = name.strip()
        return attrs


class DocumentUpdateSerializer(serializers.Serializer):
    document_name = serializers.CharField(required=False, min_length=2, max_length=150)
    title = serializers.CharField(required=False, min_length=2, max_length=150)
    document_category = serializers.ChoiceField(choices=VALID_DOCUMENT_CATEGORIES, required=False)
    location_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    expiry_date = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        name = attrs.get('document_name') or attrs.get('title')
        if name:
            attrs['document_name'] = name.strip()
        return attrs
