    load a, message

print_string:
    load b, [a]
    cmp b, 0
    je print_string_done
    store b, [0xff]
    add a, 1
    jmp print_string

print_string_done:
    halt

message:
    db "Hello Bastiaan!", 10, 0
