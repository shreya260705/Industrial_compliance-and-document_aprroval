from django.urls import path
from apps.notifications.views import NotificationListView, NotificationReadAllView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('/<str:notification_id>/read', NotificationListView.as_view(), name='notification-mark-read'),
    path('/read-all', NotificationReadAllView.as_view(), name='notification-read-all'),
]
