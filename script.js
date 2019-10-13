var opcodes = {
    'nop': 0,

    'load': 1,
    'store': 2,

    'add': 3,
    'adc': 4,
    'sub': 5,
    'sbb': 6,
    'cmp': 7,

    'and': 8,
    'or': 9,
    'xor': 10,
    'not': 11,
    'shl': 12,
    'shr': 13,

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

function assembler(data) {
    var output = [];
    var lines = data.split('\n');
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
        }
    }
    return output;
}


var clock_freq = parseInt(clock_freq_input.value);


var mem = new Uint8ClampedArray(256);

mem[0x0fe] = opcodes.halt << 3;

var stop_running, instruction_pointer, step, instruction_byte,
    data_byte, registers = new Uint8ClampedArray(2), carry_flag, zero_flag;

function reset () {
    stop_running = false;
    instruction_pointer = 0;
    step = 0;
    instruction_byte = 0;
    data_byte = 0;
    registers[registers_names.a] = 0;
    registers[registers_names.b] = 0;
    carry_flag = false;
    zero_flag = false;

    auto_clock_input.checked = false;
    binary_input.value = '';
    memory_label.value = '';
    output_label.value = '';
}

function clock_cycle () {
    if (stop_running) return;
    if (instruction_pointer >= 255) instruction_pointer -= 255;

    if (step == 0) {
        step++;
        instruction_byte = mem[instruction_pointer];
        instruction_pointer++;
    }

    if (step == 1) {
        step++;
        data_byte = mem[instruction_pointer];
        instruction_pointer++;
    }

    if (step == 2) {
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
            zero_flag = registers[register] == 0;
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
            stop_running = true;
        }
    }

    if (auto_clock_input.checked) {
        setTimeout(clock_cycle, 1000 / clock_freq);
    }
}

reset();

assembler_button.onclick = function () {
    var output = assembler(assembly_input.value);

    for (var i = 0; i < output.length; i++) {
        mem[i] = output[i];
    }

    binary_input.value = '';
    for (var i = 0; i < output.length; i += 2) {
        binary_input.value += (output[i] >> 3).toString(2).padStart(5, '0') + ' ' +
            ((output[i] >> 2) & 1).toString(2).padStart(1, '0') + ' ' +
            (output[i] & 3).toString(2).padStart(2, '0') + '  ' +
            output[i + 1].toString(2).padStart(8, '0') + '\n';
    }

    memory_label.value = '';
    var q = 0;
    for (var i = 0; i < 256; i++) {
        memory_label.value += (mem[i] < 15 ? '0' + mem[i].toString(16) : mem[i].toString(16)) + ' ';
        if (q == 7) {
            memory_label.value += '\n';
            q = 0;
        } else {
            q++;
        }
    }
};

run_button.onclick = function () {
    while (!stop_running) {
        clock_cycle();
    }
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
