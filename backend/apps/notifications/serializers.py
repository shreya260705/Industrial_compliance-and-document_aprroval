from rest_framework import serializers

class NotificationResponseSerializer(serializers.Serializer):
    id = serializers.CharField()
    notification_type = serializers.CharField()
    title = serializers.CharField()
    message = serializers.CharField()
    reference_id = serializers.CharField(allow_null=True)
    metadata = serializers.DictField()
    is_read = serializers.BooleanField()
    created_at = serializers.DateTimeField()
