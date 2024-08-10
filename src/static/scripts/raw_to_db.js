import { encodeUrlParam, load_model_visor } from "./utils.js";
// import { load_model_visor } from "./model_viewer.js";

document.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById('get-btn').addEventListener('click', get_file);
    document.getElementById('load-btn').addEventListener('click', load_file);
    document.getElementById('skip-btn').addEventListener('click', skip);
    document.getElementById('fix-btn').addEventListener('click', fix);
    document.getElementById('load_model-btn').addEventListener('click', load_3d_model);
    document.getElementById('category-select').addEventListener('change', category_select);
});

let front_data = null;
let raw_file_data;
let to_load_data = {};
let total_files = 0;
let categories, sub_categories;

let model_loaded = false;

init_page();

function init_page() {
    fetch('/mongodb/get_categories_data', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(data => {
            categories = data['categories'];
            sub_categories = data['sub_categories'];
            let category_select = document.getElementById('category-select');
            for (let category of categories) {
                let option = document.createElement('option');
                option.value = category['id'];
                option.text = category['name'];
                category_select.appendChild(option);
            }

        })
        .then(() => {
            category_select();
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    document.getElementById('fix-btn').disabled = true;
    document.getElementById('load-btn').disabled = true;
    document.getElementById('skip-btn').disabled = true;
}

function category_select() {
    let category_id = document.getElementById('category-select').value;
    let sub_select = document.getElementById('sub_category-select');
    let sub_select_div = document.getElementById('sub_category-div');
    let subs = []
    for (let sub of sub_categories) {
        if (sub['category_id'] == category_id) {
            subs.push(sub);
        }
    }
    if (subs.length == 0) {
        sub_select.innerHTML = '';
        let option = document.createElement('option');
        option.value = null;
        option.text = 'No subcategories';
        sub_select.appendChild(option);
        sub_select.disabled = true;

    } else {
        sub_select.disabled = false;
        sub_select.innerHTML = '';
        for (let sub of subs) {
            let option = document.createElement('option');
            option.value = sub['id'];
            option.text = sub['name'];
            sub_select.appendChild(option);
        }
        let option = document.createElement('option');
        option.value = null;
        option.text = 'No subcategory';
        sub_select.appendChild(option);
    }
}

function get_file() {
    fetch('/mongodb/get_first_document', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(data => {
            raw_file_data = data;
            to_load_data['source_path'] = data['url'];
            front_data = {
                'ID': data['_id'],
                'Name': data['name'],
                'Size': data['size'],
            }
            let file_info_div = document.getElementById('file_info-div');
            let file_info_ul = file_info_div.querySelector('ul');

            // Limpiar la lista
            while (file_info_ul.firstChild) {
                file_info_ul.removeChild(file_info_ul.firstChild);
            }
            for (let key in front_data) {
                let li = document.createElement('li');
                li.innerHTML = '<strong>' + key + '</strong>: ' + front_data[key];
                file_info_ul.appendChild(li);
            }
            document.getElementById('load-btn').disabled = false;
            document.getElementById('fix-btn').disabled = false;



        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

function load_file() {
    let file_id = raw_file_data['_id'];
    fetch('/mongodb/get_document_by_id/' + file_id, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(data => {
            let encodedPath = encodeUrlParam(data['s3']['path']);
            fetch('/s3/download_from_path/' + encodedPath, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
                .then(response => response.json())
                .then(data => {
                    // Aquí puedes agregar lógica para manejar la respuesta
                    let file_ul = document.getElementById('file_list-ul')
                    total_files = data['files'].length;
                    document.getElementById('file_list-div').style.display = 'flex';
                    const style = window.getComputedStyle(document.getElementById('file_list-div'));
                    const totalHeight = document.getElementById('file_list-div').clientHeight;
                    const paddingTop = parseFloat(style.paddingTop);
                    const paddingBottom = parseFloat(style.paddingBottom);
                    const freeHeight = totalHeight - paddingTop - paddingBottom - 53 - 50;
                    // const freeHeight = 200;
                    document.getElementById('file_list-ul').style.height = freeHeight + 'px';
                    for (let filename of data['files']) {
                        let li = document.createElement('li');
                        let radio_button = document.createElement('input');
                        radio_button.type = 'radio';
                        radio_button.name = 'file';
                        radio_button.value = filename;

                        // Crear una etiqueta para el radio button
                        let label = document.createElement('label');
                        label.appendChild(radio_button);
                        label.appendChild(document.createTextNode(filename));

                        li.appendChild(label);
                        file_ul.appendChild(li);
                    }

                    document.getElementById('load-btn').disabled = true;
                    document.getElementById('get-btn').disabled = true;
                })

        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

function skip() {
    load_model_visor('batman.stl')
}

function fix() {
    let file_id = raw_file_data['_id'];
    let reason = prompt("Please enter the reason for the fix");
    reason = reason == null || reason == "" ? false : encodeUrlParam(reason);
    if (!reason) {
        alert('Fix cancelled');
        return;
    } else {
        alert('Fix reason: ' + reason);
        fetch('/mongodb/set_fix/' + file_id + '/' + reason, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(response => response.json())
            .then(data => {
                document.getElementById('download_s3-btn').disabled = false;
            })
            .catch((error) => {
                console.error('Error:', error);
                document.getElementById('download_s3-btn').disabled = false;
            });
    }
}

function load_3d_model() {
    const selectedRadio = document.querySelector('input[name="file"]:checked');
    if (selectedRadio) {
        const selectedFilename = selectedRadio.value;
        load_model_visor(selectedFilename)
            .then(height_cm => {
                to_load_data['original_name'] = selectedFilename;
                to_load_data['height_cm'] = height_cm;
            })
        model_loaded = true;
    } else {
        alert('Por favor selecciona un archivo');
    }
}