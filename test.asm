    ; A simple test program
    add a, 1
    load b, a
    add b, '0'
    store b, [0xff]
    cmp a, 9
    jne 0

    load a, 10
    store a, [0xff]

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
