import { encodeUrlParam, load_model_visor, save_capture, capitalize_first_letter, rotateY45Degrees, rotateX45Degrees } from "./utils.js";

document.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById('get_raw_file-btn').addEventListener('click', get_raw_file);

    document.getElementById('skip_terrain-btn').addEventListener('click', sub_category_terrain);
    document.getElementById('skip_part-btn').addEventListener('click', sub_category_part);
    document.getElementById('skip_other-btn').addEventListener('click', other);
    document.getElementById('skip_monster-btn').addEventListener('click', monster);

    document.getElementById('category-select').addEventListener('change', front.update_category_selectors);
    document.getElementById('sub_category-select').addEventListener('change', front.generate_form.bind(front));
    document.getElementById('source-select').addEventListener('change', front.update_source_selectors);

    document.getElementById('sub_raw-select').addEventListener('change', update_paths_selector);
    document.getElementById('path-select').addEventListener('change', update_files_selector);
    document.getElementById('file-select').addEventListener('change', load_3d_model);

    document.getElementById('switch_mode-btn').addEventListener('click', front.switch_mode.bind(front));
    document.getElementById('add_part-btn').addEventListener('click', front.add_part.bind(front));
    document.getElementById('remove_part-btn').addEventListener('click', front.remove_part.bind(front));

    document.getElementById('confirm_form-btn').addEventListener('click', confirm_form);

    document.getElementById('reset_model-btn').addEventListener('click', load_3d_model);
    document.getElementById('capture_model-btn').addEventListener('click', upload_img);
    document.getElementById('rotate_y-btn').addEventListener('click', rotateY45Degrees);
    document.getElementById('rotate_x-btn').addEventListener('click', rotateX45Degrees);

    document.getElementById('test-btn').addEventListener('click', test_function);

    document.getElementById('add_3d_model-btn').addEventListener('click', add_3d_model);

});


// terminar clase de datahandler
class DataHandler {
    constructor() {
        this.init_data();
    }
    init_data() {
        this.to_load = {
            'model_details': {},
            'print_details': {},
            'file_details': {}
        };
        this.handling = {
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
    }
}

class BackHandler {
    async get_source_data() {
        let params = new URLSearchParams({ 'database': 'h3dforge', 'name': 'sources', });
        let response = await fetch(`/mongodb/get_documents/?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        return response.json();
    }

    async get_form_data(category_id, sub_category_id) {
        let response = await fetch(`/mongodb/get_form/${category_id}-${sub_category_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        return response.json();
    }

}

class FrontHandler {
    constructor() {
        this.raw_file = {
            'source_select': document.getElementById('source-select'),
            'extension_select': document.getElementById('extension-select'),
        }
        this.file_list = {
            'sub_raw_select': document.getElementById('sub_raw-select'),
            'path_select': document.getElementById('path-select'),
            'file_select': document.getElementById('file-select'),
            'part_list_ul': document.getElementById('part_list-ul'),
            'switch_mode_btn': document.getElementById('switch_mode-btn'),
            'add_part_btn': document.getElementById('add_part-btn'),
        }
        this.category = {
            'category_select': document.getElementById('category-select'),
            'sub_category_select': document.getElementById('sub_category-select'),
        }
    }
    create_option(value, text, select_to_append = null) {
        let option = document.createElement('option');
        option.value = value;
        option.text = text;
        if (select_to_append) {
            select_to_append.appendChild(option);
        }
        return option;
    }
    create_select(id = null, classes = null, select_to_append = null) {
        let select = document.createElement('select');
        select.id = id;
        if (classes) {
            select.className = classes;
        }
        if (select_to_append) {
            select_to_append.appendChild(select);
        }
        return select;
    }
    create_button(type, text, id = null, classes = null, select_to_append = null) {
        let button = document.createElement('button');
        button.type = type;
        button.id = id;
        button.textContent = text;
        if (classes) {
            button.className = classes;
        }
        if (select_to_append) {
            select_to_append.appendChild(button);
        }
        return button;
    }
    create_input(type, id = null, name = null, value = null, classes = null, select_to_append = null) {
        let input = document.createElement('input');
        input.type = type;
        input.id = id;
        input.name = name;
        if (classes) {
            input.className = classes;
        }
        if (select_to_append) {
            select_to_append.appendChild(input);
        }
        return input;
    }
    create_div(id = null, classes = null, select_to_append = null) {
        let div = document.createElement('div');
        div.id = id;
        if (classes) {
            div.className = classes;
        }
        if (select_to_append) {
            select_to_append.appendChild(div);
        }
        return div;
    }
    create_li(id = null, classes = null, select_to_append = null) {
        let li = document.createElement('li');
        li.id = id;
        if (classes) {
            li.className = classes;
        }
        if (select_to_append) {
            select_to_append.appendChild(li);
        }
        return li;
    }
    create_label(for_id, text, select_to_append = null) {
        let label = document.createElement('label');
        label.for = for_id;
        label.textContent = text;
        if (select_to_append) {
            select_to_append.appendChild(label);
        }
        return label;
    }
    generate_source_selectors(sources) {
        for (let source of sources) {
            let source_text = capitalize_first_letter(source['name']) + '-' + capitalize_first_letter(source['server']);
            this.create_option(source['_id'], source_text, this.raw_file.source_select);
        }
        this.create_option(null, 'No source', this.raw_file.source_select);
    }
    update_source_selectors() {
        let source = sources.find(source => source['_id'] == this.raw_file.source_select.value);
        this.raw_file.extension_select.innerHTML = '';
        if (source == undefined || source['content'] == undefined || source['content']['types'] == undefined) {
            this.create_option('no_extension', 'No types', this.raw_file.extension_select);
            front.raw_file.extension_select.disabled = true;
        } else {
            front.raw_file.extension_select.disabled = false;
            for (let key in source['content']['types']) {
                this.create_option(key, key, this.raw_file.extension_select);
            }
            this.create_option('any_extension', 'Any', this.raw_file.extension_select);
        }
    }
    generate_category_selectors() {
        for (let category of data.handling.categories) {
            categories_data['category'][category['id']] = category['_id'];
        }
        for (let sub_category of data.handling.sub_categories) {
            categories_data['sub_category'][sub_category['id']] = sub_category['_id']
        }
        for (let category of data.handling.categories) {
            front.create_option(category['id'], category['name'], front.category.category_select);
        }
    }
    update_category_selectors() {
        let subs = []
        console.log('a la wea pinche perro')
        for (let sub of data.handling.sub_categories) {
            if (sub['category_id'] == this.category.category_select.value) {
                subs.push(sub);
            }
        }
        if (subs.length == 0) {
            this.category.sub_category_select.innerHTML = '';
            this.create_option(null, 'No subcategories', this.category.sub_category_select);
            this.handling.sub_select.disabled = true;
        } else {
            front.category.sub_category_select.disabled = false;
            front.category.sub_category_select.innerHTML = '';
            for (let sub of subs) {
                this.create_option(sub['id'], sub['name'], this.category.sub_category_select);
            }
            this.create_option(null, 'No subcategory', this.category.sub_category_select);
        }
        this.generate_form();
    }
    async generate_form() {
        data.to_load['model_details']['category_id'] = categories_data['category'][front.category.category_select.value];
        if (front.category.sub_category_select.value != 'null') {
            data.to_load['model_details']['sub_category_id'] = categories_data['sub_category'][front.category.sub_category_select.value];
        }
        let response_data = await back.get_form_data(front.category.category_select.value, front.category.sub_category_select.value);
        data.handling['form_keys']['form_id'] = response_data['_id'];
        let model_fields = response_data['model_details'];
        let print_fields = response_data['print_details'];
        this.generate_form_inputs('model_details-div', model_fields, 'model');
        this.generate_form_inputs('print_details-div', print_fields, 'print');
        set_status_all('enable', 'model_form-div');

    }
    generate_form_inputs(div_id, fields, form_type) {
        let div = document.getElementById(div_id);
        for (let child of div.children) {
            if (child.tagName != 'UL') {
                div.removeChild(child);
            }
        }
        let ul = div.querySelector('ul');
        let button_div = front.create_div(null, 'btn-form');
        let key_list = Object.keys(fields);
        let button_list = []
        ul.innerHTML = '';
        for (let key of key_list) {
            if (key != 'notes' && key != 'problems') {
                data.handling['form_keys'][form_type].push(key);
            }
            let field = fields[key];
            let li = front.create_li(null, 'form-group margin-bottom-5');
            let label = front.create_label(key, (capitalize_first_letter(key) + ':').replace(/_/g, ' '));
            let select_field = front.create_select(key + '_form--input');
            if ('options' in field) {
                for (let option of field['options']) {
                    front.create_option(option, option, select_field);
                }
                li.appendChild(label);
                let mini_div = front.create_div(key + '_-_' + div_id + '--db_field', 'selector-div', li);
                let button_add = front.create_button('button', 'Add', null, 'btn btn-primary xmini-btn');
                button_add.addEventListener('click', add_item_to_db)
                mini_div.appendChild(select_field);
                mini_div.appendChild(button_add);
                if (key == 'complexity' || key == 'quality') {
                    button_add.style.display = 'none';
                }
            } else if (field['type'] == 'boolean') {
                let input_field = front.create_input('checkbox', key + '_form--input', key);
                li.appendChild(label);
                li.appendChild(input_field);
            } else if (field['type'] == 'button') {
                let button = front.create_button('button', capitalize_first_letter(key), key + '-btn', 'btn btn-primary xmini-btn');
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
    switch_mode() {
        if (data.handling['file_mode'] == 'full') {
            this.file_list.switch_mode_btn.textContent = 'Switch to Full Mode';
            data.handling['file_mode'] = 'part';
            set_status_all('disable', 'part-container');
            set_status_all('enable', 'part-container');
            if (check_if_part_exists(this.file_list.file_select.value)) {
                document.getElementById('add_part-btn').disabled = true;
            }
        } else if (data.handling['file_mode'] == 'part') {
            data.handling['file_mode'] = 'full';
            this.file_list.switch_mode_btn.textContent = 'Switch to Part Mode';
            set_status_all('disable', 'part-container');
        }
    }
    add_part() {
        let sub_raw_selected = this.file_list.sub_raw_select.value + ' => ' + this.file_list.path_select.value;
        let file_selected = this.file_list.file_select.value;
        this.file_list.add_part_btn.disabled = true;
        if (check_if_part_exists(file_selected)) {
            console.log('Part already exists');
            return;
        } else {
            let key_list = Object.keys(data.handling['files_part']);
            if (key_list.includes(sub_raw_selected)) {
                let folder_li = document.getElementById('folder_' + sub_raw_selected);
                let sub_file_list = folder_li.querySelector('ul');
                let li_sub = this.create_li('file_' + file_selected, null, sub_file_list);
                this.create_input('checkbox', file_selected, 'part', 'file_' + file_selected, null, li_sub);
                this.create_label('file_' + file_selected, file_selected.split('\\').pop(), li_sub);
                data.handling.files_part[sub_raw_selected].push(file_selected);
            }
            else {
                let li = this.create_li('folder_' + sub_raw_selected, 'file_list_folder', this.file_list.part_list_ul);
                let folder_div = this.create_div(null, 'file_list_folder', li);
                this.create_input('checkbox', sub_raw_selected, 'folder', 'folder_' + sub_raw_selected, 'sub_raw_checkbox', folder_div);
                this.create_label('folder_' + sub_raw_selected, sub_raw_selected, folder_div);
                let sub_file_list = document.createElement('ul');
                let li_sub = this.create_li('file_' + file_selected, null, sub_file_list);
                this.create_input('checkbox', null, 'part', 'file_' + file_selected, null, li_sub);
                this.create_label('file_' + file_selected, file_selected.split('\\').pop(), li_sub);
                li.appendChild(sub_file_list);

                data.handling['files_part'][sub_raw_selected] = []
                data.handling.files_part[sub_raw_selected].push(file_selected);
            }
        }
    }
    remove_part() {
        let ul = this.file_list.part_list_ul;
        let sub_raws_list = ul.querySelectorAll('li.file_list_folder');
        for (let li of sub_raws_list) {
            let sub_raw_checkbox = li.querySelector('input[type="checkbox"]');
            if (sub_raw_checkbox.checked) {
                let sub_raw_key = sub_raw_checkbox.id;
                delete data.handling['files_part'][sub_raw_key];
                ul.removeChild(li);
                front.file_list.add_part_btn.disabled = false;
            }else {
                let sub_file_list = li.querySelectorAll('li');
                let sub_ul = li.querySelector('ul');
                for (let file of  sub_file_list) {
                    let file_checkbox = file.querySelector('input[type="checkbox"]');
                    if (file_checkbox.checked) {
                        let file_key = file_checkbox.id;
                        let sub_raw_id = li.id.split('folder_')[1];
                        let sub_raw_files = data.handling.files_part[sub_raw_id];
                        let index = sub_raw_files.indexOf(file_key)
                        sub_raw_files.splice(index, 1);
                        sub_ul.removeChild(file);
                    }
                }
                sub_file_list = li.querySelectorAll('li');
                if (sub_file_list.length == 0) {
                    ul.removeChild(li);
                    let sub_raw_keyx = li.id.split('folder_')[1];
                    delete data.handling['files_part'][sub_raw_keyx];
                }
            }
        }
    }
}

let sources, raw_file_data;

const data = new DataHandler();
const back = new BackHandler();
const front = new FrontHandler();

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
    console.log(data.to_load);
    console.log('====================');
    console.log('handling_data');
    console.log(data.handling);
    console.log('====================');
    console.log('steps');
    console.log(steps);
    console.log('====================');
}

init_page();
async function init_page() {
    init_status_info();
    set_base_data();
    sources = await back.get_source_data()
    front.generate_source_selectors(sources);
    front.update_source_selectors();
    update_steps('source', 'in progress');
    set_status_all();
    set_status_all('enable', 'source-div');
}

function set_base_data() {
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

function add_3d_model() {
    // console.log('to_load_data', to_load_data);
    fetch('/mongodb/add_3d_model', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data.to_load),
    })
        .then(response => response.json())
        .then(response_data => {
            console.log('Success:', response_data);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

function get_raw_file() {
    data.to_load['file_details']['source_id'] = front.raw_file.source_select.value;
    data.handling['extension'] = front.raw_file.extension_select.value;
    update_steps('source', 'done');
    update_steps('file', 'in progress');
    fetch('/mongodb/get_raw_file/' + front.raw_file.source_select.value + '/' + encodeUrlParam(front.raw_file.extension_select.value), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(response_data => {
            raw_file_data = response_data;
            data.to_load['file_details']['source_path'] = response_data['url'];
            let log_data = {
                'ID': response_data['_id'],
                'Name': response_data['name'],
                'Size': response_data['size'],
            }
            let file_info_ul = document.getElementById('file_info-ul');

            file_info_ul.innerHTML = '';
            for (let key in log_data) {
                let li = document.createElement('li');
                li.innerHTML = '<strong>' + key + '</strong>: ' + log_data[key];
                file_info_ul.appendChild(li);
            }
            update_steps('file', 'done');
            fetch('/s3/download_from_path/' + encodeUrlParam(response_data['s3']['path']) + '/' + encodeUrlParam(response_data['extension']), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
                .then(response => response.json())
                .then(response_data => {
                    let file_select = document.getElementById('file-select');
                    file_select.innerHTML = '';
                    fetch('/utils/extract_file/' + encodeUrlParam(response_data['file']), {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    })
                        .then(response => response.json())
                        .then(response_data => {
                            data.handling['selectors'] = response_data['folder_files']['files'];
                            set_status_all('enable', 'file_list-div');
                            set_status_all('disable', 'part_btns-div');
                            generate_sub_raw_selector();
                        })
                    fetch('/mongodb/get_categories_data', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    })
                        .then(response => response.json())
                        .then(response_data => {
                            data.handling.categories = response_data['categories'];
                            data.handling.sub_categories = response_data['sub_categories'];
                            front.generate_category_selectors();
                        })
                        .then(() => {
                            front.update_category_selectors();
                            set_status_all('enable', 'handlers');
                            set_status_all('enable', 'info_handlers');
                            set_max_height();
                        })
                        .catch((error) => {
                            console.error('Error:', error);
                        })
                })
        })
        .catch((error) => {
            console.error('Error:', error);
        });

}

function set_max_height() {
    let div = document.getElementById('bg-in')
    let height = div.clientHeight;
    div.style.height = height + 'px';
    div.style.overflowY = 'auto';
}

function generate_sub_raw_selector() {
    let sub_raw_select = document.getElementById('sub_raw-select');
    let path_select = document.getElementById('path-select');
    let file_select = document.getElementById('file-select');
    sub_raw_select.innerHTML = '';
    path_select.innerHTML = '';
    file_select.innerHTML = '';
    let selectors_info = data.handling['selectors'];
    for (let key in selectors_info) {
        let option = document.createElement('option');
        option.value = key;
        option.text = key;
        sub_raw_select.appendChild(option);
    }
    update_paths_selector();
}

function update_paths_selector() {
    let selectors_info = data.handling['selectors'];
    let sub_raw_value = document.getElementById('sub_raw-select').value;
    let path_select = document.getElementById('path-select');
    path_select.innerHTML = '';
    for (let key in selectors_info[sub_raw_value]) {
        let option = document.createElement('option');
        option.value = key;
        option.text = key;
        path_select.appendChild(option);
    }
    update_files_selector();
}

function update_files_selector() {
    let selectors_info = data.handling['selectors'];
    let sub_raw_value = document.getElementById('sub_raw-select').value;
    let path_value = document.getElementById('path-select').value;
    let file_select = document.getElementById('file-select');
    file_select.innerHTML = '';
    for (let file of selectors_info[sub_raw_value][path_value]) {
        let option = document.createElement('option');
        option.value = file;
        option.text = file.split('\\').pop();
        file_select.appendChild(option);
    }
    load_3d_model();
}

function load_3d_model() {
    let sub_raw_value = document.getElementById('sub_raw-select').value;
    let path_value = document.getElementById('path-select').value;
    let file_selected = document.getElementById('file-select').value;
    if (data.handling['file_mode'] == 'part') {
        if (check_if_part_exists(file_selected)) {
            console.log(data.handling['file_mode']);
            document.getElementById('add_part-btn').disabled = true;
        } else {
            document.getElementById('add_part-btn').disabled = false;
        }
    }

    let original_name = file_selected;
    data.handling['file'] = file_selected;
    load_model_visor(file_selected)
        .then(measures => {
            data.to_load['file_details']['original_name'] = original_name;
            data.to_load['print_details']['measures'] = measures;
        })
    // }
}

function check_if_part_exists(part) {
    let key_list = Object.keys(data.handling['files_part']);
    for (let key of key_list) {
        if (data.handling['files_part'][key].includes(part)) {
            return true;
        }
    }
    return false;
}

function confirm_form() {
    for (let key of ['model', 'print', 'file']) {
        if (data.handling['form_keys'][key].length) {
            for (let form_key of data.handling['form_keys'][key]) {
                let form_elem = document.getElementById(form_key + '_form--input');
                if (form_elem.tagName == 'SELECT') {
                    data.to_load[key + '_details'][form_key] = form_elem.value;
                } else if (form_elem.tagName == 'INPUT') {
                    data.to_load[key + '_details'][form_key] = form_elem.checked;
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
        'Form_id: ' + data.handling['form_keys']['form_id'] + '\n' +
        'Detail_field: ' + detail_field + '\n' +
        'Key_field: ' + key_field + '\n' +
        'New_option: ' + new_option)) {
        console.log('a la verga pinche perro')
        let new_option_encoded = encodeUrlParam(new_option);
        console.log('new_option', new_option);
        fetch('/mongodb/add_form_option/' + data.handling['form_keys']['form_id'] + '/' + detail_field + '/' + key_field + '/' + new_option_encoded, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(response => response.json())
            .then(response_data => {
                console.log('data', response_data);
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

function update_steps(key, value) {
    steps[key] = value;
    update_status_info();
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

window.print_add_problems = function () {
    let problem = prompt("Please enter the print problems");
    problem = problem == null || problem == "" ? false : encodeUrlParam(problem);
    if (!problem) {
        alert('print problem cancelled');
        return;
    } else {
        data.to_load['print']['problems'] = problem;
    }
}

window.print_add_notes = function () {
    let notes = prompt("Please enter the print notes");
    notes = notes == null || notes == "" ? false : encodeUrlParam(notes);
    if (!notes) {
        alert('print notes cancelled');
        return;
    } else {
        data.to_load['print']['notes'] = notes;
    }
}

window.model_add_problems = function () {
    let problem = prompt("Please enter the model problems");
    problem = problem == null || problem == "" ? false : encodeUrlParam(problem);
    if (!problem) {
        alert('Model problem cancelled');
        return;
    } else {
        data.to_load['model']['problems'] = problem;
    }
}

window.model_add_notes = function () {
    let notes = prompt("Please enter the model notes");
    notes = notes == null || notes == "" ? false : encodeUrlParam(notes);
    if (!notes) {
        alert('model notes cancelled');
        return;
    } else {
        data.to_load['model']['notes'] = notes;
    }
}

