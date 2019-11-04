    ; Return number test program
    push 3
    push 2
    push 1
    call abc
    halt

abc:
    mov b, 3
    ret b
