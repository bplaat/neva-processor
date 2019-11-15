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

`    ; Simple keyboard example
    ; Don't run this program direct but at 1 kHz!!!

keyboard_loop:
    mov a, [0xfe]
    cmp a, 0
    be keyboard_loop

    mov [0xff], a
    bra keyboard_loop
`,

`    ; Simple memory banking example

    push 3
    push 4
    push $$
    mov a, 8
    bankcall a, add

    add a, '0'
    mov [0xff], a

    mov a, 2
    bankjmp a, halt_program

%bank 8

add:
    mov a, [sp + 3]
    add a, [sp + 4]
    mov b, [sp + 2]
    bankret b, 2 + 1

%bank 2

halt_program:
    halt
`,

`    ; A simple Pong like game
    ; Made by Bastiaan van der Plaat
    ; Don't run this program direct but at 32 kHz!!!

    ; # Controls
    ; DONT HOLD THE BUTTONS BUT PRESS IT REPEATEDLY!!!
    ; Left player: 'w' move paddle up, 's' move paddle down
    ; Right player: 'o' move paddle up, 'l' move paddle down

    ; # Banks
    ; 0 = main loop, data, stack
    ; 1 = input code
    ; 2 = update code, string utils
    ; 3 = draw code

game_loop:
    mov a, 1
    bankcall a, input

    mov a, 2
    bankcall a, update

    mov a, 3
    bankcall a, draw

    jmp game_loop

player1_y: db (255 - 100) / 2
player2_y: db (255 - 100) / 2

ball_x: db (255 - 10) / 2
ball_y: db (255 - 10) / 2
ball_vx: db 2
ball_vy: db 1

player1_score: db 0
player2_score: db 0

score_string: db 'Score: ', 0
score_seperator_string: db ' - ', 0
gameover_string: db 10, 'GAME OVER!', 10, 0
player1_wins_string: db 'The left player wins!', 10, 0
player2_wins_string: db 'The right player wins!', 10, 0

; #######################################
%bank 1

input:
    mov a, [0xfe]
    cmp a, 0
    je input_done
    cmp a, 'w'
    je player1_move_up
    cmp a, 's'
    je player1_move_down
    cmp a, 'o'
    je player2_move_up
    cmp a, 'l'
    je player2_move_down
    jmp input
input_done:
    mov a, 0
    bankret a

player1_move_up:
    mov a, [player1_y]
    cmp a, 15
    jb input
    sub a, 15
    mov [player1_y], a
    jmp input

player1_move_down:
    mov a, [player1_y]
    cmp a, 255 - 100 - 15
    ja input
    add a, 15
    mov [player1_y], a
    jmp input

player2_move_up:
    mov a, [player2_y]
    cmp a, 15
    jb input
    sub a, 15
    mov [player2_y], a
    jmp input

player2_move_down:
    mov a, [player2_y]
    cmp a, 255 - 100 - 15
    ja input
    add a, 15
    mov [player2_y], a
    jmp input

; #######################################
%bank 2

update:
    mov a, [ball_x]
    cmp a, 15 + 4
    jbe player1_check
    cmp a, 255 - 15 - 10 - 4
    jae player2_check

player_check_continue:
    mov a, [ball_x]
    cmp a, 2
    jb player2_scored
    cmp a, 255 - 10 - 2
    ja player1_scored

ball_vx_continue:
    mov a, [ball_y]
    cmp a, 2
    jb invert_ball_vy
    cmp a, 255 - 10 - 2
    ja invert_ball_vy

ball_vy_continue:
    mov a, [ball_x]
    add a, [ball_vx]
    mov [ball_x], a

    mov a, [ball_y]
    add a, [ball_vy]
    mov [ball_y], a

    mov a, 0
    bankret a

player1_check:
    mov a, [ball_y]
    cmp a, [player1_y]
    jb player_check_continue

    mov a, [ball_y]
    add a, 10
    mov b, [player1_y]
    add b, 100
    cmp a, b
    ja player_check_continue

    jmp invert_ball_vx

player2_check:
    mov a, [ball_y]
    cmp a, [player2_y]
    jb player_check_continue

    mov a, [ball_y]
    add a, 10
    mov b, [player2_y]
    add b, 100
    cmp a, b
    ja player_check_continue

    jmp invert_ball_vx

player1_scored:
    mov a, [player1_score]
    inc a
    mov [player1_score], a
    call print_score
    mov a, [player1_score]
    cmp a, 9
    je player1_wins
    jmp invert_ball_vx

player2_scored:
    mov a, [player2_score]
    inc a
    mov [player2_score], a
    call print_score
    mov a, [player2_score]
    cmp a, 9
    je player2_wins
    jmp invert_ball_vx

invert_ball_vx:
    mov b, 0
    sub b, [ball_vx]
    mov [ball_vx], b
    jmp ball_vx_continue

invert_ball_vy:
    mov b, 0
    sub b, [ball_vy]
    mov [ball_vy], b
    jmp ball_vy_continue

print_score:
    push score_string
    call print_string

    mov a, [player1_score]
    add a, '0'
    mov [0xff], a

    push score_seperator_string
    call print_string

    mov a, [player2_score]
    add a, '0'
    mov [0xff], a

    mov a, 10
    mov [0xff], a
    ret

player1_wins:
    push gameover_string
    call print_string
    call print_score
    push player1_wins_string
    call print_string
    halt

player2_wins:
    push gameover_string
    call print_string
    call print_score
    push player2_wins_string
    call print_string
    halt

print_string:
    mov a, [sp + 2]
print_string_loop:
    mov b, [a]
    cmp b, 0
    je print_string_done
    mov [0xff], b
    inc a
    jmp print_string_loop
print_string_done:
    ret 1

; #######################################
%bank 3

draw:
    mov a, 0
    mov [0xfd], a

    call draw_middle_lines

    push 100
    push 15
    mov a, [player1_y]
    push a
    push 0
    call draw_rect

    push 100
    push 15
    mov a, [player2_y]
    push a
    push 255 - 15
    call draw_rect

    push 10
    push 10
    mov a, [ball_y]
    push a
    mov a, [ball_x]
    push a
    call draw_rect

    mov a, 1
    mov [0xfd], a

    mov a, 0
    bankret a

draw_middle_lines:
    mov a, 127
    mov [0xfb], a
    mov a, 0
    mov [0xfc], a

draw_middle_lines_parts:
    mov a, [0xfc]
    add a, 10
    mov [0xfc], a
    mov a, 2
    mov [0xfd], a

    mov a, [0xfc]
    add a, 10
    mov [0xfc], a
    mov a, 3
    mov [0xfd], a

    mov a, [0xfc]
    cmp a, 255 - 15
    jb draw_middle_lines_parts
    ret

draw_rect:
    mov a, [sp + 2]
    mov [0xfb], a
    mov a, [sp + 3]
    mov [0xfc], a
    mov a, 2
    mov [0xfd], a

    mov a, [sp + 2]
    add a, [sp + 4]
    mov [0xfb], a
    mov a, 3
    mov [0xfd], a

    mov a, [sp + 3]
    add a, [sp + 5]
    mov [0xfc], a
    mov a, 3
    mov [0xfd], a

    mov a, [sp + 2]
    mov [0xfb], a
    mov a, 3
    mov [0xfd], a

    mov a, [sp + 3]
    mov [0xfc], a
    mov a, 3
    mov [0xfd], a

    ret 4

`,

`    ; A simple Snake like game
    ; Made by Bastiaan van der Plaat
    ; Don't run this program direct but at 32 kHz!!!

    ; # Controls
    ; DONT HOLD THE BUTTONS BUT PRESS IT REPEATEDLY!!!
    ; Player: 'w' move up, 'a' move left, 'd' move right, 's' move down

    ; # Banks
    ; 0 = main loop, data, stack
    ; 1 = input code
    ; 2 = update code, string utils
    ; 3 = draw code

MAIN_BANK equ 0
INPUT_BANK equ 1
UPDATE_BANK equ 2
DRAW_BANK equ 3

MOVE_UP equ 0
MOVE_LEFT equ 1
MOVE_RIGHT equ 2
MOVE_DOWN equ 3

PLAYER_SIZE equ 10
PLAYER_SPEED equ 1

POINT_SIZE equ 5

game_loop:
    mov a, INPUT_BANK
    bankcall a, input

    mov a, UPDATE_BANK
    bankcall a, update

    mov a, DRAW_BANK
    bankcall a, draw

    mov a, [frame_counter]
    inc a
    mov [frame_counter], a
    jmp game_loop

frame_counter: db 0

player_x: db (255 - 10) / 2
player_y: db (255 - 10) / 2
player_direction: db MOVE_DOWN
player_score: db 0

point_x: db 50
point_y: db 50

score_string: db 'Score: ', 0

%bank INPUT_BANK

input:
    mov a, [0xfe]
    cmp a, 0
    je input_done
    cmp a, 'w'
    je input_move_up
    cmp a, 'a'
    je input_move_left
    cmp a, 'd'
    je input_move_right
    cmp a, 's'
    je input_move_down
    jmp input
input_done:
    mov a, MAIN_BANK
    bankret a

input_move_up:
    mov a, MOVE_UP
    mov [player_direction], a
    jmp input

input_move_left:
    mov a, MOVE_LEFT
    mov [player_direction], a
    jmp input

input_move_right:
    mov a, MOVE_RIGHT
    mov [player_direction], a
    jmp input

input_move_down:
    mov a, MOVE_DOWN
    mov [player_direction], a
    jmp input

%bank UPDATE_BANK

update:
    mov a, [player_direction]
    cmp a, MOVE_UP
    je player_move_up
    cmp a, MOVE_LEFT
    je player_move_left
    cmp a, MOVE_RIGHT
    je player_move_right
    cmp a, MOVE_DOWN
    je player_move_bottom
player_move_done:

;  rect1.x < rect2.x + rect2.width &&
;    rect1.x + rect1.width > rect2.x &&
;    rect1.y < rect2.y + rect2.height &&
;    rect1.y + rect1.height > rect2.y

    mov a, [player_x]
    mov b, [point_x]
    add b, POINT_SIZE
    cmp a, b
    jnb player_check_done

    mov a, [player_x]
    add a, PLAYER_SIZE
    mov b, [point_x]
    cmp a, b
    jna player_check_done

    mov a, [player_y]
    mov b, [point_y]
    add b, POINT_SIZE
    cmp a, b
    jnb player_check_done

    mov a, [player_y]
    add a, PLAYER_SIZE
    mov b, [point_y]
    cmp a, b
    jna player_check_done

    push score_string
    call print_string

    mov a, [player_score]
    inc a
    mov [player_score], a

    push a
    call print_hex

    mov a, 10
    mov [0xff], a

    mov a, [frame_counter]
    not a, a
    mov [point_x], a
    mov a, [frame_counter]
    shl a, 3
    mov [point_y], a

player_check_done:
    mov a, MAIN_BANK
    bankret a

player_move_up:
    mov a, [player_y]
    sub a, PLAYER_SPEED
    mov [player_y], a
    cmp a, 0
    jne player_move_done
    mov a, 255 - 10
    mov [player_y], a
    jmp player_move_done

player_move_left:
    mov a, [player_x]
    sub a, PLAYER_SPEED
    mov [player_x], a
    cmp a, 0
    jne player_move_done
    mov a, 255 - 10
    mov [player_x], a
    jmp player_move_done

player_move_right:
    mov a, [player_x]
    add a, PLAYER_SPEED
    mov [player_x], a
    mov a, [player_x]
    cmp a, 255 - 10
    jne player_move_done
    mov a, 0
    mov [player_x], a
    jmp player_move_done

player_move_bottom:
    mov a, [player_y]
    add a, PLAYER_SPEED
    mov [player_y], a
    mov a, [player_y]
    cmp a, 255 - 10
    jne player_move_done
    mov a, 0
    mov [player_y], a
    jmp player_move_done

print_string:
    mov a, [sp + 2]
print_string_loop:
    mov b, [a]
    cmp b, 0
    je print_string_done
    mov [0xff], b
    inc a
    jmp print_string_loop
print_string_done:
    ret 1

print_single_hex:
    mov a, [sp + 2]
    cmp a, 9
    ja print_single_hex_alpha

    add a, '0'
    jmp print_single_hex_skip

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
    call print_single_hex

    mov a, [sp + 2]
    and a, 0xf
    push a
    call print_single_hex

    ret 1

%bank DRAW_BANK

draw:
    mov a, 0
    mov [0xfd], a

    push POINT_SIZE
    push POINT_SIZE
    mov a, [point_y]
    push a
    mov a, [point_x]
    push a
    call draw_rect

    push PLAYER_SIZE
    push PLAYER_SIZE
    mov a, [player_y]
    push a
    mov a, [player_x]
    push a
    call draw_rect

    mov a, 1
    mov [0xfd], a

    mov a, MAIN_BANK
    bankret a

draw_rect:
    mov a, [sp + 2]
    mov [0xfb], a
    mov a, [sp + 3]
    mov [0xfc], a
    mov a, 2
    mov [0xfd], a

    mov a, [sp + 2]
    add a, [sp + 4]
    mov [0xfb], a
    mov a, 3
    mov [0xfd], a

    mov a, [sp + 3]
    add a, [sp + 5]
    mov [0xfc], a
    mov a, 3
    mov [0xfd], a

    mov a, [sp + 2]
    mov [0xfb], a
    mov a, 3
    mov [0xfd], a

    mov a, [sp + 3]
    mov [0xfc], a
    mov a, 3
    mov [0xfd], a

    ret 4

`

];
