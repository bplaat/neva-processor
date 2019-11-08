    ; Recursive fibonacci number example
    mov b, 0
loop:
    push b
    call print_hex

    mov a, '='
    mov [0xff], a

    push b
    bcall fib

    push a
    call print_hex

    mov a, 10
    mov [0xff], a

    inc b

    cmp b, 13 + 1
    bne loop
    halt

fib:
    push b

    mov a, [sp + 3]
    cmp a, 2
    bb fib_done

    mov b, a
    push b - 1
    bcall fib

    push b - 2
    mov b, a
    bcall fib

    add a, b
fib_done:
    pop b
    ret 1

print_single_hex:
    mov a, [sp + 2]
    cmp a, 9
    ba print_single_hex_alpha

    add a, '0'
    bra print_single_hex_skip

print_single_hex_alpha:
    sub a, 10
    add a, 'a'

print_single_hex_skip:
    mov [0xff], a
    ret 1

print_hex:
    mov a, [sp + 2]
    shr a, 4
    push a
    bcall print_single_hex

    mov a, [sp + 2]
    and a, 0xf
    push a
    bcall print_single_hex

    ret 1
