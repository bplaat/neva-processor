    ; Recursive fibonacci number example
    push 13
    call fib
    halt

fib:
    push b

    mov a, [sp + 3]
    cmp a, 2
    jb fib_done

    mov b, a
    push b - 1
    call fib

    push b - 2
    mov b, a
    call fib

    add a, b
fib_done:
    pop b
    ret 1
