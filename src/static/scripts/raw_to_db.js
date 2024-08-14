import { encodeUrlParam, load_model_visor, capitalize_first_letter } from "./utils.js";

document.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById('load-btn').addEventListener('click', get_file);
    document.getElementById('confirm_file_info-btn').addEventListener('click', confirm_file_info);
    document.getElementById('skip-btn').addEventListener('click', skip);
    document.getElementById('fix-btn').addEventListener('click', fix);
    document.getElementById('load_model-btn').addEventListener('click', load_3d_model);
    document.getElementById('category-select').addEventListener('change', category_select);
    document.getElementById('select_category-btn').addEventListener('click', load_form);
    document.getElementById('select_source_ext-btn').addEventListener('click', confirm_source);
    document.getElementById('source-select').addEventListener('change', update_source_data);
    document.getElementById('test-btn').addEventListener('click', test_function);
    document.getElementById('confirm_model-btn').addEventListener('click', confirm_file_list);
});


let sources, categories, sub_categories, raw_file_data, front_data;


let to_load_data = {
    'model_details': {},
    'print_details': {},
    'file_details': {}
};

let handling_data = {
    'extension': false,
    'print': false,
    'file_count': 0,
}

let steps = {
    'init': 'ready',
    'source': 'ready',
    'file': 'ready',
    'model 3D': 'ready',
    'category': 'ready',
    'form': 'ready',
}

function test_function() {
    console.log('====================');
    console.log('to_load_data');
    console.log(to_load_data);
    console.log('====================');
    console.log('handling_data');
    console.log(handling_data);
    console.log('====================');
    console.log('steps');
    console.log(steps);
    console.log('====================');
}

init_page();

function init_page() {
    init_status_info();
    let params = new URLSearchParams(
        {
            'database': 'h3dforge',
            'name': 'sources',
        }
    );
    fetch(`/mongodb/get_documents/?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(data => {
            sources = data;
            let source_select = document.getElementById('source-select');
            for (let source of sources) {
                let option = document.createElement('option');
                option.value = source['_id'];
                option.text = capitalize_first_letter(source['name']) + '-' + capitalize_first_letter(source['server']);
                source_select.appendChild(option);
            }
            let dumb_option = document.createElement('option');
            dumb_option.value = null;
            dumb_option.text = 'No source';
            source_select.appendChild(dumb_option);

        })
        .then(() => {
            update_source_data();
        })
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
        })
        .then(() => {
            set_base_data();
            update_steps('source', 'in progress');
            disable_all();
            set_status_div_children('enable', 'source-div', ['load-btn', 'skip-btn', 'fix-btn']);
        })
}

function set_base_data() {
    to_load_data = {
        'model_details': {},
        'print_details': {},
        'file_details': {}
    };
    handling_data = {
        'extension': false,
        'print': false,
        'file_count': 0,
    };
    steps = {
        'init': 'done',
        'source': 'ready',
        'file': 'ready',
        'model 3D': 'ready',
        'category': 'ready',
        'form': 'ready',
    };
}

function confirm_source() {
    let button = document.getElementById('select_source_ext-btn');
    if (steps['source'] == 'in progress') {
        let source_id = document.getElementById('source-select').value;
        let extension = document.getElementById('extension-select').value;
        set_status_div_children('disable', 'source-div', ['select_source_ext-btn']);
        button.textContent = 'Reset';
        to_load_data['file_details']['source_id'] = source_id;
        handling_data['extension'] = extension;
        update_steps('source', 'done');
        update_steps('file', 'in progress');
        set_status_div_children('enable', 'file_info_btns-div', ['confirm_file_info-btn', 'skip-btn', 'fix-btn']);
    } else {
        set_status_div_children('enable', 'source-div', ['select_source_ext-btn']);
        button.textContent = 'Confirm';
        reset_page_to_step('source');
        update_steps('source', 'in progress');
        update_steps('file', 'ready');
    }

}

function update_source_data() {
    let source_id = document.getElementById('source-select').value;
    let source = sources.find(source => source['_id'] == source_id);
    let select = document.getElementById('extension-select');
    let source_div = document.getElementById('source-div');
    select.innerHTML = '';
    if (source == undefined || source['content'] == undefined || source['content']['types'] == undefined) {
        let option = document.createElement('option');
        option.value = 'no_extension';
        option.text = 'No types';
        select.appendChild(option);
        select.disabled = true;
    } else {
        for (let key in source['content']['types']) {
            select.disabled = false;
            let option = document.createElement('option');
            option.value = key;
            option.text = key;
            select.appendChild(option);
        }
        let any_option = document.createElement('option');
        any_option.value = 'any_extension';
        any_option.text = 'Any';
        select.appendChild(any_option);
    }
}

function get_file() {
    set_status_div_children('disable', 'file_info_btns-div', ['skip-btn', 'fix-btn', 'confirm_file_info-btn']);
    fetch('/mongodb/file_to_prepare/' + to_load_data['file_details']['source_id'] + '/' + encodeUrlParam(handling_data['extension']), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(data => {
            raw_file_data = data;
            to_load_data['file_details']['source_path'] = data['url'];
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
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

function confirm_file_info() {
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
                    handling_data['file_count'] = data['files'].length;
                    set_status_div_children('disable', 'file_info_btns-div', ['skip-btn', 'fix-btn']);
                    update_steps('file', 'done');
                    set_status_div_children('enable', 'file_list_btn-div', ['confirm_model-btn']);
                    update_steps('model 3D', 'in progress');
                })

        })
        .catch((error) => {
            console.error('Error:', error);
            update_steps('file', 'error');
        });
}

function load_3d_model() {
    const selectedRadio = document.querySelector('input[name="file"]:checked');
    if (selectedRadio) {
        const selectedFilename = selectedRadio.value;
        load_model_visor(selectedFilename)
            .then(height_cm => {
                to_load_data['file_details']['original_name'] = selectedFilename;
                to_load_data['model_details']['height_cm'] = height_cm;
                document.getElementById('load_model-btn').textContent = 'Reload model';
                set_status_div_children('enable', 'file_list_btn-div', []);
            })
    } else {
        alert('Por favor selecciona un archivo');
    }
}

function confirm_file_list() {
    if (steps['model 3D'] == 'in progress') {
        let selectedRadio = document.querySelector('input[name="file"]:checked');
        let selectedFilename = selectedRadio.value;
        // to_load_data['file_details']['filename'] = selectedFilename;
        set_status_div_children('disable', 'file_list_btn-div', ['confirm_model-btn']);
        document.getElementById('confirm_model-btn').textContent = 'Reset';
        update_steps('model 3D', 'done');
        update_steps('category', 'in progress');
        set_status_div_children('enable', 'file_list_btn-div', ['confirm_model-btn']);
        set_status_div_children('enable', 'category-container', [], 'selector-div');
        document.getElementById('select_category-btn').disabled = false;
    }else {
        set_status_div_children('disable', 'file_list_btn-div', ['confirm_model-btn']);
        document.getElementById('confirm_model-btn').textContent = 'Reset';
        document.getElementById('select_category-btn').disabled = true;
        update_steps('model 3D', 'ready');
        update_steps('category', 'ready');
    }
}

function load_form() {
    let cat_select = document.getElementById('category-select');
    let sub_select = document.getElementById('sub_category-select');
    let cat_id = cat_select.value;
    if (sub_select.value != 'null') {
        cat_id += '-' + sub_select.value;
    }
    fetch('/mongodb/get_form/' + cat_id, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(data => {
            let model_fields = data['model_details'];
            let print_fields = data['print_details'];
            generate_input_form('model_details-div', model_fields);
            generate_input_form('print_details-div', print_fields);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}


function disable_all() {
    const elements = document.querySelectorAll('input, button, select, textarea');
    elements.forEach(element => {
        element.disabled = true;
    });
    document.getElementById('test-btn').disabled = false;
}

function reset_page_to_step(step) {
    switch (step) {
        case 'source':
            reset_to_source();
            update_status_info();
            break;
    }
}

function update_steps(key, value) {
    steps[key] = value;
    update_status_info();
}

function reset_to_source() {
    to_load_data = {
        'model_details': {},
        'print_details': {},
        'file_details': {}
    };
    handling_data = {
        'extension': false,
        'print': false,
        'file': false,
        'file_count': 0,
    }
    steps = {
        'init': 'done',
        'source': 'ready',
        'file': 'ready',
        'file list': 'ready',
        'model 3D': 'ready',
        'category': 'ready',
        'form': 'ready',
    }
    disable_all();
    set_status_div_children('enable', 'source-div', ['load-btn', 'skip-btn', 'fix-btn']);
}

function update_status_info() {
    // let status_div = document.getElementById('status-div');
    // let status_ul = status_div.querySelector('ul');
    for (let status of Object.keys(steps)) {
        let li = document.getElementById(status + '_status_info-li');
        let p = li.querySelector('p');
        p.innerHTML = '<strong>' + capitalize_first_letter(status) + '</strong>: ' + capitalize_first_letter(steps[status]);
    }
}

function init_status_info() {
    let status_div = document.getElementById('status-div');
    let status_ul = status_div.querySelector('ul');
    for (let status of Object.keys(steps)) {
        let li = document.createElement('li');
        li.id = status + '_status_info-li';
        let p = document.createElement('p');
        p.innerHTML = '<strong>' + capitalize_first_letter(status) + '</strong>: ' + capitalize_first_letter(steps[status]);
        li.appendChild(p);
        status_ul.appendChild(li);
    }
}

function set_status_div_children(execution, div_id, except = [], div_class = null) {    
    let div = document.getElementById(div_id);
    if (div_class) {
        let sub_divs = div.getElementsByClassName(div_class);
        for (let sub_div of sub_divs) {
            for (let child of sub_div.children) {
                if (execution == 'enable') {
                    if (!except.includes(child.id)) {
                        child.disabled = false;
                    } else {
                        child.disabled = true;
                    }
                } else if (execution == 'disable') {
                    if (!except.includes(child.id)) {
                        child.disabled = true;
                    } else {
                        child.disabled = false;
                    }
                }
            }
        }
    }
    if (execution == 'enable') {
        for (let child of div.children) {
            if (!except.includes(child.id)) {
                child.disabled = false;
            } else {
                child.disabled = true;
            }
        }
    } else if (execution == 'disable') {
        for (let child of div.children) {
            if (!except.includes(child.id)) {
                child.disabled = true;
            } else {
                child.disabled = false;
            }
        }
    }
}

// CONTINUAR ACA, FALTA ACTIVAR EL CONFIRM
function generate_input_form(div_id, fields) {
    let div = document.getElementById(div_id);
    for (let child of div.children) {
        if (child.tagName != 'UL') {
            div.removeChild(child);
        }
    }
    let ul = div.querySelector('ul');
    let button_div = document.createElement('div');
    button_div.className = 'btn-form';
    let key_list = Object.keys(fields);
    console.log(key_list);
    let button_list = []
    ul.innerHTML = '';
    for (let key of key_list) {
        let field = fields[key];
        let li = document.createElement('li');
        li.className = 'form-group';
        let label = document.createElement('label');
        label.for = key;
        label.textContent = (capitalize_first_letter(key) + ':').replace(/_/g, ' ');
        let select_field = document.createElement('select');
        if ('options' in field) {
            for (let option of field['options']) {
                let option_elem = document.createElement('option');
                option_elem.value = option;
                option_elem.textContent = option;
                select_field.appendChild(option_elem);
            }
            select_field.name = field['name'];
            select_field.id = field['name'];
            li.appendChild(label);
            li.appendChild(select_field);
        } else if (field['type'] == 'boolean') {
            let input_field = document.createElement('input');
            input_field.type = 'checkbox';
            input_field.name = key;
            input_field.id = key;
            li.appendChild(label);
            li.appendChild(input_field);
        } else if (field['type'] == 'button') {
            let button = document.createElement('button');
            button.type = 'button';
            button.textContent = capitalize_first_letter(key);
            button.id = key + '-btn';
            button.className = 'btn btn-primary mini-btn';
            button.addEventListener('click', () => {
                let func = window[field['function']];
                if (typeof func === 'function') {
                    func(); // Llamar a la función si es válida
                } else {
                    console.error(`${field['function']} no es una función o no está definida.`);
                }
            });
            button_list.push(button);
            // li.appendChild(button);
        }
        ul.appendChild(li);
    }
    for (let button of button_list) {
        button_div.appendChild(button);
    }
    div.appendChild(button_div);

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

window.print_add_problems = function () {
    let problem = prompt("Please enter the print problems");
    problem = problem == null || problem == "" ? false : encodeUrlParam(problem);
    if (!problem) {
        alert('print problem cancelled');
        return;
    } else {
        to_load_data['print']['problems'] = problem;
    }
}

window.print_add_notes = function () {
    let notes = prompt("Please enter the print notes");
    notes = notes == null || notes == "" ? false : encodeUrlParam(notes);
    if (!notes) {
        alert('print notes cancelled');
        return;
    } else {
        to_load_data['print']['notes'] = notes;
    }
}

window.model_add_problems = function () {
    let problem = prompt("Please enter the model problems");
    problem = problem == null || problem == "" ? false : encodeUrlParam(problem);
    if (!problem) {
        alert('Model problem cancelled');
        return;
    } else {
        to_load_data['model']['problems'] = problem;
    }
}

window.model_add_notes = function () {
    let notes = prompt("Please enter the model notes");
    notes = notes == null || notes == "" ? false : encodeUrlParam(notes);
    if (!notes) {
        alert('model notes cancelled');
        return;
    } else {
        to_load_data['model']['notes'] = notes;
    }
}