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

function assembler(data) {
    var output = [];
    var lines = data.split('\n');

    binary_label.value = '';

    for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].replace(/;.*/, '').trim().split(/\s+/);
        if (parts[0] != '') {
            var instruction = [];

            var opcode = opcodes[parts[0].toLowerCase()] << 3;

            if (parts[1] == undefined && parts[2] == undefined) {
                instruction.push(opcode);
                instruction.push(0);
            }

            if (parts[1] != undefined && parts[2] == undefined) {
                if (!isNaN(parts[1])) {
                    instruction.push(opcode);
                    instruction.push(parseInt(parts[1]));
                }
                else if (registers_names[parts[1].toLowerCase()] != undefined) {
                    instruction.push(opcode | 1);
                    instruction.push(registers_names[parts[1].toLowerCase()]);
                }
                else if (parts[1].startsWith("[")) {
                    var addr = parts[1].substring(1, parts[1].length - 1);
                    if (registers_names[addr.toLowerCase()] == undefined) {
                        instruction.push(opcode | 2);
                        instruction.push(parseInt(addr));
                    } else {
                        instruction.push(opcode | 3);
                        instruction.push(registers_names[addr.toLowerCase()]);
                    }
                }
            }

            if (parts[1] != undefined && parts[2] != undefined) {
                var register = registers_names[parts[1].substring(0, parts[1].length - 1).toLowerCase()] << 2;

                if (!isNaN(parts[2])) {
                    instruction.push(opcode | register);
                    instruction.push(parseInt(parts[2]));
                }
                else if (registers_names[parts[2].toLowerCase()] != undefined) {
                    instruction.push(opcode | register | 1);
                    instruction.push(registers_names[parts[2].toLowerCase()]);
                }
                else if (parts[2].startsWith("[")) {
                    var addr = parts[2].substring(1, parts[2].length - 1);
                    if (registers_names[addr.toLowerCase()] == undefined) {
                        instruction.push(opcode | register | 2);
                        instruction.push(parseInt(addr));
                    } else {
                        instruction.push(opcode | register | 3);
                        instruction.push(registers_names[addr.toLowerCase()]);
                    }
                }
            }
            output.push(instruction[0], instruction[1]);

            binary_label.value += pad_string((instruction[0] >> 3).toString(2), 5, '0') + ' ' +
                ((instruction[0] >> 2) & 1).toString(2) + ' ' +
                pad_string((instruction[0] & 3).toString(2), 2, '0') + '  ' +
                pad_string(instruction[1].toString(2), 8, '0');
        }
        binary_label.value += '\n';
    }
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

if (localStorage.assembly != undefined) {
    assembly_input.value = localStorage.assembly;
}

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
