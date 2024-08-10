from .config import S3Config
from botocore.exceptions import ClientError, NoCredentialsError
import os
import time

class S3Service(S3Config):
    def __init__(self):
        super().__init__()
        self.__client = self.create_client()

    def download_from_path(self, bucket:str, path:str):
        try:
            temp_path = os.path.join(os.getcwd(), 'static/temp/files/')
            filename = path.split('/')[-1]
            file_path = f"{temp_path}{filename}"
            if os.path.exists(file_path):
                print('File already exists')
                return temp_path
            else:
                print('Downloading file')
                self.__client.download_file(bucket, path, file_path)
                while not os.path.exists(file_path):
                    time.sleep(0.2)
                print('File downloaded')
                return temp_path
        
        except ClientError as e:
            raise ValueError(f"Client error: {e.response['Error']['Message']}") from e
        except NoCredentialsError as e:
            raise ValueError("Credentials not available") from e

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
        
    def check_bucket(self, bucket_name: str):
        return bucket_name in self.list_buckets()
    
    def upload_file(self, bucket_name: str ,file_path: str, s3_path: str):
        with open(file_path, 'rb') as f:
            self.__client.upload_fileobj(f,bucket_name, s3_path)
        return True
    
    def remove_file(self, bucket_name: str, file_name: str, path: str = None):
        final_path = self._generate_final_path(file_name, path)
        try:
            self.__client.delete_object(Bucket=bucket_name, Key=final_path)
            return True
        except RuntimeError as e:
            print('ole')

    def check_file(self, bucket_name: str, file_name: str, path: str = None):
        final_path = self._generate_final_path(file_name, path)
        try:
            self.__client.head_object(Bucket=bucket_name, Key=final_path)
            return True
        except ClientError as e:
            return False
    
    def _generate_final_path(self, file_name: str, path: str = None, rename: str = None) -> str:
        if path:
            path = path[:-1] if path[-1] == '/' else path
            final_path = f"{path}/{rename or file_name}"
        else:
            final_path = rename or file_name
        return final_path
    
    def save_file_s3(self, bucket_name: str ,file_path: str, s3_path: str = None, rename: str = None):
        try:
            if not self.check_bucket(bucket_name):
                self.create_bucket(bucket_name)
            self.upload_file(bucket_name, file_path, s3_path)
        except ValueError as e:
            raise ValueError(f"An error occurred while saving the file: {e}") from e
    
