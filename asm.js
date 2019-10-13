// A simple assembler for the neva 8-bit processor
// Use: node asm.js test.asm

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

var registers = { 'a': 0, 'b': 1 };

var fs = require('fs');

var data = fs.readFileSync(process.argv[2]).toString();

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
            else if (registers[parts[1].toLowerCase()] != undefined) {
                instruction.push(opcode | 1);
                instruction.push(registers[parts[1].toLowerCase()]);
            }
            else if (parts[1].startsWith("[")) {
                var addr = parts[1].substring(1, parts[1].length - 1);
                if (registers[addr.toLowerCase()] == undefined) {
                    instruction.push(opcode | 2);
                    instruction.push(parseInt(addr));
                } else {
                    instruction.push(opcode | 3);
                    instruction.push(registers[addr.toLowerCase()]);
                }
            }
        }

        if (parts[1] != undefined && parts[2] != undefined) {
            var register = registers[parts[1].substring(0, parts[1].length - 1).toLowerCase()] << 2;

            if (!isNaN(parts[2])) {
                instruction.push(opcode | register);
                instruction.push(parseInt(parts[2]));
            }
            else if (registers[parts[2].toLowerCase()] != undefined) {
                instruction.push(opcode | register | 1);
                instruction.push(registers[parts[2].toLowerCase()]);
            }
            else if (parts[2].startsWith("[")) {
                var addr = parts[2].substring(1, parts[2].length - 1);
                if (registers[addr.toLowerCase()] == undefined) {
                    instruction.push(opcode | register | 2);
                    instruction.push(parseInt(addr));
                } else {
                    instruction.push(opcode | register | 3);
                    instruction.push(registers[addr.toLowerCase()]);
                }
            }
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
