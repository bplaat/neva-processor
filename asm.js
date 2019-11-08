// A simple assembler for the Neva 8-bit Processor
// You need Node.js (https://nodejs.org/) to run this program
// Use: node asm.js test.asm

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

    push: 21, pop: 22, call: 23, bcall: 23, ret: 24, bret: 24,

    halt: 31
};

var registers_names = { a: 0, b: 1, ip: 2, sp: 3 };

var fs = require('fs');
var data = fs.readFileSync(process.argv[2]).toString();

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
        future_labels.push({ label: param, line: line, position: output.length });
        return { mode: 0, data: 0 };
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
            future_labels.push({ label: param, line: line, position: output.length });
            return { mode: 2, data: 0 };
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
    console.log('Error on line: ' + line);
}

output = [];
labels = {};
future_labels = [];

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

        if (opcode_text.substring(opcode_text.length - 1) == ':') {
            var label = opcode_text.substring(0, opcode_text.length - 1);
            if (label_regexp.test(label)) {
                labels[label] = { line: i, value: output.length };
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
                continue;
            }
        }

        if (parts[0] != undefined && parts[0].substring(0, parts[0].indexOf(' ')) == 'equ') {
            var data = parse_param(parts[0].substring(parts[0].indexOf(' ')).trim(), i).data;
            labels[opcode_text] = { line: i, value: data };
        }

        else if (opcode_text == 'db') {
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
                    var calculation = calculate(parts[j]);
                    if (calculation != undefined) {
                        output.push(calculation);
                    }
                }
            }
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
                } else if (opcode_text.charAt(0) == 'b') {
                    var param = parse_param(parts[0], i);
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
                } else {
                    var register = registers_names[parts[0].toLowerCase()] << 2;
                    var param = parse_param(parts[1], i);
                    instruction[0] = opcode | register | param.mode;
                    instruction[1] = param.data;
                }
            }

            output.push(instruction[0], instruction[1]);
        }
    }
}

for (var i = 0; i < future_labels.length; i++) {
    var position = future_labels[i].position;
    var opcode = output[position] >> 3;
    if (
        ((opcode >= opcodes.bra && opcode <= opcodes.bna) || opcode == opcodes.bcall) &&
        ((output[position] >> 2) & 1) == 1 &&
        (output[position] & 3) == 0
    ) {
        output[position + 1] = (labels[future_labels[i].label].value - (position + 2)) & 255;
    } else {
        output[position + 1] = labels[future_labels[i].label].value;
    }
}

var dump = 'v2.0 raw\n';
for (var i = 0; i < output.length; i++) {
    dump += (output[i] < 16 ? '0' + output[i].toString(16) : output[i].toString(16)) + '\n';
}
fs.writeFileSync(process.argv[2].split('.').slice(0, -1).join('.') + '.bin', dump);
