from motor.motor_asyncio import AsyncIOMotorClient
from ..utils import load_env
import os

load_env()

class MongoDBConfig:
    def __init__(self):
        self.__user_name = os.getenv('MONGO_INITDB_ROOT_USERNAME')
        self.__password = os.getenv('MONGO_INITDB_ROOT_PASSWORD')
        self.__host = os.getenv('MONGO_HOST')

    def create_client(self):
        return AsyncIOMotorClient(f"mongodb://{self.__user_name}:{self.__password}@{self.__host}/")