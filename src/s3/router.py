from .services import S3Service

class S3Router(S3Service):
    def __init__(self):
        super().__init__()

    def save_file_s3(self, bucket_name: str, sub_category:str ,file_name: str, rename: str = None):
        return self.upload_file(bucket_name, sub_category, file_name, rename)