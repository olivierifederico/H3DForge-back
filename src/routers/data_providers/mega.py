from fastapi import APIRouter, HTTPException, Path
from ...modules.data_providers.mega.services import MegaService
from ...modules.s3.services import S3Service
from ...modules.mongodb.services import MongoDBService
from ...modules.mongodb.schemas import CollectionSchema, SourceSchema
from ...modules import utils
import os
import time

router = APIRouter()
mega = MegaService()
s3 = S3Service()
mongo = MongoDBService()

@router.post('/login/', status_code=200)
async def login():
    if mega.login():
        return {'message': 'Login successful'}
    else:
        return HTTPException(status_code=400, detail='Login failed')

@router.post('/insert_source/', status_code=200)
async def insert_source(collection:CollectionSchema, source: SourceSchema):
    source = source.model_dump()
    # necesito que todos los valores sean en minusculas
    source['name'] = source['name'].lower()
    source['origin'] = source['origin'].lower()
    response = await mongo.insert_source(collection.database, source)
    if response[0]:
        return {'created': response, 'message': 'Source created'}
    else:
        return HTTPException(status_code=400, detail='Source already exists')

@router.post('/{source_sku}/insert_main_folders/', status_code=200)
async def insert_main_folder(collection:CollectionSchema ,source_sku: str = Path(..., title='Source SKU', min_length=3, max_length=15)):
    source = await mongo.get_document_by_field(collection.database, 'sources', 'sku', source_sku)
    if not source['exists']:
        return HTTPException(status_code=400, detail='Source does not exist')
    else:
        if source['path_to_sub_folders']:
            for path in source['path_to_sub_folders']:
                try:
                    mega.set_path(path)
                    folder_list = utils.folder_data(mega.get_folders(), source['sku'], path)
                    for folder in folder_list:
                        content = mega.get_content(folder['name'])['totals']
                        await mongo.insert_main_folder(collection.database, folder)
                except Exception as e:
                    return HTTPException(status_code=400, detail=f'An error occurred while inserting the main folder: {e}')
        else:
            try:
                mega.set_path()
                folder_list = utils.main_folder_data(mega.get_folders(), source['sku'])
                for folder in folder_list:
                    folder['content'] = mega.get_content(folder['name'])['totals']
                    if folder['name'] == '':
                        await mongo.update_source(collection.database, source_sku, {'content': folder['content']})
                    else:
                        await mongo.insert_main_folder(collection.database, folder)
            except Exception as e:
                return HTTPException(status_code=400, detail=f'An error occurred while inserting the main folder: {e}')

@router.post('/{main_folder_sku}/insert_sub_folders/', status_code=200)
async def insert_sub_folders(collection:CollectionSchema, main_folder_sku: str = Path(..., title='Main Folder SKU', min_length=3, max_length=15)):
    main_folder = await mongo.get_document_by_field(collection.database, 'main_folders', 'sku', main_folder_sku)
    if not main_folder['exists']:
        return HTTPException(status_code=400, detail='Main Folder does not exist')
    else:
        try:
            mega.set_path(f'"{main_folder['name']}"')
            folder_list = utils.get_folders_from_list(mega.get_folders(), get_root=True)
            sub_folders = utils.folder_data(folder_list, main_folder['sku'])
            folder_exists = await mongo.get_subfolder_names(collection.database, main_folder['sku'])
            for sub_folder in sub_folders:
                if sub_folder['name'] in folder_exists:
                    continue
                else:
                    print('Sub folder to insert:',sub_folder['name'])
                    mega.get_current_path()
                    mega.change_path(utils.format_url(sub_folder['name']), root=False)
                    sub_folder_folders = utils.get_folders_from_list(mega.get_folders(), get_root=True)
                    sub_folder['content'] = mega.get_content(sub_folder_folders)
                    await mongo.insert_sub_folders(collection.database, main_folder['sku'], sub_folder)
                    print('Sub folder inserted', sub_folder['name'])
                    mega.get_current_path()
        except Exception as e:
            return HTTPException(status_code=400, detail=f'An error occurred while inserting the sub folders: {e}')


@router.post('/{sub_folder_sku}/files/', status_code=200)
async def insert_files_from_sub_folder(sub_folder_sku: str = Path(..., title='Source SKU', min_length=3, max_length=15)):
    try:
        main = await mongo.get_document_by_field('h3dforge', 'main_folders', 'sku', sub_folder_sku[:12])
        if not main['exists']:
            return HTTPException(status_code=400, detail='Source does not exist')
        sub = await mongo.get_document_by_field('h3dforge', 'sub_folders', 'sku', sub_folder_sku)
        if not sub['exists']:
            return HTTPException(status_code=400, detail='Source does not exist')
        
        mega.set_path()
        path = f'{main['name']}/{sub['name']}/'
        for sub_folder in sub['content']['data']['sub_folders']:
            for file in sub['content']['data']['sub_folders'][sub_folder]:
                file_data = utils.file_data(path, sub_folder, file, sub_folder_sku)
                check_file_size = mega.find(file_data['url'], full=True)
                if check_file_size.endswith('No such file or directory'):
                    continue
                else:
                    file_data['size'] = check_file_size.split('(')[-1].split(')')[0]
                file_data['extension'] = '.'+file_data['name'].split('.')[-1]
                file_data['sku_number'] = await mongo.generate_sku('h3dforge', 'files', sub_folder_sku, fill = 6)
                file_data['sku'] = f"{sub_folder_sku}-{file_data['sku_number']}"
                await mongo.insert_document('h3dforge', 'files', file_data)
    except Exception as e:
        return HTTPException(status_code=400, detail=f'An error occurred while inserting the files: {e}')
    
@router.post('/{main_folder_sku}/sub_folder_files/', status_code=200)
async def insert_files_from_main_folder(main_folder_sku: str = Path(..., title='Source SKU', min_length=3, max_length=15)):
    try:
        main = await mongo.get_document_by_field('h3dforge', 'main_folders', 'sku', main_folder_sku)
        if not main['exists']:
            return HTTPException(status_code=400, detail='Source does not exist')
        subs = await mongo.get_documents('h3dforge', 'sub_folders')
        for sub in subs:
            sub_folder_sku = sub['sku']
            mega.set_path()
            path = f'{main['name']}/{sub['name']}/'
            for sub_folder in sub['content']['data']['sub_folders']:
                for file in sub['content']['data']['sub_folders'][sub_folder]:
                    file_data = utils.file_data(path, sub_folder, file, sub_folder_sku)
                    check_file_size = mega.find(file_data['url'], full=True)
                    if check_file_size.endswith('No such file or directory'):
                        continue
                    else:
                        file_data['size'] = check_file_size.split('(')[-1].split(')')[0]
                    file_data['extension'] = '.'+file_data['name'].split('.')[-1]
                    if file_data['extension'].startswith('.0'):
                        file_data['extension'] = '.7z.part'
                    elif file_data['extension'] not in utils.valid_ext:
                        if file_data['extension'].lower() in utils.valid_ext:
                            file_data['extension'] = file_data['extension'].lower()
                    file_data['sku_number'] = await mongo.generate_sku('h3dforge', 'files', sub_folder_sku, fill = 6)
                    file_data['sku'] = f"{sub_folder_sku}-{file_data['sku_number']}"
                    await mongo.insert_document('h3dforge', 'files', file_data)
    except Exception as e:
        return HTTPException(status_code=400, detail=f'An error occurred while inserting the files: {e}')

@router.get('/main_folders/', status_code=200)
async def list_main_folders():
    main_folders = await mongo.get_documents('h3dforge', 'main_folders')
    return main_folders

@router.get('/sub_folders/', status_code=200)
async def list_sub_folders():
    sub_folders = await mongo.get_documents('h3dforge', 'sub_folders')
    return sub_folders

@router.get('/files/{ext}', status_code=200)
async def list_files_per_extension(ext: str = Path(..., title='File Extension', min_length=2, max_length=10)):
    files = await mongo.get_documents('h3dforge', 'files', {'extension':ext})
    return len(files)

@router.get('/get_file_from_prefix_sku/{prefix_sku}', status_code=200)
async def get_file_from_sub_folder(prefix_sku: str = Path(..., title='Sub Folder SKU', min_length=3, max_length=30)):
    files = await mongo.get_documents('h3dforge', 'files', {'prefix_sku':{ '$regex': f'^{prefix_sku}'}})
    return files


@router.get('/fix', status_code=200)
async def fix_files():
    to_fix_folder = await mongo.get_documents('h3dforge', 'files', {'to_fix': True, 'reason': {'$ne': 'need manual upload'}})
    files_to_upload = await mongo.get_documents('h3dforge', 'files', {'status.s3': False, 'to_fix':{ '$ne': True}})
    manual_upload = []
    for file in files_to_upload:
        for fix in to_fix_folder:
            if fix['name'] in file['url'] and not file['url'].endswith(fix['name']):
                await mongo.update_document('h3dforge', 'files','sku', file['sku'], {'to_fix': True, 'reason': 'need manual upload'})
    # return manual_upload
    

@router.get('/mega_to_s3/{source_sku}/{prefix_sku}/', status_code=200)
async def get_not_prepared_files(prefix_sku: str = Path(..., title='Sub Folder SKU', min_length=3, max_length=30), source_sku: str = Path(..., title='Source SKU', min_length=3, max_length=15)):
    source = await mongo.get_document_by_field('h3dforge', 'sources', 'sku', source_sku)
    files = await mongo.get_documents('h3dforge', 'files', {'prefix_sku':{ '$regex': f'^{prefix_sku}'}, 'status.s3': False, 'to_fix':{ '$ne': True}})
    download_path_local = 'F:/MEGAcmd/data/'
    print('Files to upload:', len(files))
    prev_file = None
    for file in files:
        print('====================================')
        s3_path = f"{source['name']}/{file['url']}"
        print('File:', file['name'])
        print('SKU:', file['sku'])
        print('Checking if file exists in S3')
        if s3.check_file('raw-files', s3_path):
            print('File exists in S3', file['name'])
            print('Updating file status')
            await mongo.update_document('h3dforge', 'files','sku', file['sku'], {'status.s3': True, 's3': {
                'bucket': 'raw-files',
                'path': s3_path,
                'uploaded_at': utils.get_current_time()
            }})
            print('File status updated')
        else:
            print('File does not exist in S3', file['name'])
            file_path = f"{download_path_local}{file['name']}"
            print('Checking if file exists locally')
            print('File path:', file_path)

            if os.path.exists(file_path):
                print('File exists', file['name'])
            else:
                print('File does not exist', file['name'])
                folders = file['name'].split('/')
                path_to_copy = None
                if len(folders) > 1:
                    path_to_copy = '/'.join(folders[:-1])
                    for folder in folders[:-1]:
                        os.makedirs(f"{download_path_local}{path_to_copy}", exist_ok=True)
                mega.set_path()
                if not path_to_copy:
                    mega.download_file(f'"{file['url']}"')
                else:
                    mega.download_file(f'"{file['url']}"', path_to_copy)
                print('Waiting for file to download')
                print('URL:', file['url'])
                print('Checking if file exists locally')
                while not os.path.exists(file_path):
                    pass
                print('File downloaded')
            print('Uploading file to S3')
            s3.save_file_s3('raw-files', file_path, s3_path)
            print('Waiting for file to upload')
            while not s3.check_file('raw-files', s3_path):
                pass
            print('File uploaded')
            print('Updating file status')
            await mongo.update_document('h3dforge', 'files','sku', file['sku'], {'status.s3': True, 's3': {
                'bucket': 'raw-files',
                'path': s3_path,
                'uploaded_at': utils.get_current_time()
            }})
            print('File status updated')
            time.sleep(2)
            if prev_file == None:
                prev_file = file_path
            else:
                os.remove(prev_file)
                prev_file = file_path
    return {'message': 'Files have been uploaded to S3'}







@router.delete('/reset_all/', status_code=204)
async def reset_all():
    await mongo.drop_database('h3dforge')
    return {'message': 'All collections have been dropped'}