from .config import S3Config
from botocore.exceptions import ClientError, NoCredentialsError

class S3Service(S3Config):
    def __init__(self):
        super().__init__()
        self.__client = self.create_client()

    def create_bucket(self, bucket_name: str):
        try:
            response = self.__client.create_bucket(Bucket=bucket_name)
        except ClientError as e:
            raise ValueError(f"Client error: {e.response['Error']['Message']}") from e
        except NoCredentialsError as e:
            raise ValueError("Credentials not available") from e

    def delete_bucket(self, bucket_name: str):
        try:
            self.__client.delete_bucket(Bucket=bucket_name)
        except ClientError as e:
            raise ValueError(f"Client error: {e.response['Error']['Message']}") from e
        except NoCredentialsError as e:
            raise ValueError("Credentials not available") from e

    def list_buckets(self, only_names: bool = True):
        try:
            response = self.__client.list_buckets()
            if only_names:
                return [i['Name'] for i in response['Buckets']]
            else:
                return response['Buckets']
        except ClientError as e:
            raise ValueError(f"Client error: {e.response['Error']['Message']}") from e
        except NoCredentialsError as e:
            raise ValueError("Credentials not available") from e
    
    def upload_file(self, bucket_name: str ,file_name: str, path: str = None, rename: str = None):
        
        with open(file_name, 'rb') as f:
            final_path = self._generate_final_path(file_name, path, rename)
            self.__client.upload_fileobj(f,bucket_name, final_path)
        return True
    
    def remove_file(self, bucket_name: str, file_name: str, path: str = None):
        final_path = self._generate_final_path(file_name, path)
        try:
            self.__client.delete_object(Bucket=bucket_name, Key=final_path)
            return True
        except RuntimeError as e:
            print('ole')
    
    def _generate_final_path(self, file_name: str, path: str = None, rename: str = None) -> str:
        """Generates the final path for the file to be uploaded."""
        if path:
            path = path[:-1] if path[-1] == '/' else path
            final_path = f"{path}/{rename or file_name}"
        else:
            final_path = rename or file_name
        return final_path
    
    def save_file_s3(self, bucket_name: str ,file_name: str, path: str = None, rename: str = None):
        try:
            buckets = self.list_buckets()
            if bucket_name not in buckets:
                self.create_bucket(bucket_name)
            self.upload_file(bucket_name, file_name, path, rename)
        except ValueError as e:
            raise ValueError(f"An error occurred while saving the file: {e}") from e
    
