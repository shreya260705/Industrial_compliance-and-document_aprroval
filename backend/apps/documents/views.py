"""
Document Vault API Views.
Enforces private Supabase bucket storage, signed token transfers,
deep magic-byte verification, and strict tenant ownership.
"""

import uuid
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from apps.common.responses import api_success_response, api_error_response
from apps.common.base_repository import BaseRepository
from apps.common.exceptions import ResourceNotFoundException, PermissionDeniedException, ValidationException
from apps.common.audit import log_audit_event
from apps.authentication.permissions import (
    IsBusinessOwner,
    IsDepartmentOfficer,
    IsSuperAdmin,
    IsOwnerOrOfficer
)
from apps.businesses.repository import BusinessRepository
from apps.documents.repository import DocumentRepository
from apps.documents.services.supabase_storage import SupabaseStorageService
from apps.documents.services.file_validator import FileValidator
from apps.documents.serializers import (
    UploadSessionRequestSerializer,
    UploadConfirmRequestSerializer,
    DirectUploadSerializer,
    DocumentUpdateSerializer
)

doc_repo = DocumentRepository()
biz_repo = BusinessRepository()
storage_service = SupabaseStorageService()


def _officer_authorized_for_doc(officer_user, doc) -> bool:
    """Checks whether an officer is authorized to access or verify a vault document."""
    from apps.database.connection import get_db
    db = get_db()
    officer_oid = BaseRepository.to_object_id(officer_user.id)
    doc_oid = doc["_id"]

    # 1. Directly assigned to officer or previously verified by officer
    if doc.get("assigned_officer_id") and doc.get("assigned_officer_id") == officer_oid:
        return True
    if doc.get("verified_by_officer_id") and doc.get("verified_by_officer_id") == officer_oid:
        return True

    # 2. Check officer's scope against applications referencing document
    off_prof = getattr(officer_user, "officer_profile", {}) or {}
    off_dept = off_prof.get("department_code")
    off_state = off_prof.get("jurisdiction_code")

    app = db.applications.find_one({
        "attached_documents.vault_document_id": {"$in": [doc_oid, str(doc_oid)]}
    })
    if app:
        if app.get("assigned_officer_id") and app["assigned_officer_id"] == officer_oid:
            return True
        if off_dept and app.get("department_code") == off_dept:
            if not off_state or off_state == "IN-ALL" or app.get("state_code") == off_state:
                return True

    # 3. Scheme applications referencing document
    scheme_app = db.scheme_applications.find_one({
        "attached_vault_documents.vault_document_id": {"$in": [doc_oid, str(doc_oid)]}
    })
    if scheme_app:
        if scheme_app.get("assigned_officer_id") and scheme_app["assigned_officer_id"] == officer_oid:
            return True
        if off_dept and scheme_app.get("department_code") == off_dept:
            if not off_state or off_state == "IN-ALL" or scheme_app.get("state_code") == off_state:
                return True

    # 4. Grievance referencing document
    grv = db.grievances.find_one({
        "vault_document_ids": {"$in": [doc_oid, str(doc_oid)]}
    })
    if grv:
        if grv.get("assigned_officer_id") and grv["assigned_officer_id"] == officer_oid:
            return True
        if off_dept and grv.get("department_code") == off_dept:
            return True

    return False


def _get_authorized_doc(request, document_id):
    """Enforces role-based document access control for details, previews, and downloads."""
    user_role = getattr(request.user, "role", "")
    if user_role == "BUSINESS_OWNER":
        doc = doc_repo.find_by_id_for_user(document_id, request.user.id)
        if not doc:
            raise ResourceNotFoundException("Document not found in enterprise vault.")
        return doc
    elif user_role == "SUPER_ADMIN":
        doc = doc_repo.find_by_id_raw(document_id)
        if not doc:
            raise ResourceNotFoundException("Document not found.")
        return doc
    elif user_role == "DEPARTMENT_OFFICER":
        doc = doc_repo.find_by_id_raw(document_id)
        if not doc:
            raise ResourceNotFoundException("Document not found.")
        if not _officer_authorized_for_doc(request.user, doc):
            raise PermissionDeniedException("You are not authorized to access this document.")
        return doc
    else:
        raise PermissionDeniedException("Access unauthorized.")


class DocumentListView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def get(self, request):
        user_role = getattr(request.user, "role", "")
        business_id = request.query_params.get("business_id")
        category = request.query_params.get("category")
        location_id = request.query_params.get("location_id")
        search_query = request.query_params.get("search")
        status_filter = request.query_params.get("status") or request.query_params.get("verification_status")

        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = min(100, max(1, int(request.query_params.get("page_size", 50))))
        except ValueError:
            page = 1
            page_size = 50

        skip = (page - 1) * page_size

        if user_role == "DEPARTMENT_OFFICER":
            officer_oid = BaseRepository.to_object_id(request.user.id)
            query = {
                "is_active": {"$ne": False},
                "$or": [
                    {"assigned_officer_id": officer_oid},
                    {"verified_by_officer_id": officer_oid}
                ]
            }
            if category:
                query["document_category"] = category.strip().upper()
            if status_filter:
                query["verification_status"] = status_filter.strip().upper()
            if search_query:
                regex = {"$regex": search_query.strip(), "$options": "i"}
                query["$and"] = [{"$or": query.pop("$or")}, {"$or": [{"document_name": regex}, {"original_filename": regex}]}]

            cursor = doc_repo.collection.find(query).sort("created_at", -1).skip(skip).limit(page_size)
            docs = list(cursor)
            total = doc_repo.collection.count_documents(query)

        elif user_role == "SUPER_ADMIN":
            query = {"is_active": {"$ne": False}}
            if business_id:
                query["business_id"] = BaseRepository.to_object_id(business_id)
            if category:
                query["document_category"] = category.strip().upper()
            if status_filter:
                query["verification_status"] = status_filter.strip().upper()
            if search_query:
                regex = {"$regex": search_query.strip(), "$options": "i"}
                query["$or"] = [{"document_name": regex}, {"original_filename": regex}]

            cursor = doc_repo.collection.find(query).sort("created_at", -1).skip(skip).limit(page_size)
            docs = list(cursor)
            total = doc_repo.collection.count_documents(query)

        else:  # BUSINESS_OWNER
            if business_id:
                # Verify user owns the target business
                biz = biz_repo.find_by_id_for_owner(business_id, request.user.id)
                if not biz:
                    raise PermissionDeniedException("You do not have permission to access documents for this business.")

                docs = doc_repo.find_by_business(
                    business_id=business_id,
                    user_id=request.user.id,
                    category=category,
                    location_id=location_id,
                    search_query=search_query,
                    skip=skip,
                    limit=page_size
                )
                total = doc_repo.count_by_business(
                    business_id=business_id,
                    user_id=request.user.id,
                    category=category,
                    location_id=location_id,
                    search_query=search_query
                )
            else:
                # Aggregate documents across all businesses owned by user
                user_businesses = biz_repo.find_by_owner(request.user.id)
                biz_ids = [b["_id"] for b in user_businesses]
                query = {"business_id": {"$in": biz_ids}, "is_active": {"$ne": False}}
                if category:
                    query["document_category"] = category.strip().upper()
                if search_query:
                    regex = {"$regex": search_query.strip(), "$options": "i"}
                    query["$or"] = [{"document_name": regex}, {"original_filename": regex}]

                cursor = doc_repo.collection.find(query).sort("created_at", -1).skip(skip).limit(page_size)
                docs = list(cursor)
                total = doc_repo.collection.count_documents(query)

        serialized = [BaseRepository.serialize_doc(d) for d in docs]
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return api_success_response(
            data=serialized,
            meta={
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_records": total,
                    "total_pages": total_pages
                }
            },
            request=request
        )


class UploadSessionView(APIView):
    permission_classes = [IsBusinessOwner]

    def post(self, request):
        serializer = UploadSessionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        business_id = data["business_id"]
        biz = biz_repo.find_by_id_for_owner(business_id, request.user.id)
        if not biz:
            raise PermissionDeniedException("Unauthorized to upload documents for this enterprise.")

        # Sanitize filename and validate extension
        raw_filename = data["filename"]
        clean_name = FileValidator.sanitize_filename(raw_filename)
        _, ext = clean_name.rsplit('.', 1) if '.' in clean_name else ('', '')
        if f".{ext.lower()}" not in {'.pdf', '.png', '.jpg', '.jpeg'}:
            raise ValidationException(
                f"File format '.{ext}' is unsupported. Only PDF, PNG, JPG, and JPEG files are permitted.",
                error_code="UNSUPPORTED_FORMAT"
            )

        # Unpredictable storage object path
        random_suffix = uuid.uuid4().hex[:12]
        object_path = f"businesses/{business_id}/docs/{random_suffix}_{clean_name}"

        session_info = storage_service.create_signed_upload_url(object_path)

        return api_success_response(
            data={
                "signed_upload_url": session_info["signed_upload_url"],
                "token": session_info["token"],
                "storage_object_path": session_info["object_path"],
                "bucket": session_info["bucket"],
                "expires_in_seconds": 600
            },
            message="Short-lived upload session initialized. Upload file directly to signed URL.",
            status_code=201,
            request=request
        )


class ConfirmUploadView(APIView):
    permission_classes = [IsBusinessOwner]

    def post(self, request):
        serializer = UploadConfirmRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        business_id = data["business_id"]
        biz = biz_repo.find_by_id_for_owner(business_id, request.user.id)
        if not biz:
            raise PermissionDeniedException("Unauthorized access to business vault.")

        object_path = data["storage_object_path"]

        # Fetch bytes from Supabase private storage to verify upload and content
        try:
            file_bytes = storage_service.get_file_bytes(object_path)
        except Exception as exc:
            raise ValidationException(
                f"Document confirmation failed: Uploaded file not found in storage. {str(exc)}",
                error_code="FILE_NOT_FOUND_IN_STORAGE"
            )

        # Server-side security verification: extension, MIME, magic-bytes, file size, SHA-256
        category = data["document_category"]
        _, detected_mime, sha256_hash = FileValidator.validate_file(
            filename=data["original_filename"],
            file_bytes=file_bytes,
            category=category
        )

        # Duplicate check within business
        existing_dup = doc_repo.find_by_checksum(business_id, sha256_hash)
        version_num = 1
        if existing_dup:
            version_num = existing_dup.get("version_number", 1) + 1

        doc = doc_repo.create_document(
            owner_user_id=request.user.id,
            business_id=business_id,
            document_name=data["document_name"],
            document_category=category,
            original_filename=data["original_filename"],
            storage_object_path=object_path,
            mime_type=detected_mime,
            file_size_bytes=len(file_bytes),
            sha256_checksum=sha256_hash,
            location_id=data.get("location_id"),
            expiry_date=data.get("expiry_date"),
            verification_status="UPLOADED",
            version_number=version_num
        )

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            action="DOCUMENT_VAULT_UPLOADED",
            target_collection="business_documents",
            target_id=doc["_id"],
            delta={
                "business_id": str(business_id),
                "document_name": doc["document_name"],
                "category": doc["document_category"],
                "sha256": sha256_hash
            },
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT")
        )

        return api_success_response(
            data=BaseRepository.serialize_doc(doc),
            message="Document uploaded and verified in vault successfully.",
            status_code=201,
            request=request
        )


class DirectUploadView(APIView):
    """
    Direct server-mediated upload endpoint.
    Performs atomic validation, SHA-256 checksum, magic byte inspection,
    private storage streaming, and MongoDB metadata registration in a single call.
    """
    permission_classes = [IsBusinessOwner]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = DirectUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        business_id = data["business_id"]
        biz = biz_repo.find_by_id_for_owner(business_id, request.user.id)
        if not biz:
            raise PermissionDeniedException("Unauthorized access to business vault.")

        uploaded_file = data["file"]
        file_bytes = uploaded_file.read()
        filename = FileValidator.sanitize_filename(uploaded_file.name)
        category = data["document_category"]

        # Validate file
        _, detected_mime, sha256_hash = FileValidator.validate_file(
            filename=filename,
            file_bytes=file_bytes,
            category=category
        )

        # Generate unique storage path
        random_suffix = uuid.uuid4().hex[:12]
        object_path = f"businesses/{business_id}/docs/{random_suffix}_{filename}"

        # Upload bytes to Supabase private storage
        storage_service.upload_file_bytes(
            object_path=object_path,
            file_bytes=file_bytes,
            content_type=detected_mime
        )

        # Duplicate check within business
        existing_dup = doc_repo.find_by_checksum(business_id, sha256_hash)
        version_num = (existing_dup.get("version_number", 1) + 1) if existing_dup else 1

        doc = doc_repo.create_document(
            owner_user_id=request.user.id,
            business_id=business_id,
            document_name=data["document_name"],
            document_category=category,
            original_filename=filename,
            storage_object_path=object_path,
            mime_type=detected_mime,
            file_size_bytes=len(file_bytes),
            sha256_checksum=sha256_hash,
            location_id=data.get("location_id"),
            expiry_date=data.get("expiry_date"),
            verification_status="UPLOADED",
            version_number=version_num
        )

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            action="DOCUMENT_VAULT_DIRECT_UPLOAD",
            target_collection="business_documents",
            target_id=doc["_id"],
            delta={
                "business_id": str(business_id),
                "document_name": doc["document_name"],
                "category": doc["document_category"],
                "sha256": sha256_hash
            },
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT")
        )

        return api_success_response(
            data=BaseRepository.serialize_doc(doc),
            message="Document uploaded and verified in vault successfully.",
            status_code=201,
            request=request
        )


class DocumentDetailView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def get(self, request, document_id):
        doc = _get_authorized_doc(request, document_id)
        return api_success_response(data=BaseRepository.serialize_doc(doc), request=request)

    def patch(self, request, document_id):
        serializer = DocumentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated = doc_repo.update_document(
            document_id=document_id,
            user_id=request.user.id,
            update_data=serializer.validated_data
        )
        if not updated:
            raise ResourceNotFoundException("Document not found or access unauthorized.")

        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message="Document metadata updated successfully.",
            request=request
        )

    def delete(self, request, document_id):
        deleted = doc_repo.soft_delete_document(document_id, request.user.id)
        if not deleted:
            raise ResourceNotFoundException("Document not found or access unauthorized.")

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            action="DOCUMENT_VAULT_ARCHIVED",
            target_collection="business_documents",
            target_id=document_id,
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT")
        )

        return api_success_response(
            data={"document_id": document_id, "is_active": False},
            message="Document archived successfully.",
            request=request
        )


class DocumentPreviewView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def get(self, request, document_id):
        doc = _get_authorized_doc(request, document_id)

        # Generate temporary signed preview URL (15 minutes expiry)
        signed_preview_url = storage_service.create_signed_download_url(
            object_path=doc["storage_object_path"],
            expires_in=900
        )

        return api_success_response(
            data={
                "document_id": str(doc["_id"]),
                "document_name": doc["document_name"],
                "mime_type": doc["mime_type"],
                "preview_url": signed_preview_url,
                "expires_in_seconds": 900
            },
            message="Temporary signed preview URL generated successfully.",
            request=request
        )


class DocumentDownloadView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def get(self, request, document_id):
        doc = _get_authorized_doc(request, document_id)

        signed_download_url = storage_service.create_signed_download_url(
            object_path=doc["storage_object_path"],
            expires_in=900
        )

        return api_success_response(
            data={
                "document_id": str(doc["_id"]),
                "original_filename": doc["original_filename"],
                "download_url": signed_download_url,
                "expires_in_seconds": 900
            },
            message="Temporary signed download URL generated successfully.",
            request=request
        )


class DocumentVerificationView(APIView):
    """
    Officer document verification endpoint.
    Records verification decisions ('VERIFIED', 'CORRECTION_REQUESTED', 'REJECTED') with mandatory remarks.
    """
    permission_classes = [IsOwnerOrOfficer]

    def post(self, request, document_id):
        user_role = getattr(request.user, "role", "")
        if user_role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            raise PermissionDeniedException("Only Department Officers or Super Admins can verify documents.")

        doc = doc_repo.find_by_id_raw(document_id)
        if not doc:
            raise ResourceNotFoundException("Document not found.")

        if user_role == "DEPARTMENT_OFFICER" and not _officer_authorized_for_doc(request.user, doc):
            raise PermissionDeniedException("You are not authorized to verify this document.")

        decision = request.data.get("decision", "").strip().upper()
        remarks = request.data.get("remarks", "").strip()

        if decision not in ("VERIFIED", "CORRECTION_REQUESTED", "REJECTED"):
            raise ValidationException("Invalid decision. Must be 'VERIFIED', 'CORRECTION_REQUESTED', or 'REJECTED'.")

        if decision in ("CORRECTION_REQUESTED", "REJECTED") and not remarks:
            raise ValidationException(f"Remarks are mandatory when decision is '{decision}'.")

        try:
            updated = doc_repo.record_verification_decision(
                document_id=document_id,
                officer_user_id=request.user.id,
                officer_name=getattr(request.user, "full_name", "Statutory Officer"),
                officer_email=getattr(request.user, "email", ""),
                officer_role=user_role,
                decision=decision,
                remarks=remarks
            )
        except ValueError as err:
            raise ValidationException(str(err))

        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message=f"Document verification decision '{decision}' recorded successfully.",
            request=request
        )


class DocumentResubmitView(APIView):
    """
    Business Owner document resubmission endpoint.
    Accepts corrected document file, uploads to private storage, archives old version,
    and increments version number while setting status to RESUBMITTED.
    """
    permission_classes = [IsBusinessOwner]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, document_id):
        doc = doc_repo.find_by_id_for_user(document_id, request.user.id)
        if not doc:
            raise ResourceNotFoundException("Document not found in business vault.")

        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            raise ValidationException("New document file is required for resubmission.")

        file_bytes = uploaded_file.read()
        filename = FileValidator.sanitize_filename(uploaded_file.name)

        category = doc.get("document_category", "OTHER")
        _, detected_mime, sha256_hash = FileValidator.validate_file(
            filename=filename,
            file_bytes=file_bytes,
            category=category
        )

        storage_path = f"businesses/{doc['business_id']}/docs/v{doc.get('version_number', 1) + 1}_{filename}"
        storage_service.upload_file_bytes(
            object_path=storage_path,
            file_bytes=file_bytes,
            content_type=detected_mime
        )

        try:
            updated = doc_repo.resubmit_version(
                document_id=document_id,
                user_id=request.user.id,
                original_filename=filename,
                storage_object_path=storage_path,
                mime_type=detected_mime,
                file_size_bytes=len(file_bytes),
                sha256_checksum=sha256_hash
            )
        except ValueError as err:
            raise ValidationException(str(err))

        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message="Document version resubmitted successfully. Notified reviewing officer.",
            request=request
        )


class DocumentAssignView(APIView):
    """
    Super Admin endpoint to assign an explicit officer to review a document.
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request, document_id):
        from apps.common.workflow_engine import WorkflowEngine
        officer_id = request.data.get("officer_user_id")
        remarks = request.data.get("remarks", "Document assigned for review.")

        if not officer_id:
            raise ValidationException("officer_user_id is required.")

        try:
            updated = WorkflowEngine.assign_officer(
                target_collection="business_documents",
                target_id=document_id,
                officer_user_id=officer_id,
                assigned_by_user_id=request.user.id,
                assigned_by_role=request.user.role,
                remarks=remarks
            )
        except ValueError as err:
            raise ValidationException(str(err))

        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message="Officer assigned to document review successfully.",
            request=request
        )
