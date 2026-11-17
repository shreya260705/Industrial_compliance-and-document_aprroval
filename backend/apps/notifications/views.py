from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from apps.common.responses import api_success_response
from apps.common.base_repository import BaseRepository
from apps.common.exceptions import ResourceNotFoundException
from apps.notifications.repository import NotificationRepository

notif_repo = NotificationRepository()

class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        unread_only = request.query_params.get('unread_only', 'false').lower() in ('true', '1')
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
        skip = (page - 1) * page_size

        notifications = notif_repo.find_by_user(
            user_id=request.user.id,
            unread_only=unread_only,
            skip=skip,
            limit=page_size
        )
        total = notif_repo.count_by_user(user_id=request.user.id, unread_only=unread_only)
        unread_total = notif_repo.count_by_user(user_id=request.user.id, unread_only=True)

        serialized = [BaseRepository.serialize_doc(n) for n in notifications]
        return api_success_response(
            data=serialized,
            meta={
                "unread_count": unread_total,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_records": total,
                    "total_pages": (total + page_size - 1) // page_size if total > 0 else 1
                }
            },
            request=request
        )

    def patch(self, request, notification_id):
        success = notif_repo.mark_as_read(notification_id, request.user.id)
        if not success:
            raise ResourceNotFoundException("Notification not found or access unauthorized.")
        return api_success_response(
            data={"notification_id": notification_id, "is_read": True},
            message="Notification marked as read.",
            request=request
        )


class NotificationReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated_count = notif_repo.mark_all_as_read(request.user.id)
        return api_success_response(
            data={"marked_read_count": updated_count},
            message=f"{updated_count} notifications marked as read.",
            request=request
        )
