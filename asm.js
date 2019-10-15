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

var output = [];

function parse_param(param) {
    if (!isNaN(param)) {
        return { mode: 0, data: parseInt(param) };
    }
    if (param.substring(0, 1) == '\'') {
        return { mode: 0, data: param.charCodeAt(1) };
    }
    if (registers_names[param.toLowerCase()] != undefined) {
        return { mode: 1, data: registers_names[param.toLowerCase()] };
    }
    if (param.substring(0, 1) == '[') {
        param = param.substring(1, param.length - 1);
        if (!isNaN(param)) {
            return { mode: 2, data: parseInt(param) };
        }
        if (param.substring(0, 1) == '\'') {
            return { mode: 2, data: param.charCodeAt(1) };
        }
        if (registers_names[param.toLowerCase()] != undefined) {
            return { mode: 3, data: registers_names[param.toLowerCase()] };
        }
    }
}

var lines = data.split('\n');
for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].replace(/;.*/, '').trim().split(/\s+/);
    if (parts[0] != '') {
        var instruction = [];

        var opcode = opcodes[parts[0].toLowerCase()] << 3;

        if (parts[1] == undefined && parts[2] == undefined) {
            instruction[0] = opcode;
            instruction[1] = 0;
        }

        if (parts[1] != undefined && parts[2] == undefined) {
            var param = parse_param(parts[1]);
            instruction[0] = opcode | param.mode;
            instruction[1] = param.data;
        }

        if (parts[1] != undefined && parts[2] != undefined) {
            var register = registers_names[parts[1].substring(0, parts[1].length - 1).toLowerCase()] << 2;
            var param = parse_param(parts[2]);
            instruction[0] = opcode | register | param.mode;
            instruction[1] = param.data;
        }

        output.push(instruction[0], instruction[1]);

        console.log('-> ' + parts.join(' ').toLowerCase());
        console.log('<- ' +
            (instruction[0] >> 3).toString(2).padStart(5, '0') + ' ' +
            ((instruction[0] >> 2) & 1).toString(2).padStart(1, '0') + ' ' +
            (instruction[0] & 3).toString(2).padStart(2, '0') + '  ' +
            instruction[1].toString(2).padStart(8, '0') + '\n'
        );
    }
}

var dump = 'v2.0 raw\n';
for (var i = 0; i < output.length; i++) {
    dump += (output[i] < 16 ? '0' + output[i].toString(16) : output[i].toString(16)) + '\n';
}
fs.writeFileSync(process.argv[2].split('.').slice(0, -1).join('.') + '.bin', dump);
