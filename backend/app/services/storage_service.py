"""
Encrypted storage service — handles file uploads to S3 with AES-256 encryption.
"""
import boto3
from botocore.config import Config as BotoConfig
from typing import Optional
import uuid

from app.core.config import settings


class StorageService:
    """
    Manages encrypted file storage in S3.
    
    All files are stored with:
    - Server-side encryption (AES-256-GCM via SSE-S3)
    - User-scoped prefixes for isolation (user_id/avatar_id/type/filename)
    - Content-type preservation for proper retrieval
    """

    def __init__(self):
        self.s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
            config=BotoConfig(signature_version="s3v4"),
        )
        self.bucket = settings.S3_BUCKET_NAME

    async def upload_file(
        self,
        file_bytes: bytes,
        user_id: str,
        avatar_id: str,
        file_type: str,
        content_type: str,
        original_filename: Optional[str] = None,
    ) -> str:
        """
        Upload an encrypted file to S3.
        
        Args:
            file_bytes: Raw file content.
            user_id: Owner user ID (used for path isolation).
            avatar_id: Avatar this file belongs to.
            file_type: Category — "photos", "voice", "documents".
            content_type: MIME type of the file.
            original_filename: Original name (used for extension only).
            
        Returns:
            The S3 key (path) of the uploaded file.
        """
        # Generate a unique filename preserving the extension
        ext = ""
        if original_filename and "." in original_filename:
            ext = "." + original_filename.rsplit(".", 1)[-1].lower()
        
        unique_name = f"{uuid.uuid4().hex}{ext}"
        s3_key = f"{user_id}/{avatar_id}/{file_type}/{unique_name}"

        self.s3.put_object(
            Bucket=self.bucket,
            Key=s3_key,
            Body=file_bytes,
            ContentType=content_type,
            ServerSideEncryption="AES256",  # SSE-S3 encryption
            Metadata={
                "user_id": user_id,
                "avatar_id": avatar_id,
                "original_filename": original_filename or "unknown",
            },
        )

        return s3_key

    async def get_presigned_url(self, s3_key: str, expires_in: int = 3600) -> str:
        """
        Generate a temporary presigned URL for secure file access.
        
        Args:
            s3_key: The S3 key of the file.
            expires_in: URL expiry in seconds (default: 1 hour).
            
        Returns:
            A time-limited URL for downloading the file.
        """
        url = self.s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": s3_key},
            ExpiresIn=expires_in,
        )
        return url

    async def delete_file(self, s3_key: str):
        """Permanently delete a file from S3."""
        self.s3.delete_object(Bucket=self.bucket, Key=s3_key)

    async def delete_avatar_files(self, user_id: str, avatar_id: str):
        """
        Delete ALL files for a specific avatar.
        Used during consent revocation or avatar deletion.
        """
        prefix = f"{user_id}/{avatar_id}/"
        
        # List all objects with this prefix
        paginator = self.s3.get_paginator("list_objects_v2")
        pages = paginator.paginate(Bucket=self.bucket, Prefix=prefix)

        objects_to_delete = []
        for page in pages:
            for obj in page.get("Contents", []):
                objects_to_delete.append({"Key": obj["Key"]})

        # Batch delete
        if objects_to_delete:
            self.s3.delete_objects(
                Bucket=self.bucket,
                Delete={"Objects": objects_to_delete},
            )


# Singleton instance
storage_service = StorageService()
