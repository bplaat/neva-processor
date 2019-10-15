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
