    ; A simple Hello World example
    load a, message
    load b, 0
loop:
    call print_string
    add b, 1
    cmp b, 5
    je loop_done
    jmp loop
loop_done:
    halt

print_string:
    push a
    push b
print_string_loop:
    load b, [a]
    cmp b, 0
    je print_string_done
    store b, [0xff]
    add a, 1
    jmp print_string_loop
print_string_done:
    pop b
    pop a
    ret

message:
    db 'Hello World!', 10, 0
