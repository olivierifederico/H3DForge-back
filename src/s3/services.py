from .config import S3Config

class S3Service(S3Config):
    def __init__(self):
        super().__init__()
        self.__client = self.create_client()

    def create_bucket(self, bucket_name: str):
        try:
            response = self.__client.create_bucket(Bucket=bucket_name)
            return response
        except Exception as e:
            return e

    def delete_bucket(self, bucket_name: str):
        self.__client.delete_bucket(Bucket=bucket_name)

    def list_buckets(self, only_names: bool = True):
        response = self.__client.list_buckets()
        if only_names:
            return [i['Name'] for i in response['Buckets']]
        return response['Buckets']
    
    def upload_file(self, bucket_name: str, sub_category:str ,file_name: str, rename: str = None):
        if rename:
            final_name = rename
        else:
            final_name = file_name
        try:
            with open(file_name, 'rb') as f:
                self.__client.upload_fileobj(f, bucket_name, f"{sub_category}/{final_name}")
            return f'File {file_name} uploaded to bucket {bucket_name}'
        except FileNotFoundError:
            return f'File {file_name} not found'
    
