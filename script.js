var opcodes = {
    nop: 0,

    load: 1, mov: 1, store: 2,

    add: 3, adc: 4, sub: 5, sbb: 6, cmp: 7,

    and: 8, or: 9, xor: 10, not: 11, shl: 12, shr: 13,

    jmp: 14,
    jc: 15, jb: 15, jnae: 15,
    jnc: 16, jnb: 16, jae: 16,
    jz: 17, je: 17,
    jnz: 18, jne: 18,
    ja: 19, jnbe: 19,
    jna: 20, jbe: 20,

    bra: 14,
    bc: 15, bb: 15, bnae: 15,
    bnc: 16, bnb: 16, bae: 16,
    bz: 17, be: 17,
    bnz: 18, bne: 18,
    ba: 19, bnbe: 19,
    bna: 20, bbe: 20,

    push: 21, pop: 22, call: 23, bcall: 23, ret: 24, bret: 24, ssp: 25,

    bankjmp: 26, bankcall: 27, bankret: 28, sdb: 29, ssb: 30,

    halt: 31
};

var registers_names = { a: 0, b: 1, ip: 2, sp: 3 };

var BANKS_COUNT = 256;
var BANK_SIZE = 256;

function pad_string (string, length, char) {
    var pad = '';
    for (var i = 0; i < length -string.length; i++) {
        pad += char;
    }
    return pad + string;
}

function format_byte (number) {
    var hex = number.toString(16);
    return number < 16 ? '0' + hex : hex;
}

function format_boolean (boolean) {
    return boolean ? 't' : 'f';
}

var label_regexp = /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    banks, current_bank, labels, future_labels;

function calculate (string) {
    try {
        return Math.floor(Function('$', '$$', '"use strict";return (' + string + ')')(banks[current_bank].length, current_bank)) & 255;
    } catch (error) {}
}

function parse_param (param, line, stop_early_labels) {
    if (stop_early_labels == undefined) {
        stop_early_labels = false;
    }

    if (!isNaN(param)) {
        return { mode: 0, data: parseInt(param) & 255 };
    }

    var register = registers_names[param.toLowerCase()];
    var position = param.indexOf('+') != -1 ? param.indexOf('+') : param.indexOf('-');
    if (position != -1) {
        register = registers_names[param.substring(0, position).trim().toLowerCase()];
    }
    if (register != undefined) {
        if (position != -1) {
            var calculation = calculate(param.substring(position));
            if (calculation != undefined) {
                return { mode: 1, data: (register << 6) | (calculation & 63) };
            }
        } else {
            return { mode: 1, data: register << 6 };
        }
    }

    if (param.substring(0, 1) == '\'' || param.substring(0, 1) == '"') {
        return { mode: 0, data: param.charCodeAt(1) & 255 };
    }

    if (label_regexp.test(param)) {
        if (stop_early_labels || labels[param] == undefined) {
            future_labels.push({ label: param, line: line, bank: current_bank, position: banks[current_bank].length });
            return { mode: 0, data: 0 };
        } else {
            return { mode: 0, data: labels[param].value };
        }
    }

    if (param.substring(0, 1) == '[') {
        param = param.substring(1, param.length - 1);

        if (!isNaN(param)) {
            return { mode: 2, data: parseInt(param) & 255 };
        }

        var register = registers_names[param.toLowerCase()];
        var position = param.indexOf('+') != -1 ? param.indexOf('+') : param.indexOf('-');
        if (position != -1) {
            register = registers_names[param.substring(0, position).trim().toLowerCase()];
        }
        if (register != undefined) {
            if (position != -1) {
                var calculation = calculate(param.substring(position));
                if (calculation != undefined) {
                    return { mode: 3, data: (register << 6) | (calculation & 63) };
                }
            } else {
                return { mode: 3, data: register << 6 };
            }
        }

        if (param.substring(0, 1) == '\'' || param.substring(0, 1) == '"') {
            return { mode: 2, data: param.charCodeAt(1) & 255 };
        }

        if (label_regexp.test(param)) {
            if (stop_early_labels || labels[param] == undefined) {
                future_labels.push({ label: param, line: line, bank: current_bank, position: banks[current_bank].length });
                return { mode: 2, data: 0 };
            } else {
                return { mode: 2, data: labels[param].value };
            }
        }

        var calculation = calculate(param);
        if (calculation != undefined) {
            return { mode: 2, data: calculation };
        }
    } else {
        var calculation = calculate(param);
        if (calculation != undefined) {
            return { mode: 0, data: calculation };
        }
    }
    alert('Error on line: ' + (line + 1) + '\nCan\'t parse parameter!');
}

function assembler (data) {
    banks = [];
    for (var i = 0; i < BANKS_COUNT; i++) {
        banks.push([]);
    }
    current_bank = 0;
    labels = {};
    future_labels = [];
    var binary_lines = [];
    var lines = data.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].replace(/;.*/, '').trim();
        if (line != '') {
            var parts = line.split(',');
            var label_name = parts[0].substring(0, parts[0].indexOf(' ')),
                opcode_text = label_name.toLowerCase();
            parts[0] = parts[0].substring(parts[0].indexOf(' '));
            if (opcode_text == '') {
                label_name = parts[0];
                opcode_text = label_name.toLowerCase();
                parts = [];
            } else {
                for (var j = 0; j < parts.length; j++) {
                    parts[j] = parts[j].trim();
                }
            }

            var label = '';
            if (label_name.substring(label_name.length - 1) == ':') {
                label = label_name.substring(0, label_name.length - 1);
                if (label_regexp.test(label)) {
                    labels[label] = { line: i, value: banks[current_bank].length };
                    label += ': ' + format_byte(banks[current_bank].length);
                }

                if (parts.length > 0) {
                    label_name = parts[0].substring(0, parts[0].indexOf(' '));
                    opcode_text = label_name.toLowerCase();
                    parts[0] = parts[0].substring(parts[0].indexOf(' '));
                    if (label_name == '') {
                        label_name = parts[0];
                        opcode_text = label_name.toLowerCase();
                        parts = [];
                    } else {
                        for (var j = 0; j < parts.length; j++) {
                            parts[j] = parts[j].trim();
                        }
                    }
                } else {
                    binary_lines.push(label);
                    continue;
                }
            }

            if (parts[0] != undefined && parts[0].substring(0, parts[0].indexOf(' ')) == 'equ') {
                var data = parse_param(parts[0].substring(parts[0].indexOf(' ')).trim(), i).data;
                labels[label_name] = { line: i, value: data };
                binary_lines.push(label_name + ' equ ' + format_byte(data));
            }

            else if (opcode_text == '%bank') {
                var data = parse_param(parts[0], i).data;
                current_bank = data;
                binary_lines.push('%bank ' + format_byte(data));
            }

            else if (opcode_text == 'db') {
                var bytes = [];
                for (var j = 0; j < parts.length; j++) {
                    if (parts[j].substring(0, 1) == '\'' || parts[j].substring(0, 1) == '"') {
                        parts[j] = parts[j].substring(1, parts[j].length - 1);
                        for (var k = 0; k < parts[j].length; k++) {
                            var c = parts[j].charCodeAt(k) & 255;
                            banks[current_bank].push(c);
                            bytes.push(format_byte(c));
                        }
                    } else {
                        var data = parse_param(parts[j], i).data;
                        banks[current_bank].push(data);
                        bytes.push(format_byte(data));
                    }
                }
                binary_lines.push(label + '    db ' + bytes.join(' '));
            }

            else {
                var instruction = [];
                var opcode = opcodes[opcode_text.toLowerCase()] << 3;

                if (parts[0] == undefined && parts[1] == undefined) {
                    if (opcode_text == 'ret') {
                        instruction[0] = opcode | 2;
                        instruction[1] = 0;
                    } else {
                        instruction[0] = opcode;
                        instruction[1] = 0;
                    }
                }

                if (parts[0] != undefined && parts[1] == undefined) {
                    if (opcode_text == 'inc') {
                        var register = registers_names[parts[0].toLowerCase()] << 2;
                        instruction[0] = (opcodes.add << 3) | register;
                        instruction[1] = 1;
                    } else if (opcode_text == 'dec') {
                        var register = registers_names[parts[0].toLowerCase()] << 2;
                        instruction[0] = (opcodes.sub << 3) | register;
                        instruction[1] = 1;
                    } else if (opcode_text == 'pop') {
                        var register = registers_names[parts[0].toLowerCase()] << 2;
                        instruction[0] = opcode | register | 2;
                        instruction[1] = 0;
                    } else if (opcode_text == 'ret') {
                        var param = parse_param(parts[0], i);
                        instruction[0] = opcode | (param.mode + 2);
                        instruction[1] = param.data;
                    } else if (opcode_text == 'bret') {
                        var param = parse_param(parts[0], i);
                        instruction[0] = opcode | (1 << 2) | (param.mode + 2);
                        instruction[1] = param.data;
                    } else if (opcode_text == 'bankret') {
                        var register = registers_names[parts[0].toLowerCase()] << 2;
                        instruction[0] = opcode | register | 2;
                        instruction[1] = 0;
                    } else if (((opcode >= (opcodes.bra << 3) && opcode <= (opcodes.bna << 3)) || opcode == (opcodes.bcall << 3)) && opcode_text.charAt(0) == 'b') {
                        var param = parse_param(parts[0], i, true);
                        instruction[0] = opcode | (1 << 2) | param.mode;
                        instruction[1] = param.mode == 0 ? ((param.data - 2) & 255) : param.data;
                    } else {
                        var param = parse_param(parts[0], i);
                        instruction[0] = opcode | param.mode;
                        instruction[1] = param.data;
                    }
                }

                if (parts[0] != undefined && parts[1] != undefined) {
                    if (opcode_text == 'mov' && parts[0].substring(0, 1) == '[') {
                        var param = parse_param(parts[0], i);
                        var register = registers_names[parts[1].toLowerCase()] << 2;
                        instruction[0] = (opcodes.store << 3) | register | param.mode;
                        instruction[1] = param.data;
                    } else if (opcode_text == 'bankret') {
                        var register = registers_names[parts[0].toLowerCase()] << 2;
                        var param = parse_param(parts[1], i);
                        instruction[0] = opcode | register | (param.mode + 2);
                        instruction[1] = param.data;
                    }  else {
                        var register = registers_names[parts[0].toLowerCase()] << 2;
                        var param = parse_param(parts[1], i);
                        instruction[0] = opcode | register | param.mode;
                        instruction[1] = param.data;
                    }
                }

                banks[current_bank].push(instruction[0], instruction[1]);

                binary_lines.push(
                    label + '    ' + pad_string((instruction[0] >> 3).toString(2), 5, '0') + ' ' +
                    ((instruction[0] >> 2) & 1).toString(2) + ' ' +
                    pad_string((instruction[0] & 3).toString(2), 2, '0') + '  ' +
                    pad_string((instruction[1] >> 6).toString(2), 2, '0') + ' ' +
                    pad_string((instruction[1] & 63).toString(2), 6, '0') + ' | ' +
                    format_byte(instruction[0]) + ' ' + format_byte(instruction[1])
                );
            }
        } else {
            binary_lines.push('');
        }
    }

    for (var i = 0; i < future_labels.length; i++) {
        var label = labels[future_labels[i].label];
        if (label != undefined) {
            var bank = banks[future_labels[i].bank];
            var position = future_labels[i].position;
            var opcode = bank[position] >> 3;
            if (
                ((opcode >= opcodes.bra && opcode <= opcodes.bna) || opcode == opcodes.bcall) &&
                ((bank[position] >> 2) & 1) == 1 &&
                (bank[position] & 3) == 0
            ) {
                bank[position + 1] = (label.value - (position + 2)) & 255;
            } else {
                bank[position + 1] = label.value;
            }

            var label = '';
            for (var label_name in labels) {
                if (labels[label_name].value == position && labels[label_name].line == future_labels[i].line) {
                    label = label_name + ': ' + format_byte(position);
                }
            }

            binary_lines[future_labels[i].line] =
                label + '    ' + pad_string((bank[position] >> 3).toString(2), 5, '0') + ' ' +
                ((bank[position] >> 2) & 1).toString(2) + ' ' +
                pad_string((bank[position] & 3).toString(2), 2, '0') + '  ' +
                pad_string((bank[position + 1] >> 6).toString(2), 2, '0') + ' ' +
                pad_string((bank[position + 1] & 63).toString(2), 6, '0') + ' | ' +
                format_byte(bank[position]) + ' ' + format_byte(bank[position + 1]);
        } else {
            alert('Error on line: ' + (future_labels[i].line + 1) + '\nCan\'t find label: ' + future_labels[i].label);
        }
    }

    binary_label.value = '';
    for (var i = 0; i < binary_lines.length; i++) {
        binary_label.value += binary_lines[i];
        if (i != binary_lines.length - 1) binary_label.value += '\n';
    }
    binary_label.scrollTop = assembly_input.scrollTop;

    var output = new Uint8Array(BANKS_COUNT * BANK_SIZE);
    for (var i = 0; i < BANKS_COUNT; i++) {
        for (var j = 0; j < banks[i].length; j++) {
            output[i * BANK_SIZE + j] = banks[i][j];
        }
    }
    return output;
}

var mem = new Uint8Array(BANKS_COUNT * BANK_SIZE), zero_memory, clock_count, halted,
    code_bank, data_bank, stack_bank, step, instruction_byte, data_byte,
    registers = new Uint8Array(4), carry_flag, zero_flag, timeout, clock_freq,
    context = canvas.getContext('2d'), points;

function update_labels () {
    halted_label.textContent = format_boolean(halted);
    code_bank_label.textContent = format_byte(code_bank);
    data_bank_label.textContent = format_byte(data_bank);
    stack_bank_label.textContent = format_byte(stack_bank);
    step_label.textContent = step;
    instruction_byte_label.textContent = format_byte(instruction_byte);
    data_byte_label.textContent = format_byte(data_byte);
    instruction_pointer_label.textContent = format_byte(registers[registers_names.ip]);
    register_a_label.textContent = format_byte(registers[registers_names.a]);
    register_b_label.textContent = format_byte(registers[registers_names.b]);
    stack_pointer_label.textContent = format_byte(registers[registers_names.sp]);
    carry_flag_label.textContent = format_boolean(carry_flag);
    zero_flag_label.textContent = format_boolean(zero_flag);

    var memory_label_html = '';
    var count = 0;
    for (var i = 0; i < BANK_SIZE; i++) {
        if (bank_input.value == code_bank && i == registers[registers_names.ip]) {
            memory_label_html += '<span class="ip">' + format_byte(mem[(bank_input.value << 8) | i]) + '</span> ';
        } else if (bank_input.value == stack_bank && i == registers[registers_names.sp]) {
            memory_label_html += '<span class="sp">' + format_byte(mem[(bank_input.value << 8) | i]) + '</span> ';
        } else {
            memory_label_html += format_byte(mem[(bank_input.value << 8) | i]) + ' ';
        }

        if (count == 7 && i != 255) {
            memory_label_html += '\n';
            count = 0;
        } else {
            count++;
        }
    }
    memory_label.innerHTML = '<div class="memory-label-container">' + memory_label_html + '</div>';
}

function render_vector_lines () {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.beginPath();
    for (var i = 0; i < points.length; i++) {
        if (points[i].type == 0) {
            context.moveTo(points[i].x, points[i].y);
        }
        if (points[i].type == 1) {
            context.lineTo(points[i].x, points[i].y);
        }
    }
    context.strokeStyle = localStorage.dark_mode == 'true' ? '#0f0' : '#111';
    context.stroke();
    context.closePath();
}

function reset () {
    code_bank = 0;
    bank_input.value = code_bank;
    data_bank = 0;
    stack_bank = 0;
    memory_label.scrollTop = 0;
    clock_count = 0;
    halted = false;
    registers[registers_names.ip] = 0;
    registers[registers_names.sp] = 0xfa;
    step = 0;
    instruction_byte = 0;
    data_byte = 0;
    registers[registers_names.a] = 0;
    registers[registers_names.b] = 0;
    carry_flag = false;
    zero_flag = false;

    zero_memory = true;
    for (var i = 0; i < BANKS_COUNT * BANK_SIZE; i++) {
        mem[i] = 0;
    }

    clearTimeout(timeout);
    auto_clock_input.checked = false;
    binary_label.value = '';
    output_label.value = '';
    points = [];

    keyboard.value = '';

    update_labels();
    render_vector_lines();
}

function memory_read (bank, address) {
    address = (bank << 8) | address;

    if (address == 0x00fe) {
        if (keyboard.value.length > 0) {
            var c = keyboard.value.charCodeAt(0) & 127;
            keyboard.value = keyboard.value.substring(1);
            mem[0x00fe] = c;
            return c;
        } else {
            mem[0x00fe] = 0;
            return 0;
        }
    }

    return mem[address];
}

function memory_write (bank, address, data) {
    address = (bank << 8) | address;
    mem[address] = data;

    if (address == 0x00fd) {
        var previous_point = points.length > 0 ? points[points.length - 1] : { type: 0, x: 0, y: 0 };
        if (data == 0) {
            points = [];
        }
        if (data == 1) {
            render_vector_lines();
        }
        if (data == 2) {
            points.push({ type: 0, x: mem[0x00fb], y: mem[0x00fc] });
        }
        if (data == 3) {
            points.push({ type: 1, x: mem[0x00fb], y: mem[0x00fc] });
        }
        if (data == 4) {
            points.push({ type: 0, x: (previous_point.x + mem[0x00fb]) & 255, y: (previous_point.y + mem[0x00fc]) & 255 });
        }
        if (data == 5) {
            points.push({ type: 1, x: (previous_point.x + mem[0x00fb]) & 255, y: (previous_point.y + mem[0x00fc]) & 255 });
        }
    }

    if (address == 0x00ff) {
        output_label.value += String.fromCharCode(data & 127);
        output_label.scrollTop = output_label.scrollHeight;
    }
}

function clock_cycle (auto_clock) {
    if (halted) return;

    if (!auto_clock_input.checked && clock_count == 150000 && unending_loop_input.checked) {
        alert('Unending loop detected!');
        halted = true;
    } else {
        clock_count++;
    }

    if (step == 0) {
        step++;
        instruction_byte = memory_read(code_bank, registers[registers_names.ip]++);
    }

    else if (step == 1) {
        step++;
        data_byte = memory_read(code_bank, registers[registers_names.ip]++);
    }

    else if (step == 2) {
        step = 0;

        var opcode = instruction_byte >> 3;
        var register = (instruction_byte >> 2) & 1;
        var mode = instruction_byte & 3;

        var data, address;
        if (mode == 0) {
            data = data_byte;
        }
        if (mode == 1) {
            if (((data_byte >> 5) & 1) == 1) {
                data = registers[data_byte >> 6] + (0xe0 | (data_byte & 31));
            } else {
                data = registers[data_byte >> 6] + (data_byte & 31);
            }
        }
        if (mode == 2) {
            address = data_byte;
            data = memory_read(data_bank, address);
        }
        if (mode == 3) {
            if (((data_byte >> 5) & 1) == 1) {
                address = registers[data_byte >> 6] + (0xe0 | (data_byte & 31));
            } else {
                address = registers[data_byte >> 6] + (data_byte & 31);
            }
            data = memory_read(data_bank, address);
        }

        if (opcode == opcodes.load) {
            registers[register] = data;
        }

        if (opcode == opcodes.store) {
            if (mode == 2 || mode == 3) {
                memory_write(data_bank, address, registers[register]);
            }
        }

        if (opcode == opcodes.add) {
            carry_flag = registers[register] + data > 255;
            registers[register] += data;
            zero_flag = registers[register] == 0;
        }
        if (opcode == opcodes.adc) {
            carry_flag = registers[register] + (data + carry_flag) > 255;
            registers[register] += data + carry_flag;
            zero_flag = registers[register] == 0;
        }
        if (opcode == opcodes.sub) {
            carry_flag = registers[register] - data < 0;
            registers[register] -= data;
            zero_flag = registers[register] == 0;
        }
        if (opcode == opcodes.sbb) {
            carry_flag = registers[register] - (data + carry_flag) < 0;
            registers[register] -= data + carry_flag;
            zero_flag = registers[register] == 0;
        }
        if (opcode == opcodes.cmp) {
            carry_flag = registers[register] - data < 0;
            zero_flag = registers[register] - data == 0;
        }

        if (opcode == opcodes.and) {
            registers[register] &= data;
            zero_flag = registers[register] == 0;
        }
        if (opcode == opcodes.or) {
            registers[register] |= data;
            zero_flag = registers[register] == 0;
        }
        if (opcode == opcodes.xor) {
            registers[register] ^= data;
            zero_flag = registers[register] == 0;
        }
        if (opcode == opcodes.not) {
            registers[register] = ~data;
            zero_flag = registers[register] == 0;
        }
        if (opcode == opcodes.shl) {
            registers[register] <<= data & 7;
            zero_flag = registers[register] == 0;
        }
        if (opcode == opcodes.shr) {
            registers[register] >>= data & 7;
            zero_flag = registers[register] == 0;
        }

        if (opcode == opcodes.jmp && register == 0) {
            registers[registers_names.ip] = data;
        }
        if (opcode == opcodes.jc && register == 0 && carry_flag) {
            registers[registers_names.ip] = data;
        }
        if (opcode == opcodes.jnc && register == 0 && !carry_flag) {
            registers[registers_names.ip] = data;
        }
        if (opcode == opcodes.jz && register == 0 && zero_flag) {
            registers[registers_names.ip] = data;
        }
        if (opcode == opcodes.jnz && register == 0 && !zero_flag) {
            registers[registers_names.ip] = data;
        }
        if (opcode == opcodes.ja && register == 0 && !carry_flag && !zero_flag) {
            registers[registers_names.ip] = data;
        }
        if (opcode == opcodes.jna && register == 0 && (carry_flag || zero_flag)) {
            registers[registers_names.ip] = data;
        }

        if (opcode == opcodes.bra && register == 1) {
            registers[registers_names.ip] += data;
        }
        if (opcode == opcodes.bc && register == 1 && carry_flag) {
            registers[registers_names.ip] += data;
        }
        if (opcode == opcodes.bnc && register == 1 && !carry_flag) {
            registers[registers_names.ip] += data;
        }
        if (opcode == opcodes.bz && register == 1 && zero_flag) {
            registers[registers_names.ip] += data;
        }
        if (opcode == opcodes.bnz && register == 1 && !zero_flag) {
            registers[registers_names.ip] += data;
        }
        if (opcode == opcodes.ba && register == 1 && !carry_flag && !zero_flag) {
            registers[registers_names.ip] += data;
        }
        if (opcode == opcodes.bna && register == 1 && (carry_flag || zero_flag)) {
            registers[registers_names.ip] += data;
        }

        if (opcode == opcodes.push) {
            if (mode == 0 || mode == 1) {
                memory_write(stack_bank, registers[registers_names.sp]--, data);
            }
        }
        if (opcode == opcodes.pop) {
            if (mode == 2 || mode == 3) {
                registers[register] = memory_read(stack_bank, ++registers[registers_names.sp]);
            }
        }
        if (opcode == opcodes.call && register == 0) {
            if (mode == 0 || mode == 1) {
                memory_write(stack_bank, registers[registers_names.sp]--, registers[registers_names.ip]);
                registers[registers_names.ip] = data;
            }
        }
        if (opcode == opcodes.bcall && register == 1) {
            if (mode == 0 || mode == 1) {
                memory_write(stack_bank, registers[registers_names.sp]--, registers[registers_names.ip]);
                registers[registers_names.ip] += data;
            }
        }
        if (opcode == opcodes.ret && register == 0) {
            if (mode == 2 || mode == 3) {
                registers[registers_names.ip] = memory_read(stack_bank, registers[registers_names.sp] + 1);
                registers[registers_names.sp] += address + 1;
            }
        }
        if (opcode == opcodes.bret && register == 1) {
            if (mode == 2 || mode == 3) {
                registers[registers_names.ip] += memory_read(stack_bank, registers[registers_names.sp] + 1);
                registers[registers_names.sp] += address + 1;
            }
        }
        if (opcode == opcodes.ssp) {
            registers[registers_names.sp] = data;
        }

        if (opcode == opcodes.bankjmp) {
            code_bank = registers[register];
            bank_input.value = code_bank;
            memory_label.scrollTop = 0;
            registers[registers_names.ip] = data;
        }
        if (opcode == opcodes.bankcall) {
            if (mode == 0 || mode == 1) {
                code_bank = registers[register];
                bank_input.value = code_bank;
                memory_label.scrollTop = 0;
                memory_write(stack_bank, registers[registers_names.sp]--, registers[registers_names.ip]);
                registers[registers_names.ip] = data;
            }
        }
        if (opcode == opcodes.bankret) {
            if (mode == 2 || mode == 3) {
                code_bank = registers[register];
                bank_input.value = code_bank;
                memory_label.scrollTop = 0;
                registers[registers_names.ip] = memory_read(stack_bank, registers[registers_names.sp] + 1);
                registers[registers_names.sp] += address + 1;
            }
        }
        if (opcode == opcodes.sdb) {
            data_bank = data;
        }
        if (opcode == opcodes.ssb) {
            stack_bank = data;
        }

        if (opcode == opcodes.halt) {
            halted = true;
        }
    }

    if (auto_clock && auto_clock_input.checked) {
        var time = 1000 / clock_freq;
        while (time < 20) {
            clock_cycle(false);
            time += 1000 / clock_freq;
        }
        update_labels();
        timeout = setTimeout(function () {
            clock_cycle(true);
        }, 1000 / clock_freq);
    }
}

assembly_input.onkeydown = function (event) {
    if (event.keyCode === 9) {
        event.preventDefault();
        var start = this.selectionStart;
        var end = this.selectionEnd;
        var target = event.target;
        var value = target.value;
        target.value = value.substring(0, start) + '    ' + value.substring(end);
        this.selectionStart = this.selectionEnd = start + 4;
        localStorage.assembly = assembly_input.value;
    }
};

assembly_input.oninput = function () {
    localStorage.assembly = assembly_input.value;
};

assembly_input.onscroll = function () {
    binary_label.scrollTop = assembly_input.scrollTop;
};

function reset_and_assemble () {
    reset();
    zero_memory = false;
    var output = assembler(assembly_input.value);
    for (var i = 0; i < output.length; i++) {
        mem[i] = output[i];
    }
    update_labels();
    return output;
}

assemble_button.onclick = reset_and_assemble;

function run_program () {
    auto_clock_input.checked = false;
    if (!zero_memory) {
        while (!halted) {
            clock_cycle(false);
        }
        update_labels();
    }
}

run_button.onclick = run_program;

assemble_and_run_button.onclick = function () {
    reset_and_assemble();
    run_program();
};

download_bin_button.onclick = function () {
    var output = reset_and_assemble();

    var file_dump = 'v2.0 raw\n';
    for (var i = 0; i < BANK_SIZE; i++) {
        file_dump += format_byte(output[i]) + '\n';
    }

    var link = document.createElement('a');
    link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(file_dump);
    link.download = 'program.bin';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

reset_button.onclick = reset;

clock_button.onclick = function () {
    clock_cycle(false);
    update_labels();
};

if (localStorage.clock_freq != undefined) {
    clock_freq_input.value = localStorage.clock_freq;
}

clock_freq = parseInt(clock_freq_input.value);

clock_freq_input.onchange = function () {
    clock_freq = parseInt(clock_freq_input.value);
    localStorage.clock_freq = clock_freq_input.value;
};

auto_clock_input.onchange = function () {
    clock_cycle(true);
};

if (localStorage.assembly != undefined) {
    assembly_input.value = localStorage.assembly;
} else {
    assembly_input.value = examples[0];
}

example_input.onchange = function () {
    reset();
    assembly_input.value = examples[example_input.value];
    localStorage.assembly = assembly_input.value;
    example_input.value = '';
};

if (localStorage.dark_mode == 'true') {
    document.body.classList.add('dark');
    dark_mode_input.checked = true;
}

dark_mode_input.onchange = function () {
    if (dark_mode_input.checked) {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
    localStorage.dark_mode = dark_mode_input.checked;
    render_vector_lines();
};

if (localStorage.unending_loop == 'false') {
    unending_loop_input.checked = false;
}

unending_loop_input.onchange = function () {
    localStorage.unending_loop = unending_loop_input.checked;
};

document.onkeydown = function (event) {
    if (event.keyCode == 83 && (navigator.platform.match('Mac') ? event.metaKey : event.ctrlKey)) {
        event.preventDefault();
    }
};

for (var i = 0; i < BANKS_COUNT; i++) {
    var option = document.createElement('option');
    option.value = i;
    option.textContent = 'Bank ' + i;
    bank_input.appendChild(option);
}

bank_input.onchange = function () {
    update_labels();
    memory_label.scrollTop = 0;
};

reset();
