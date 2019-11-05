var opcodes = {
    'nop': 0,

    'load': 1, 'mov': 1, 'store': 2,

    'add': 3, 'adc': 4, 'sub': 5, 'sbb': 6, 'cmp': 7,

    'and': 8, 'or': 9, 'xor': 10, 'not': 11, 'shl': 12, 'shr': 13,

    'jmp': 14,
    'jc': 15, 'jb': 15, 'jnae': 15,
    'jnc': 16, 'jnb': 16, 'jae': 16,
    'jz': 17, 'je': 17,
    'jnz': 18, 'jne': 18,
    'ja': 19, 'jnbe': 19,
    'jna': 20, 'jbe': 20,

    'push': 21, 'pop': 22, 'call': 23, 'ret': 24,

    'halt': 31
};

var registers_names = { 'a': 0, 'b': 1, 'ip': 2, 'sp': 3 };

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
    output, labels, future_labels;

function calculate (string) {
    try {
        return Math.floor(Function('$', '"use strict";return (' + string + ')')(output.length)) & 255;
    } catch (error) {}
}

function parse_param (param, line) {
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
        if (labels[param] != undefined) {
            return { mode: 0, data: labels[param].value };
        } else {
            future_labels.push({ label: param, line: line, position: output.length });
            return { mode: 0, data: 0 };
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
            if (labels[param] != undefined) {
                return { mode: 2, data: labels[param].value };
            } else {
                future_labels.push({ label: param, line: line, position: output.length });
                return { mode: 2, data: 0 };
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
    alert('Error on line: ' + line);
}

function assembler (data) {
    output = [];
    labels = {};
    future_labels = [];
    var binary_lines = [];
    var lines = data.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].replace(/;.*/, '').trim();
        if (line != '') {
            var parts = line.split(',');
            var opcode_text = parts[0].substring(0, parts[0].indexOf(' ')).toLowerCase();
            parts[0] = parts[0].substring(parts[0].indexOf(' '));
            if (opcode_text == '') {
                opcode_text = parts[0].toLowerCase();
                parts = [];
            } else {
                for (var j = 0; j < parts.length; j++) {
                    parts[j] = parts[j].trim();
                }
            }

            var label = '';
            if (opcode_text.substring(opcode_text.length - 1) == ':') {
                label = opcode_text.substring(0, opcode_text.length - 1);
                if (label_regexp.test(label)) {
                    labels[label] = { line: i, value: output.length };
                    label += ': ' + format_byte(output.length);
                }
                if (parts.length > 0) {
                    opcode_text = parts[0].substring(0, parts[0].indexOf(' ')).toLowerCase();
                    parts[0] = parts[0].substring(parts[0].indexOf(' '));
                    if (opcode_text == '') {
                        opcode_text = parts[0].toLowerCase();
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
                labels[opcode_text] = { line: i, value: data };
                binary_lines.push('    ' + opcode_text + ' equ ' + format_byte(data));
            }

            else if (opcode_text == 'db') {
                var bytes = [];
                for (var j = 0; j < parts.length; j++) {
                    if (parts[j].substring(0, 1) == '\'' || parts[j].substring(0, 1) == '"') {
                        parts[j] = parts[j].substring(1, parts[j].length - 1);
                        for (var k = 0; k < parts[j].length; k++) {
                            var c = parts[j].charCodeAt(k) & 255;
                            output.push(c);
                            bytes.push(format_byte(c));
                        }
                    }
                    else if (!isNaN(parts[j])) {
                        var c = parseInt(parts[j]) & 255;
                        output.push(c);
                        bytes.push(format_byte(c));
                    }
                    else {
                        var calculation = calculate(parts[j]);
                        if (calculation != undefined) {
                            output.push(calculation);
                            bytes.push(format_byte(calculation));
                        }
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
                    } else {
                        var register = registers_names[parts[0].toLowerCase()] << 2;
                        var param = parse_param(parts[1], i);
                        instruction[0] = opcode | register | param.mode;
                        instruction[1] = param.data;
                    }
                }

                output.push(instruction[0], instruction[1]);

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
        var position = future_labels[i].position;
        output[position + 1] = labels[future_labels[i].label].value;

        var label = '';
        for (var label_name in labels) {
            if (labels[label_name].value == position && labels[label_name].line == future_labels[i].line) {
                label = label_name + ': ' + format_byte(position);
            }
        }

        binary_lines[future_labels[i].line] =
            label + '    ' + pad_string((output[position] >> 3).toString(2), 5, '0') + ' ' +
            ((output[position] >> 2) & 1).toString(2) + ' ' +
            pad_string((output[position] & 3).toString(2), 2, '0') + '  ' +
            pad_string((instruction[1] >> 6).toString(2), 2, '0') + ' ' +
            pad_string((instruction[1] & 63).toString(2), 6, '0') + ' | ' +
            format_byte(output[position]) + ' ' + format_byte(output[position + 1]);
    }

    binary_label.value = '';
    for (var i = 0; i < binary_lines.length; i++) {
        binary_label.value += binary_lines[i];
        if (i != binary_lines.length - 1) binary_label.value += '\n';
    }
    binary_label.scrollTop = assembly_input.scrollTop;

    return output;
}

var mem = new Uint8Array(256), zero_memory,
    clock_count, halted, step, instruction_byte, data_byte,
    registers = new Uint8Array(4), carry_flag, zero_flag, timeout, clock_freq,
    context = canvas.getContext('2d'), points;

function update_labels () {
    halted_label.textContent = format_boolean(halted);
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
    for (var i = 0; i < 256; i++) {
        if (i == registers[registers_names.ip]) {
            memory_label_html += '<span class="ip">' + format_byte(mem[i]) + '</span> ';
        } else if (i == registers[registers_names.sp]) {
            memory_label_html += '<span class="sp">' + format_byte(mem[i]) + '</span> ';
        } else {
            memory_label_html += format_byte(mem[i]) + ' ';
        }

        if (count == 7 && i != 255) {
            memory_label_html += '\n';
            count = 0;
        } else {
            count++;
        }
    }
    memory_label.innerHTML = '<div class="memory-label-container">' + memory_label_html + '</div>';

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
    clock_count = 0;
    halted = false;
    registers[registers_names.ip] = 0;
    registers[registers_names.sp] = 0xfb;
    step = 0;
    instruction_byte = 0;
    data_byte = 0;
    registers[registers_names.a] = 0;
    registers[registers_names.b] = 0;
    carry_flag = false;
    zero_flag = false;

    zero_memory = true;
    for (var i = 0; i < 256; i++) {
        mem[i] = 0;
    }

    clearTimeout(timeout);
    auto_clock_input.checked = false;
    binary_label.value = '';
    output_label.value = '';
    points = [];

    update_labels();
}

function clock_cycle (auto_clock) {
    if (halted) return;

    if (clock_count == 150000 && unending_loop_input.checked) {
        alert('Unending loop detected!');
        halted = true;
    } else {
        clock_count++;
    }

    if (step == 0) {
        step++;
        instruction_byte = mem[registers[registers_names.ip]++];
    }

    else if (step == 1) {
        step++;
        data_byte = mem[registers[registers_names.ip]++];
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
                data = registers[data_byte >> 6] + 0xe0 + (data_byte & 31);
            } else {
                data = registers[data_byte >> 6] + (data_byte & 31);
            }
        }
        if (mode == 2) {
            address = data_byte;
            data = mem[address];
        }
        if (mode == 3) {
            if (((data_byte >> 5) & 1) == 1) {
                address = registers[data_byte >> 6] + 0xe0 + (data_byte & 31);
            } else {
                address = registers[data_byte >> 6] + (data_byte & 31);
            }
            data = mem[address];
        }

        if (opcode == opcodes.load) {
            registers[register] = data;
        }

        if (opcode == opcodes.store) {
            if (mode == 2 || mode == 3) {
                mem[address] = registers[register];

                if (address == 0xfe) {
                    if (registers[register] == 0) {
                        points.push({ type: 0, x: mem[0xfc], y: mem[0xfd] });
                    }
                    if (registers[register] == 1) {
                        points.push({ type: 1, x: mem[0xfc], y: mem[0xfd] });
                    }
                    if (registers[register] == 2) {
                        points = [];
                    }
                }
                if (address == 0xff) {
                    output_label.value += String.fromCharCode(registers[register] & 127);
                }
            }
        }

        if (opcode == opcodes.add) {
            registers[register] += data;
            carry_flag = registers[register] + data > 255;
            zero_flag = registers[register] == 0;
        }
        if (opcode == opcodes.adc) {
            registers[register] += data + carry_flag;
            carry_flag = registers[register] + data + carry_flag > 255;
            zero_flag = registers[register] == 0;
        }
        if (opcode == opcodes.sub) {
            registers[register] -= data;
            carry_flag = registers[register] - data < 0;
            zero_flag = registers[register] == 0;
        }
        if (opcode == opcodes.sbb) {
            registers[register] -= data + carry_flag;
            carry_flag = registers[register] - (data + carry_flag) < 0;
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

        if (opcode == opcodes.jmp) {
            registers[registers_names.ip] = data;
        }
        if (opcode == opcodes.jc && carry_flag) {
            registers[registers_names.ip] = data;
        }
        if (opcode == opcodes.jnc && !carry_flag) {
            registers[registers_names.ip] = data;
        }
        if (opcode == opcodes.jz && zero_flag) {
            registers[registers_names.ip] = data;
        }
        if (opcode == opcodes.jnz && !zero_flag) {
            registers[registers_names.ip] = data;
        }
        if (opcode == opcodes.ja && !carry_flag && !zero_flag) {
            registers[registers_names.ip] = data;
        }
        if (opcode == opcodes.jna && carry_flag && zero_flag) {
            registers[registers_names.ip] = data;
        }

        if (opcode == opcodes.push) {
            if (mode == 0 || mode == 1) {
                mem[registers[registers_names.sp]--] = data;
            }
        }
        if (opcode == opcodes.pop) {
            if (mode == 2 || mode == 3) {
                registers[register] = mem[++registers[registers_names.sp]];
            }
        }
        if (opcode == opcodes.call) {
            if (mode == 0 || mode == 1) {
                mem[registers[registers_names.sp]--] = registers[registers_names.ip];
                registers[registers_names.ip] = data;
            }
        }
        if (opcode == opcodes.ret) {
            if (mode == 2 || mode == 3) {
                registers[registers_names.ip] = mem[registers[registers_names.sp] + 1];
                registers[registers_names.sp] += address + 1;
            }
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
    for (var i = 0; i < output.length; i++) {
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

var examples = [
`    ; A simple Hello World example
    mov a, message
    mov b, 0
loop:
    call print_string
    inc b
    cmp b, 5
    je loop_done
    jmp loop
loop_done:
    halt

print_string:
    push a
    push b
print_string_loop:
    mov b, [a]
    cmp b, 0
    je print_string_done
    mov [0xff], b
    inc a
    jmp print_string_loop
print_string_done:
    pop b
    pop a
    ret

message: db 'Hello World!', 10, 0
`,
`    ; A simple counter program
    load a, 0
print_loop:
    inc a
    load b, a
    add b, '0'
    store b, [0xff]
    cmp a, 9
    jne print_loop

    load a, 2 * 5
    store a, [0x80 + 0x80 - 1]

    load a, 0xff
    LOAD b, 'H'
    store b, [A]
    LOAD b, 'A'
    store b, [A]
    LOAD b, 'L'
    store b, [A]
    store b, [A]
    LOAD b, 'O'
    store b, [A]
    LOAD b, '!'
    store b, [A]
    halt
`,
`    ; A cool graphics example
    mov a, 0
draw:
    mov b, [x]
    mov [0xfc], b
    add b, [y]
    mov [x], b

    mov b, [y]
    mov [0xfd], b
    sub b, [x]
    mov [y], b

    mov b, 1
    mov [0xfe], b

    cmp a, 6
    je draw_done
    inc a
    jmp draw
draw_done:
    halt

x: db 50
y: db 50
`,
`    ; Recursive fibonacci number example
    push 10
    call fib
    halt

fib:
    push b

    mov a, [sp + 3]
    cmp a, 2
    jb fib_done

    mov b, a
    push b - 1
    call fib

    push b - 2
    mov b, a
    call fib

    add a, b
fib_done:
    pop b
    ret 1
`];

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
    update_labels();
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

reset();
