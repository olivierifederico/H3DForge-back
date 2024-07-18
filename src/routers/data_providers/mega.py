from ...modules.data_providers.mega.services import MegaService
from fastapi import APIRouter, HTTPException

router = APIRouter()
mega = MegaService()

@router.get('/get_creds')
def get_creds():
    output = mega.container_cmd(f'mega-login {mega.creds["email"]} {mega.creds["password"]}')
    return {'docker_log':output}