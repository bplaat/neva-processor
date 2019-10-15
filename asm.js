// A simple assembler for the Logism Neva 8-bit processor
// You need Node.js (https://nodejs.org/) to run this program
// Use: node asm.js test.asm

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

var registers_names = { 'a': 0, 'b': 1 };

var fs = require('fs');
var data = fs.readFileSync(process.argv[2]).toString();

var label_regexp = /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    output, labels, future_labels;

function parse_param(param, line) {
    if (!isNaN(param)) {
        return { mode: 0, data: parseInt(param) & 255 };
    }

    if (registers_names[param.toLowerCase()] != undefined) {
        return { mode: 1, data: registers_names[param.toLowerCase()] };
    }

    if (param.substring(0, 1) == '\'' && param.substring(0, 1) == '"') {
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

        if (param.substring(0, 1) == '\'' && param.substring(0, 1) == '"') {
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
        try { calculation = eval(param); } catch (error) { }
        if (calculation != undefined) {
            return { mode: 2, data: Math.floor(calculation) & 255 };
        }
    } else {
        var calculation;
        try { calculation = eval(param); } catch (error) { }
        if (calculation != undefined) {
            return { mode: 0, data: Math.floor(calculation) & 255 };
        }
    }
}

output = [];
labels = {};
future_labels = [];

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
                    try { calculation = eval(parts[j]); } catch (error) {}
                    if (calculation != undefined) {
                        output.push(Math.floor(calculation) & 255);
                    }
                }
            }
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
        }
    }
}

for (var i = 0; i < future_labels.length; i++) {
    var pos = future_labels[i].position;
    output[pos + 1] = labels[future_labels[i].label];
}

var dump = 'v2.0 raw\n';
for (var i = 0; i < output.length; i++) {
    dump += (output[i] < 16 ? '0' + output[i].toString(16) : output[i].toString(16)) + '\n';
}
fs.writeFileSync(process.argv[2].split('.').slice(0, -1).join('.') + '.bin', dump);
