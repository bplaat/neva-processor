    ; A simple test program
    jmp print_hello

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

print_hello:
    load a, 0xff
    LOAD b, 'H'
    store b, [a]
    LOAD b, 'A'
    store b, [a]
    LOAD b, 'L'
    store b, [a]
    store b, [a]
    LOAD b, 'O'
    store b, [a]
    LOAD b, '!'
    store b, [a]
    halt
