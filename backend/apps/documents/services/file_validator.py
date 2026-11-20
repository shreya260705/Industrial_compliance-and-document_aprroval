"""
Document File Security & Integrity Validator.
Enforces:
1. Permitted extensions (PDF, JPG, JPEG, PNG).
2. Deep Magic-Byte Server-Side Signature Validation.
3. Strict Executable & Script File Rejection.
4. File-size constraints per document category.
5. Cryptographic SHA-256 Checksum generation.
"""

import hashlib
import os
import re
from typing import Tuple
from apps.common.exceptions import ValidationException

SUPPORTED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}

DANGEROUS_EXTENSIONS = {
    '.exe', '.bat', '.cmd', '.sh', '.bash', '.php', '.phtml',
    '.py', '.pyw', '.js', '.jsx', '.ts', '.tsx', '.vbs', '.msi',
    '.dll', '.scr', '.jar', '.com', '.reg', '.ps1', '.html', '.htm'
}

# Magic byte signatures
MAGIC_SIGNATURES = {
    'pdf': b'%PDF-',
    'png': b'\x89PNG\r\n\x1a\n',
    'jpeg': b'\xff\xd8\xff'
}

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB default
MAX_LAYOUT_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB for drawings

CATEGORY_MAX_SIZES = {
    'FACTORY_LAYOUT': MAX_LAYOUT_SIZE_BYTES,
    'FIRE_SAFETY': MAX_LAYOUT_SIZE_BYTES,
    'LAND_OWNERSHIP': MAX_LAYOUT_SIZE_BYTES,
    'HYDRO_REPORT': 30 * 1024 * 1024,
    'EMP_REPORT': 40 * 1024 * 1024,
    'EMP_PLAN': 35 * 1024 * 1024,
}

class FileValidator:
    @staticmethod
    def compute_sha256(file_bytes: bytes) -> str:
        """Computes hexadecimal SHA-256 digest of binary content."""
        hasher = hashlib.sha256()
        hasher.update(file_bytes)
        return hasher.hexdigest()

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Strips path traversal elements and normalizes filename."""
        base = os.path.basename(filename).strip()
        clean = re.sub(r'[^A-Za-z0-9._\-]', '_', base)
        return clean or "document.pdf"

    @classmethod
    def validate_file(
        cls,
        filename: str,
        file_bytes: bytes,
        category: str = "OTHER",
        declared_mime: str = ""
    ) -> Tuple[bool, str, str]:
        """
        Comprehensive security validation of file metadata and content.
        Returns (is_valid, detected_mime, sha256_hash).
        Raises ValidationException on security/format failure.
        """
        # 1. Filename & Extension inspection
        ext = os.path.splitext(filename)[1].lower()
        if ext in DANGEROUS_EXTENSIONS:
            raise ValidationException(
                f"Executable and script files ({ext}) are strictly prohibited for security compliance.",
                error_code="DANGEROUS_FILE_TYPE"
            )

        if ext not in SUPPORTED_EXTENSIONS:
            raise ValidationException(
                f"Unsupported file format '{ext}'. Only PDF, JPG, JPEG, and PNG files are accepted.",
                error_code="UNSUPPORTED_FORMAT"
            )

        # 2. File size limit
        file_size = len(file_bytes)
        if file_size == 0:
            raise ValidationException("Uploaded file content cannot be empty (0 bytes).")

        max_allowed = CATEGORY_MAX_SIZES.get(category, MAX_FILE_SIZE_BYTES)
        if file_size > max_allowed:
            mb_limit = max_allowed // (1024 * 1024)
            raise ValidationException(
                f"File size ({file_size / (1024*1024):.1f} MB) exceeds maximum allowed limit of {mb_limit} MB for category '{category}'."
            )

        # 3. Magic-byte signature verification
        detected_mime = None
        if file_bytes.startswith(MAGIC_SIGNATURES['pdf']):
            detected_mime = "application/pdf"
        elif file_bytes.startswith(MAGIC_SIGNATURES['png']):
            detected_mime = "image/png"
        elif file_bytes.startswith(MAGIC_SIGNATURES['jpeg']):
            detected_mime = "image/jpeg"
        else:
            raise ValidationException(
                "File signature verification failed. File content does not match genuine PDF, PNG, or JPEG binary structure.",
                error_code="INVALID_FILE_SIGNATURE"
            )

        # 4. Check that extension matches detected MIME
        if ext == '.pdf' and detected_mime != 'application/pdf':
            raise ValidationException("File extension is .pdf but binary content is not a valid PDF document.")
        elif ext in ('.jpg', '.jpeg') and detected_mime != 'image/jpeg':
            raise ValidationException("File extension is JPEG but binary content is not a valid JPEG image.")
        elif ext == '.png' and detected_mime != 'image/png':
            raise ValidationException("File extension is .png but binary content is not a valid PNG image.")

        sha256_hash = cls.compute_sha256(file_bytes)
        return True, detected_mime, sha256_hash
