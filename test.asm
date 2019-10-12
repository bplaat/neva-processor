    ; A simple test program
    add a, 1
    load b, a
    add b, 0x30
    store b, [0xff]
    cmp a, 9
    jne 0

    load a, 10
    store a, [0xff]

    load a, 0xff
    LOAD b, 0x28
    add b, 0x20
    store b, [a]
    LOAD b, 0x41
    store b, [a]
    LOAD b, 0x2c
    add b, 0x20
    store b, [a]
    store b, [a]
    LOAD b, 0x4f
    store b, [a]
    halt
