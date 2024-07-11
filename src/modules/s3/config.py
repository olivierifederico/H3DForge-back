import os
import boto3
from ..utils import load_env

load_env()

class S3Config:
    def __init__(self):
        self.__user_name = os.getenv('MINIO_ROOT_USER')
        self.__password = os.getenv('MINIO_ROOT_PASSWORD')
        self.__host = os.getenv('MINIO_HOST')

    def create_client(self):
        return boto3.client('s3',
                            aws_access_key_id=self.__user_name,
                            aws_secret_access_key=self.__password,
                            endpoint_url=self.__host
                            )

    