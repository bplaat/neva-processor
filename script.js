var opcodes = {
    'nop': 0,

    'load': 1, 'store': 2,

    'add': 3, 'adc': 4, 'sub': 5, 'sbb': 6, 'cmp': 7,

    'and': 8, 'or': 9, 'xor': 10, 'not': 11, 'shl': 12, 'shr': 13,

    'jmp': 14,
    'jc': 15, 'jb': 15, 'jnae': 15,
    'jnc': 16, 'jnb': 16, 'jae': 16,
    'jz': 17, 'je': 17,
    'jnz': 18, 'jne': 18,
    'ja': 19, 'jnbe': 19,
    'jna': 20, 'jbe': 20,

    'halt': 31
};

var registers_names = { 'a' : 0, 'b' : 1 };

function pad_string(string, length, char) {
    var pad = '';
    for (var i = 0; i < length -string.length; i++) {
        pad += char;
    }
    return pad + string;
}

function format_byte(number) {
    var hex = number.toString(16);
    return number < 16 ? '0' + hex : hex;
}

function format_boolean(boolean) {
    return boolean ? 't' : 'f';
}

var label_regexp = /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    output, labels, future_labels;

function parse_param(param, line) {
    if (!isNaN(param)) {
        return { mode: 0, data: parseInt(param) & 255 };
    }

    if (registers_names[param.toLowerCase()] != undefined) {
        return { mode: 1, data: registers_names[param.toLowerCase()] };
    }

    if (param.substring(0, 1) == '\'' || param.substring(0, 1) == '"') {
        return { mode: 0, data: param.charCodeAt(1) & 255 };
    }

    if (label_regexp.test(param)) {
        if (labels[param] != undefined) {
            return { mode: 0, data: labels[param] };
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

        if (registers_names[param.toLowerCase()] != undefined) {
            return { mode: 3, data: registers_names[param.toLowerCase()] };
        }

        if (param.substring(0, 1) == '\'' || param.substring(0, 1) == '"') {
            return { mode: 2, data: param.charCodeAt(1) & 255 };
        }

        if (label_regexp.test(param)) {
            if (labels[param] != undefined) {
                return { mode: 2, data: labels[param] };
            } else {
                future_labels.push({ label: param, line: line, position: output.length });
                return { mode: 2, data: 0 };
            }
        }

        var calculation;
        try {
            calculation = Function('$', '"use strict";return (' + param + ')')(output.length);
        } catch (error) {}
        if (calculation != undefined) {
            return { mode: 2, data: Math.floor(calculation) & 255 };
        }
    } else {
        var calculation;
        try {
            calculation = Function('$', '"use strict";return (' + param + ')')(output.length);
        } catch (error) {}
        if (calculation != undefined) {
            return { mode: 0, data: Math.floor(calculation) & 255 };
        }
    }
    alert('Error on line: ' + line);
}

function assembler(data) {
    output = [];
    labels = {};
    future_labels = [];
    var binary_lines = [];
    var lines = data.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].replace(/;.*/, '').trim();
        if (line != '') {
            var parts = line.split(',');
            var opcode = parts[0].substring(0, parts[0].indexOf(' '));
            parts[0] = parts[0].substring(parts[0].indexOf(' '));
            if (opcode == '') {
                opcode = parts[0];
                parts = [];
            } else {
                for (var j = 0; j < parts.length; j++) {
                    parts[j] = parts[j].trim();
                }
            }

            if (opcode.substring(opcode.length - 1) == ':') {
                var label = opcode.substring(0, opcode.length - 1);
                if (label_regexp.test(label)) {
                    labels[label] = output.length;
                    binary_lines.push(label + ': ' + format_byte(output.length));
                }
            }

            else if (opcode == 'db') {
                for (var j = 0; j < parts.length; j++) {
                    if (parts[j].substring(0, 1) == '\'' || parts[j].substring(0, 1) == '"') {
                        parts[j] = parts[j].substring(1, parts[j].length - 1);
                        for (var k = 0; k < parts[j].length; k++) {
                            output.push(parts[j].charCodeAt(k) & 255);
                        }
                    }
                    else if (!isNaN(parts[j])) {
                        output.push(parseInt(parts[j]) & 255);
                    }
                    else {
                        var calculation;
                        try {
                            calculation = Function('$', '"use strict";return (' + param + ')')(output.length);
                        } catch (error) {}
                        if (calculation != undefined) {
                            output.push(Math.floor(calculation) & 255);
                        }
                    }
                }
                binary_lines.push('[ data ]');
            }

            else {
                var instruction = [];
                opcode = opcodes[opcode.toLowerCase()] << 3;

                if (parts[0] == undefined && parts[1] == undefined) {
                    instruction[0] = opcode;
                    instruction[1] = 0;
                }

                if (parts[0] != undefined && parts[1] == undefined) {
                    var param = parse_param(parts[0], i);
                    instruction[0] = opcode | param.mode;
                    instruction[1] = param.data;
                }

                if (parts[0] != undefined && parts[1] != undefined) {
                    var register = registers_names[parts[0].toLowerCase()] << 2;
                    var param = parse_param(parts[1], i);
                    instruction[0] = opcode | register | param.mode;
                    instruction[1] = param.data;
                }

                output.push(instruction[0], instruction[1]);

                binary_lines.push(
                    pad_string((instruction[0] >> 3).toString(2), 5, '0') + ' ' +
                    ((instruction[0] >> 2) & 1).toString(2) + ' ' +
                    pad_string((instruction[0] & 3).toString(2), 2, '0') + '  ' +
                    pad_string(instruction[1].toString(2), 8, '0') + ' | ' +
                    format_byte(instruction[0]) + ' ' + format_byte(instruction[1])
                );
            }
        } else {
            binary_lines.push('');
        }
    }

    for (var i = 0; i < future_labels.length; i++) {
        var pos = future_labels[i].position;
        output[pos + 1] = labels[future_labels[i].label];
        binary_lines[future_labels[i].line] =
            pad_string((output[pos] >> 3).toString(2), 5, '0') + ' ' +
            ((output[pos] >> 2) & 1).toString(2) + ' ' +
            pad_string((output[pos] & 3).toString(2), 2, '0') + '  ' +
            pad_string(output[pos + 1].toString(2), 8, '0') + ' | ' +
            format_byte(output[pos]) + ' ' + format_byte(output[pos + 1]);
    }

    binary_label.value = '';
    for (var i = 0; i < binary_lines.length; i++) {
        binary_label.value += binary_lines[i];
        if (i != binary_lines.length - 1) binary_label.value += '\n';
    }
    binary_label.scrollTop = assembly_input.scrollTop;

    return output;
}

var mem = new Uint8ClampedArray(256), zero_memory,
    halted, step, instruction_byte, data_byte,
    instruction_pointer, registers = new Uint8Array(2),
    carry_flag, zero_flag, timeout, just_run = false,
    clock_freq = parseInt(clock_freq_input.value);

function update_labels() {
    halted_label.textContent = format_boolean(halted);
    step_label.textContent = step;
    instruction_byte_label.textContent = format_byte(instruction_byte);
    data_byte_label.textContent = format_byte(data_byte);
    instruction_pointer_label.textContent = format_byte(instruction_pointer);
    register_a_label.textContent = format_byte(registers[0]);
    register_b_label.textContent = format_byte(registers[1]);
    carry_flag_label.textContent = format_boolean(carry_flag);
    zero_flag_label.textContent = format_boolean(zero_flag);

    memory_label.value = '';
    var count = 0;
    for (var i = 0; i < 256; i++) {
        memory_label.value += format_byte(mem[i]) + ' ';
        if (count == 7 && i != 255) {
            memory_label.value += '\n';
            count = 0;
        } else {
            count++;
        }
    }
}

function reset () {
    halted = false;
    instruction_pointer = 0;
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

    update_labels();
}

function clock_cycle () {
    if (halted) return;

    if (instruction_pointer >= 255) {
        instruction_pointer -= 255;
    }

    if (step == 0) {
        step++;
        instruction_byte = mem[instruction_pointer];
        instruction_pointer++;
    }

    else if (step == 1) {
        step++;
        data_byte = mem[instruction_pointer];
        instruction_pointer++;
    }

    else if (step == 2) {
        step = 0;

        var opcode = instruction_byte >> 3;
        var register = (instruction_byte >> 2) & 1;
        var mode = instruction_byte & 3;

        var data;
        if (mode == 0) data = data_byte;
        if (mode == 1) data = registers[data_byte];
        if (mode == 2) data = mem[data_byte];
        if (mode == 3) data = mem[registers[data_byte]];

        if (opcode == opcodes.load) {
            registers[register] = data;
        }

        if (opcode == opcodes.store) {
            if (mode == 2) {
                mem[data_byte] = registers[register];
                if (data_byte == 0xff) {
                    output_label.value += String.fromCharCode(registers[register]);
                }
            }
            if (mode == 3) {
                mem[registers[data_byte]] = registers[register];
                if (registers[data_byte] == 0xff) {
                    output_label.value += String.fromCharCode(registers[register]);
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
            instruction_pointer = data;
        }
        if (opcode == opcodes.jc && carry_flag) {
            instruction_pointer = data;
        }
        if (opcode == opcodes.jnc && !carry_flag) {
            instruction_pointer = data;
        }
        if (opcode == opcodes.jz && zero_flag) {
            instruction_pointer = data;
        }
        if (opcode == opcodes.jnz && !zero_flag) {
            instruction_pointer = data;
        }
        if (opcode == opcodes.ja && !carry_flag && !zero_flag) {
            instruction_pointer = data;
        }
        if (opcode == opcodes.jna && carry_flag && zero_flag) {
            instruction_pointer = data;
        }

        if (opcode == opcodes.halt) {
            halted = true;
        }
    }

    if (!just_run) update_labels();

    if (auto_clock_input.checked) {
        timeout = setTimeout(clock_cycle, 1000 / clock_freq);
    }
}

assembly_input.onkeydown = function (event) {
    if (event.keyCode === 9) {
        var start = this.selectionStart;
        var end = this.selectionEnd;
        var target = event.target;
        var value = target.value;
        target.value = value.substring(0, start) + '    ' + value.substring(end);
        this.selectionStart = this.selectionEnd = start + 4;
        event.preventDefault();
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
}

assemble_button.onclick = reset_and_assemble;

function run_program() {
    if (!zero_memory) {
        just_run = true;
        while (!halted) {
            clock_cycle();
        }
        update_labels();
        just_run = false;
    }
}

run_button.onclick = run_program;

assemble_and_run_button.onclick = function () {
    reset_and_assemble();
    run_program();
};

reset_button.onclick = reset;

clock_button.onclick = function () {
    clock_cycle();
};

clock_freq_input.onchange = function () {
    clock_freq = parseInt(clock_freq_input.value);
};

auto_clock_input.onchange = function () {
    clock_cycle();
};

reset();

var examples = [
`    ; A simple Hello World example
    load a, message
    load b, $ + 6
    store b, [return_address]
    jmp print_string

    load a, message
    load b, $ + 6
    store b, [return_address]
    jmp print_string

    halt

print_string:
    load b, [a]
    cmp b, 0
    je [return_address]
    store b, [0xff]
    add a, 1
    jmp print_string

message:
    db 'Hello World!', 10, 0
return_address:
    db 0
`,
`    ; A simple counter program
    load a, 0
print_loop:
    add a, 1
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
`
];

if (localStorage.assembly != undefined) {
    assembly_input.value = localStorage.assembly;
} else {
    assembly_input.value = examples[0];
}

load_button.onclick = function () {
    reset();
    assembly_input.value = examples[example_input.value];
    localStorage.assembly = assembly_input.value;
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
};

document.onkeydown = function (event) {
    if (event.keyCode == 83 && (navigator.platform.match('Mac') ? event.metaKey : event.ctrlKey)) {
        event.preventDefault();
    }
};
