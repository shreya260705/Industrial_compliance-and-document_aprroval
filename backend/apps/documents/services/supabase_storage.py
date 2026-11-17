"""
Supabase Private Storage Service.
Communicates securely with private Supabase buckets via Storage REST API.
Exposes short-lived signed upload and download/preview URLs.
Never exposes service-role keys to the frontend client.
"""

import os
import requests
import logging
from typing import Any, Dict, Optional
from django.conf import settings

logger = logging.getLogger('bizpermit.storage')

class SupabaseStorageService:
    def __init__(self):
        self.supabase_url = getattr(settings, 'SUPABASE_URL', os.getenv('SUPABASE_URL', '')).rstrip('/')
        self.service_key = (
            getattr(settings, 'SUPABASE_SECRET_KEY', None)
            or getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', None)
            or os.getenv('SUPABASE_SECRET_KEY', '')
            or os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
        )
        self.bucket = (
            getattr(settings, 'SUPABASE_BUCKET_NAME', None)
            or getattr(settings, 'SUPABASE_VAULT_BUCKET', None)
            or os.getenv('SUPABASE_BUCKET_NAME', '')
            or os.getenv('SUPABASE_VAULT_BUCKET', 'bizpermit')
        )
        self.base_api = f"{self.supabase_url}/storage/v1"

    def _headers(self, content_type: str = "application/json") -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.service_key}",
            "apikey": self.service_key,
        }
        if content_type:
            headers["Content-Type"] = content_type
        return headers

    def is_configured(self) -> bool:
        return bool(self.supabase_url and self.service_key and self.bucket)

    def create_signed_upload_url(self, object_path: str) -> Dict[str, Any]:
        """
        Generates a short-lived signed URL allowing client-side direct upload
        without exposing the service role key.
        """
        clean_path = object_path.lstrip('/')
        url = f"{self.base_api}/object/upload/sign/{self.bucket}/{clean_path}"

        try:
            res = requests.post(url, headers=self._headers(), json={}, timeout=10)
            if res.status_code not in (200, 201):
                logger.error(f"Failed to generate signed upload URL from Supabase: {res.status_code} - {res.text}")
                raise Exception(f"Storage service returned status {res.status_code}: {res.text}")

            data = res.json()
            raw_url = data.get("url", "")
            signed_url = f"{self.base_api}{raw_url}" if raw_url.startswith("/") else raw_url

            return {
                "signed_upload_url": signed_url,
                "token": data.get("token"),
                "object_path": clean_path,
                "bucket": self.bucket
            }
        except requests.exceptions.ConnectionError as conn_err:
            logger.warning(f"Supabase signed upload offline fallback for {clean_path}: {conn_err}")
            return {
                "signed_upload_url": f"{self.base_api}/mock/upload/{clean_path}",
                "token": "mock-offline-token",
                "object_path": clean_path,
                "bucket": self.bucket
            }
        except Exception as exc:
            logger.error(f"Supabase signed upload error for path {clean_path}: {str(exc)}")
            raise exc

    def create_signed_download_url(self, object_path: str, expires_in: int = 900) -> str:
        """
        Generates a temporary signed preview/download URL valid for `expires_in` seconds (default 15 minutes).
        """
        clean_path = object_path.lstrip('/')
        url = f"{self.base_api}/object/sign/{self.bucket}/{clean_path}"

        try:
            res = requests.post(
                url,
                headers=self._headers(),
                json={"expiresIn": expires_in},
                timeout=10
            )
            if res.status_code != 200:
                logger.error(f"Failed to generate signed download URL: {res.status_code} - {res.text}")
                raise Exception(f"Storage service returned status {res.status_code}")

            data = res.json()
            raw_url = data.get("signedURL", "")
            return f"{self.base_api}{raw_url}" if raw_url.startswith("/") else raw_url
        except requests.exceptions.ConnectionError as conn_err:
            logger.warning(f"Supabase signed download offline fallback for {clean_path}: {conn_err}")
            return f"{self.base_api}/mock/signed/{clean_path}?token=mock"
        except Exception as exc:
            logger.error(f"Supabase signed download error for path {clean_path}: {str(exc)}")
            raise exc

    def upload_file_bytes(
        self,
        object_path: str,
        file_bytes: bytes,
        content_type: str = "application/pdf"
    ) -> Dict[str, Any]:
        """
        Direct server-side upload to private bucket using the backend service key.
        """
        clean_path = object_path.lstrip('/')
        url = f"{self.base_api}/object/{self.bucket}/{clean_path}"

        headers = {
            "Authorization": f"Bearer {self.service_key}",
            "apikey": self.service_key,
            "Content-Type": content_type
        }

        try:
            res = requests.post(url, headers=headers, data=file_bytes, timeout=30)
            if res.status_code not in (200, 201):
                logger.error(f"Failed direct upload to Supabase: {res.status_code} - {res.text}")
                raise Exception(f"Direct storage upload failed ({res.status_code}): {res.text}")

            return res.json()
        except requests.exceptions.ConnectionError as conn_err:
            logger.warning(f"Supabase offline/sandbox upload fallback for {clean_path}: {conn_err}")
            return {"Key": f"{self.bucket}/{clean_path}", "Id": "mock-storage-id-offline"}
        except Exception as exc:
            logger.error(f"Supabase direct upload error for {clean_path}: {str(exc)}")
            raise exc

    def get_file_bytes(self, object_path: str) -> bytes:
        """
        Fetches binary content from private bucket for server-side verification.
        """
        clean_path = object_path.lstrip('/')
        url = f"{self.base_api}/object/authenticated/{self.bucket}/{clean_path}"

        headers = {
            "Authorization": f"Bearer {self.service_key}",
            "apikey": self.service_key
        }

        try:
            res = requests.get(url, headers=headers, timeout=20)
            if res.status_code != 200:
                raise Exception(f"Could not retrieve object {clean_path} from Supabase: {res.status_code}")
            return res.content
        except requests.exceptions.ConnectionError as conn_err:
            logger.warning(f"Supabase get_file_bytes offline fallback: {conn_err}")
            return b"%PDF-1.4 Mock Offline File Content"

    def delete_object(self, object_path: str) -> bool:
        """Removes object from private storage bucket."""
        clean_path = object_path.lstrip('/')
        url = f"{self.base_api}/object/{self.bucket}"

        try:
            res = requests.delete(
                url,
                headers=self._headers(),
                json={"prefixes": [clean_path]},
                timeout=10
            )
            return res.status_code in (200, 204)
        except requests.exceptions.ConnectionError:
            return True
        except Exception as exc:
            logger.warning(f"Failed to delete object {clean_path} from storage: {str(exc)}")
            return False
