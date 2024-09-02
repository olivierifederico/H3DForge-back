import { encodeUrlParam, load_model_visor, save_capture, capitalize_first_letter } from "./utils.js";

document.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById('get_raw_file-btn').addEventListener('click', get_raw_file);

    document.getElementById('skip_terrain-btn').addEventListener('click', sub_category_terrain);
    document.getElementById('skip_part-btn').addEventListener('click', sub_category_part);
    document.getElementById('skip_other-btn').addEventListener('click', other);
    document.getElementById('skip_monster-btn').addEventListener('click', monster);

    document.getElementById('category-select').addEventListener('change', category_select);
    document.getElementById('sub_category-select').addEventListener('change', load_category);
    document.getElementById('source-select').addEventListener('change', update_source_data);
    document.getElementById('folder-select').addEventListener('change', update_file_list);
    document.getElementById('file-select').addEventListener('change', load_3d_model);

    document.getElementById('switch_mode-btn').addEventListener('click', switch_mode);
    document.getElementById('add_part-btn').addEventListener('click', add_part);

    document.getElementById('confirm_form-btn').addEventListener('click', confirm_form);

    document.getElementById('reset_model-btn').addEventListener('click', load_3d_model);
    document.getElementById('capture_model-btn').addEventListener('click', upload_img);

    document.getElementById('test-btn').addEventListener('click', test_function);

});

let sources, categories, sub_categories, raw_file_data, front_data, to_load_data, handling_data;

let categories_data = {
    'category': {},
    'sub_category': {}
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
// console.log('raw_to_db.js loaded');
function init_page() {
    init_status_info();
    set_base_data();
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

        .then(() => {
            update_steps('source', 'in progress');
            set_status_all();
            set_status_all('enable', 'source-div');

            // set_status_all('disable', 'form-container')
            // set_status_all('enable', 'category-div')
        })
}

function set_base_data() {
    to_load_data = {}
    to_load_data = {
        'model_details': {},
        'print_details': {},
        'file_details': {}
    };
    handling_data = {}
    handling_data = {
        'extension': false,
        'print': false,
        'file_mode': 'full',
        'files_part': {},
        'file_count': 0,
        'form_keys': {
            'model': [],
            'print': [],
            'file': [],
        },
        files: {}
    };
    steps = {
        'init': 'ready',
        'source': 'ready',
        'file': 'ready',
        'model 3D': 'ready',
        'category': 'ready',
        'form': 'ready',
    }
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
    let source_id = document.getElementById('source-select').value;
    let extension = document.getElementById('extension-select').value;
    set_status_div_children('disable', 'source-div', ['select_source_ext-btn']);
    // button.textContent = 'Reset';
    to_load_data['file_details']['source_id'] = source_id;
    handling_data['extension'] = extension;
    update_steps('source', 'done');
    update_steps('file', 'in progress');
    // set_status_div_children('disable', 'file_info_btns-div', ['load-btn']);

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

function get_raw_file() {
    let source_id = document.getElementById('source-select').value;
    let extension = document.getElementById('extension-select').value;
    to_load_data['file_details']['source_id'] = source_id;
    handling_data['extension'] = extension;
    update_steps('source', 'done');
    update_steps('file', 'in progress');
    fetch('/mongodb/get_raw_file/' + source_id + '/' + encodeUrlParam(extension), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(data => {
            raw_file_data = data;
            to_load_data['file_details']['source_path'] = data['url'];
            let log_data = {
                'ID': data['_id'],
                'Name': data['name'],
                'Size': data['size'],
            }
            let file_info_ul = document.getElementById('file_info-ul');

            file_info_ul.innerHTML = '';
            for (let key in log_data) {
                let li = document.createElement('li');
                li.innerHTML = '<strong>' + key + '</strong>: ' + log_data[key];
                file_info_ul.appendChild(li);
            }
            update_steps('file', 'done');
            fetch('/s3/download_from_path/' + encodeUrlParam(data['s3']['path']) +'/' + encodeUrlParam(data['extension']), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
                .then(response => response.json())
                .then(data => {
                    let file_select = document.getElementById('file-select');
                    file_select.innerHTML = '';
                    if (extension != '.stl') {
                        fetch('/utils/extract_file/' + encodeUrlParam(data['files'][0]), {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        })
                            .then(response => response.json())
                            .then(data => {
                                handling_data['files'] = data['folder_files'];
                                set_status_all('enable', 'file_list-div');
                                set_status_all('disable', 'part_btns-div');
                                generate_file_list();
                                update_file_list();
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
                                for (let category of categories) {
                                    categories_data
                                    categories_data['category'][category['id']] = category['_id'];
                                }
                                sub_categories = data['sub_categories'];
                                for (let sub_category of sub_categories) {
                                    categories_data['sub_category'][sub_category['id']] = sub_category['_id']
                                }
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
                                set_status_all('enable', 'handlers');
                                set_status_all('enable', 'info_handlers');
                            })
                            .catch((error) => {
                                console.error('Error:', error);
                            })
                    }
                })
        })
        .catch((error) => {
            console.error('Error:', error);
        });

}

function update_file_list() {
    let folder_select = document.getElementById('folder-select');
    let folder = folder_select.value;
    let file_select = document.getElementById('file-select');
    file_select.innerHTML = '';
    for (let filename of handling_data['files']['file_data'][folder]['content']) {
        let option = document.createElement('option');
        option.value = filename;
        option.text = filename;
        file_select.appendChild(option);
    }
    load_3d_model();
}

function generate_file_list() {
    let file_select = document.getElementById('file-select');
    file_select.innerHTML = '';
    let folder_select = document.getElementById('folder-select');
    folder_select.innerHTML = '';
    let file_list = handling_data['files']['file_data'];
    for (let folder in file_list) {
        let option = document.createElement('option');
        option.value = folder;
        option.text = folder;
        folder_select.appendChild(option);
    }
}

function load_3d_model() {
    let folder_selected = document.getElementById('folder-select').value;
    let file_selected = document.getElementById('file-select').value;
    if (handling_data['file_mode'] == 'part') {
        if (check_if_part_exists(file_selected)) {
            console.log(handling_data['file_mode']);
            document.getElementById('add_part-btn').disabled = true;
        } else {
            document.getElementById('add_part-btn').disabled = false;
        }
    }

    let original_name = file_selected;
    handling_data['file'] = file_selected;
    if (file_selected) {
        if (folder_selected != 'no_folder') {
            file_selected = 'extracted/folders/' + folder_selected + '/' + file_selected;
        }
        load_model_visor(file_selected)
            .then(measures => {
                to_load_data['file_details']['original_name'] = original_name;
                to_load_data['print_details']['measures'] = measures;
            })
    }
}

function switch_mode() {
    let switch_mode_btn = document.getElementById('switch_mode-btn');
    let file_selected = document.getElementById('file-select').value;
    if (handling_data['file_mode'] == 'full') {
        handling_data['file_mode'] = 'part';
        switch_mode_btn.textContent = 'Switch to Full Mode';
        // set_status_all('disable', 'model_form-div');
        set_status_all('disable', 'part-container');
        set_status_all('enable', 'part-container');
        if (check_if_part_exists(file_selected)) {
            document.getElementById('add_part-btn').disabled = true;
        }
    } else if (handling_data['file_mode'] == 'part') {
        handling_data['file_mode'] = 'full';
        switch_mode_btn.textContent = 'Switch to Part Mode';
        set_status_all('disable', 'part-container');
        // set_status_all('enable', 'model_form-div');
    }
}

function add_part() {
    let folder_selected = document.getElementById('folder-select').value;
    let file_selected = document.getElementById('file-select').value;
    document.getElementById('add_part-btn').disabled = true;
    if (check_if_part_exists(file_selected)) {
        console.log('Part already exists');
        return;
    } else {

        let key_list = Object.keys(handling_data['files_part']);
        if (key_list.includes(folder_selected)) {
            let folder_li = document.getElementById('folder_' + folder_selected);
            let sub_file_list = folder_li.querySelector('ul');
            let li_sub = document.createElement('li');
            li_sub.id = 'file_' + file_selected;
            let checkbox_sub = document.createElement('input');
            let label_sub = document.createElement('label');
            checkbox_sub.type = 'checkbox';
            checkbox_sub.name = 'part';
            checkbox_sub.value = 'file_' + file_selected;
            label_sub.for = 'file_' + file_selected;
            label_sub.textContent = file_selected;
            li_sub.appendChild(checkbox_sub);
            li_sub.appendChild(label_sub);
            sub_file_list.appendChild(li_sub);
            handling_data.files_part[folder_selected].push(file_selected);

        }
        else {
            let li = document.createElement('li');
            li.className = 'file_list_folder';
            let folder_div = document.createElement('div');
            // folder_div.className = 'file_list_folder';
            li.id = 'folder_' + folder_selected;
            let checkbox = document.createElement('input');
            let label = document.createElement('label');
            let sub_file_list = document.createElement('ul');
            checkbox.type = 'checkbox';
            checkbox.name = 'folder';
            checkbox.value = 'folder_' + folder_selected;
            label.for = 'folder_' + folder_selected;
            label.textContent = folder_selected;
            folder_div.appendChild(checkbox);
            folder_div.appendChild(label);
            li.appendChild(folder_div);
            document.getElementById('part_list-ul').appendChild(li);
            let li_sub = document.createElement('li');
            li_sub.id = 'file_' + file_selected;
            let checkbox_sub = document.createElement('input');
            let label_sub = document.createElement('label');
            checkbox_sub.type = 'checkbox';
            checkbox_sub.name = 'part';
            checkbox_sub.value = 'file_' + file_selected;
            label_sub.for = 'file_' + file_selected;
            label_sub.textContent = file_selected;
            li_sub.appendChild(checkbox_sub);
            li_sub.appendChild(label_sub);
            sub_file_list.appendChild(li_sub);
            li.appendChild(sub_file_list);

            handling_data['files_part'][folder_selected] = []
            handling_data.files_part[folder_selected].push(file_selected);
        }
    }
}

function check_if_part_exists(part) {
    let key_list = Object.keys(handling_data['files_part']);
    for (let key of key_list) {
        if (handling_data['files_part'][key].includes(part)) {
            return true;
        }
    }
    return false;
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
        set_status_all('disable', 'file_list-ul');
    } else {
        set_status_div_children('disable', 'file_list_btn-div', ['confirm_model-btn']);
        document.getElementById('confirm_model-btn').textContent = 'Reset';
        document.getElementById('select_category-btn').disabled = true;
        update_steps('model 3D', 'ready');
        update_steps('category', 'ready');
        set_status_all('enable', 'file_list-ul');
    }
}

function load_category() {
    let cat_select = document.getElementById('category-select');
    let sub_select = document.getElementById('sub_category-select');
    let cat_id = cat_select.value;
    to_load_data['model_details']['category_id'] = categories_data['category'][cat_id];
    if (sub_select.value != 'null') {
        cat_id += '-' + sub_select.value;
        to_load_data['model_details']['sub_category_id'] = categories_data['sub_category'][sub_select.value];
    }
    fetch('/mongodb/get_form/' + cat_id, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(data => {
            handling_data['form_keys']['form_id'] = data['_id'];
            let model_fields = data['model_details'];
            let print_fields = data['print_details'];
            generate_input_form('model_details-div', model_fields, 'model');
            generate_input_form('print_details-div', print_fields, 'print');
            set_status_all('enable', 'model_form-div');
            // set_status_all('disable', 'form-container');
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

function confirm_category() {
    update_steps('category', 'done');
    update_steps('form', 'in progress');
    set_status_div_children('disable', 'category_btn-div', []);
    // set_status_all('enable', 'form-div');
}

function confirm_form() {
    for (let key of ['model', 'print', 'file']) {
        if (handling_data['form_keys'][key].length) {
            for (let form_key of handling_data['form_keys'][key]) {
                let form_elem = document.getElementById(form_key + '_form--input');
                if (form_elem.tagName == 'SELECT') {
                    to_load_data[key + '_details'][form_key] = form_elem.value;
                } else if (form_elem.tagName == 'INPUT') {
                    to_load_data[key + '_details'][form_key] = form_elem.checked;
                }
            }
        }
    }
}

function add_item_to_db() {
    let field_info = this.parentElement.id.split('_-_');
    let key_field = field_info[0];
    let detail_field = field_info[1].split('--')[0].split('-div')[0];
    let new_option = prompt('Enter the new option for ' + key_field);
    if (new_option == null || new_option == '') {
        alert('Operation cancelled');
        return;
    }
    if (confirm(
        'Form_id: ' + handling_data['form_keys']['form_id'] + '\n' +
        'Detail_field: ' + detail_field + '\n' +
        'Key_field: ' + key_field + '\n' +
        'New_option: ' + new_option)) {
        console.log('a la verga pinche perro')
        let new_option_encoded = encodeUrlParam(new_option);
        console.log('new_option', new_option);
        fetch('/mongodb/add_form_option/' + handling_data['form_keys']['form_id'] + '/' + detail_field + '/' + key_field + '/' + new_option_encoded, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(response => response.json())
            .then(data => {
                console.log('data', data);
                let select_field = document.getElementById(key_field + '_form--input');
                let option = document.createElement('option');
                option.value = new_option;
                option.text = new_option;
                select_field.appendChild(option);
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    } else {
        alert('Operation cancelled');
    }
}

function set_status_all(set = 'disable', div = null) {
    let elements = document.querySelectorAll('input, button, select, textarea');
    if (div) {
        div = document.getElementById(div);
        elements = div.querySelectorAll('input, button, select, textarea');
    }
    elements.forEach(element => {
        if (set == 'enable') {
            element.disabled = false;
        } else if (set == 'disable') {
            element.disabled = true;
        }
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
    set_status_all();
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

function generate_input_form(div_id, fields, form_type) {
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
    let button_list = []
    ul.innerHTML = '';
    for (let key of key_list) {
        if (key != 'notes' && key != 'problems') {
            handling_data['form_keys'][form_type].push(key);
        }
        let field = fields[key];
        let li = document.createElement('li');
        li.className = 'form-group margin-bottom-5';
        let label = document.createElement('label');
        label.for = key;
        label.textContent = (capitalize_first_letter(key) + ':').replace(/_/g, ' ');
        let select_field = document.createElement('select');
        select_field.id = key + '_form--input';
        if ('options' in field) {
            for (let option of field['options']) {
                let option_elem = document.createElement('option');
                option_elem.value = option;
                option_elem.textContent = option;
                select_field.appendChild(option_elem);
            }
            li.appendChild(label);
            let mini_div = document.createElement('div');
            mini_div.className = 'selector-div';
            mini_div.id = key + '_-_' + div_id + '--db_field'
            let button_add = document.createElement('button');
            button_add.type = 'button';
            button_add.textContent = 'Add';
            button_add.className = 'btn btn-primary xmini-btn';
            button_add.addEventListener('click', add_item_to_db)
            mini_div.appendChild(select_field);
            mini_div.appendChild(button_add);
            li.appendChild(mini_div);
            if (key == 'complexity' || key == 'quality') {
                button_add.style.display = 'none';
            }
        } else if (field['type'] == 'boolean') {
            let input_field = document.createElement('input');
            input_field.type = 'checkbox';
            input_field.name = key;
            input_field.id = key + '_form--input';
            li.appendChild(label);
            li.appendChild(input_field);
        } else if (field['type'] == 'button') {
            let button = document.createElement('button');
            button.type = 'button';
            button.textContent = capitalize_first_letter(key);
            button.id = key + '-btn';
            button.className = 'btn btn-primary xmini-btn';
            button.addEventListener('click', () => {
                let func = window[field['function']];
                if (typeof func === 'function') {
                    func(); // Llamar a la función si es válida
                } else {
                    console.error(`${field['function']} no es una función o no está definida.`);
                }
            });
            button_list.push(button);
        }
        if (field['type'] != 'button') {
            ul.appendChild(li);
        }
        for (let button of button_list) {
            button_div.appendChild(button);
        }
        div.appendChild(button_div);
    }
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
    load_category();
}

function upload_img() {
    let dataURL = save_capture();  // Obtiene la imagen en formato base64
    fetch('/upload_image', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 'image': dataURL }),  // Envía el dataURL en el cuerpo de la solicitud
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function sub_category_terrain() {
    set_sub_category('terrain');
}

function sub_category_part() {
    set_sub_category('part');
}

function other() {
    set_sub_category('other');
}

function monster() {
    set_sub_category('monster');
}

function set_sub_category(sub_category) {
    fetch('/mongodb/set_sub_category/' + raw_file_data['_id'] + '/' + sub_category, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            fetch('/s3/remove_local_files', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
                .then(response => response.json())
                .then(data => {
                    console.log(data);
                    get_file();
                    document.getElementById('file_list-ul').innerHTML = '';
                })
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

function fix() {
    // 66aa6e5a2ad0dc78c5ba2b91
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