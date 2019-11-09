    ; Simple keyboard interrupt example
    ; Run is program at 1kHz and not direct!

keyboard_loop:
    mov a, [0xfe]
    cmp a, 0
    be keyboard_loop

    mov [0xff], a
    bra keyboard_loop
