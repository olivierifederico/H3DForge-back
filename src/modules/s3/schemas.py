from pydantic import BaseModel, Field
from typing import Optional


class S3Object(BaseModel):
    bucket_name: str = Field(..., title='Bucket name', min_length=3, max_length=63)
    s3_path: Optional[str] = Field(..., title='S3 path', min_length=3, max_length=255)
    file_name: str = Field(..., title='File name', min_length=3, max_length=255)
    rename: Optional[str] = Field(None, title='Rename file', min_length=3, max_length=255)

    class Config:
        json_schema_extra = {
            "example": {
                "bucket_name": "h3dforge-stl-raw-dnd",
                "s3_path": "path/to/file",
                "file_name": "h3dforge_logo.png",
                "rename": "logo.png"
            }
        }