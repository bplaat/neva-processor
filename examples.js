var examples = [

`    ; A simple Hello World example
    mov a, message
    mov b, 0
loop:
    call print_string
    inc b
    cmp b, 5
    je loop_done
    jmp loop
loop_done:
    halt

print_string:
    push a
    push b
print_string_loop:
    mov b, [a]
    cmp b, 0
    je print_string_done
    mov [0xff], b
    inc a
    jmp print_string_loop
print_string_done:
    pop b
    pop a
    ret

message: db 'Hello World!', 10, 0
`,

`    ; A simple counter program
    load a, 0
print_loop:
    inc a
    load b, a
    add b, '0'
    store b, [0xff]
    cmp a, 9
    jne print_loop

    load a, 2 * 5
    store a, [0x80 + 0x80 - 1]

    load a, 0xff
    LOAD b, 'H'
    store b, [A]
    LOAD b, 'A'
    store b, [A]
    LOAD b, 'L'
    store b, [A]
    store b, [A]
    LOAD b, 'O'
    store b, [A]
    LOAD b, '!'
    store b, [A]
    halt
`,

`    ; A cool graphics example
    mov a, 0
draw:
    mov b, [x]
    mov [0xfb], b
    add b, [y]
    mov [x], b

    mov b, [y]
    mov [0xfc], b
    sub b, [x]
    mov [y], b

    mov b, 3
    mov [0xfd], b

    mov b, 1
    mov [0xfd], b

    cmp a, 6
    je draw_done
    inc a
    jmp draw
draw_done:
    halt

x: db 50
y: db 50
`,

`    ; Recursive fibonacci number example
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

    cmp b, 13
    bbe loop
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
`,

`    ; Simple keyboard interrupt example
    ; Don't run this program direct but at 1 kHz!!!

keyboard_loop:
    mov a, [0xfe]
    cmp a, 0
    be keyboard_loop

    mov [0xff], a
    bra keyboard_loop
`

];
