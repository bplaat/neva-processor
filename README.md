# The Neva 8-bit Processor
The Neva 8-bit Processor is a simple, educational 8-bit processor design with dedicated assembler. I've made this processor for school and this repo contains all the work off that project. That includes the processor design, assembler and a complete online simulation environment so you can create programs quickly and run them immediately.

## The Processor Design
The file `design.circ` is a [Logism](http://www.cburch.com/logisim/) circuit which contains the complete processor:

![Logisim Design](design.png)

## Inspiration
There where is some sites and articles that inspired my to build this project:
- https://en.wikipedia.org/wiki/MOS_Technology_6502
- https://en.wikichip.org/wiki/intel/mcs-8/isa
- https://en.wikipedia.org/wiki/X86_instruction_listings
- https://schweigi.github.io/assembler-simulator/

## Instruction encoding
The instruction encoding is very simple because each instruction is two bytes long and these two bytes are then subdivided into different sections which mean different things.

There are two different instruction encodings for the processor the first is the immediate data encoding and the second is the register encoding:

### Data encoding:
The first two bits of the first byte are the mode selector (more information about that below), the second bit is the destination register selector and the last five bits are the instruction opcode, the other byte contains an immediate data.
```
  5     1   2   |  8
opcode reg mode | imm
```

### Register encoding:
The other encoding is almost the same the only difference is that the immediate data byte is changed to one source register selector and a 6-bit signed displacement.
```
  5     1   2   |  2   6
opcode reg mode | reg dis
```

## Registers
The processor has two 8-bit registers: A and B, there is also a instruction and stack pointer but those are only readable. You use 0 for the A register, 1 for the B register, 2 for the instruction pointer and 3 for the stack pointer. There are also two flag d flip-flops those are set by some instructions and are used for the conditional jump and branch instructions.
```
0 = A = 0
1 = B = 0

-- Not writable and storable
2 = ip = instruction pointer = 0
3 = sp = stack pointer = 0xfd or 0xfa

carry flag = 0
zero flag = 0
```

## Modes
Like I sad each instruction has two bits that select a mode which the instruction is run in. This mode chooses what the source data is for the instruction. There are four different modes:
- The first is that the next immediate byte is used as the data.
- The second is that the first two bits of the next byte is used to select a register which contains the data and then adds the signed displacement.
- The third mode is that de next immediate byte is used as a address for the memory and the read byte is used as data.
- The fourth mode reads a register adds the signed displacement and uses it as the address for the memory and uses the byte that it reads as data.
```
0 = data = imm
1 = data = reg + dis
2 = address = imm, data = [address]
3 = address = reg + dis, data = [address]
```

## Memory Banking
Originally, the Neva processor only had an 8-bit address bus. After a while I discovered that this was a little too little for larger programs such as: the game pong. So I opted to add a simple banking system.

The banking system works as follows: there are three bank registers, the code, the data and the stack bank and you can adjust these bank registers with certain bank instructions:
- The code bank works as the higher byte of the instruction fetch cycle.
- The data bank works as the higher byte of the load and store instructions.
- The stack bank works as the higher byte of stack instructions.

I have chosen to split these three bank registers as this gives the possibility to use for example a data bank and different code banks or to use a code bank and different data banks. **Banks are so far only supported in the JavaScript simulator**. Thanks to this banking system, the Neva processor now has a 16-bit address bus and can now use 2 ^ 16 = 65536 bytes of memory!

## Instructions
Because we use five bits for the instruction opcode there is room for 32 different instructions:

| #  | Name     | Meaning              | Special encoding       | Operation                                            |
|----|----------|----------------------|------------------------|------------------------------------------------------|
| 0  | nop      | no operation         |                        | -                                                    |
|    |          |                      |                        |                                                      |
| 1  | load     | load something       |                        | reg = data                                           |
| 2  | store    | store something      | mode = 2 or 3          | mem[address] = reg                                   |
|    |          |                      |                        |                                                      |
| 3  | add      | add                  |                        | reg += data                                          |
| 4  | adc      | add with carry       |                        | reg += data + carry                                  |
| 5  | sub      | subtract             |                        | reg -= data                                          |
| 6  | sbb      | subtract with borrow |                        | reg -= data + carry                                  |
| 7  | cmp      | compare              |                        | reg - data (set only flags)                          |
|    |          |                      |                        |                                                      |
| 8  | and      | and                  |                        | reg &= data                                          |
| 9  | or       | or                   |                        | reg |= data                                          |
| 10 | xor      | xor                  |                        | reg ^= data                                          |
| 11 | not      | not                  |                        | reg = ~data                                          |
| 12 | shl      | shift left           |                        | reg <<= data & 7                                     |
| 13 | shr      | shift right          |                        | reg >>= data & 7                                     |
|    |          |                      |                        |                                                      |
| 14 | jmp      | jump                 | reg = 0                | ip = data                                            |
| 15 | jc       | jump if carry        | reg = 0                | if (carry) ip = data                                 |
| 16 | jnc      | jump if not carry    | reg = 0                | if (!carry) ip = data                                |
| 17 | jz       | jump if zero         | reg = 0                | if (zero) ip = data                                  |
| 18 | jnz      | jump if not zero     | reg = 0                | if (!zero) ip = data                                 |
| 19 | ja       | jump if above        | reg = 0                | if (!carray && !zero) ip = data                      |
| 20 | jna      | jump if not above    | reg = 0                | if (carry \|\| zero) ip = data                         |
|    |          |                      |                        |                                                      |
| 14 | bra      | branch               | reg = 1                | ip += data                                           |
| 15 | bc       | branch if carry      | reg = 1                | if (carry) ip += data                                |
| 16 | bnc      | branch if not carry  | reg = 1                | if (!carry) ip += data                               |
| 17 | bz       | branch if zero       | reg = 1                | if (zero) ip += data                                 |
| 18 | bnz      | branch if not zero   | reg = 1                | if (!zero) ip += data                                |
| 19 | ba       | branch if above      | reg = 1                | if (!carray && !zero) ip += data                     |
| 20 | bna      | branch if not above  | reg = 1                | if (carry \|\| zero) ip += data                        |
|    |          |                      |                        |                                                      |
| 21 | push     | push something       | mode = 0 or 1          | mem[sp--] = data                                     |
| 22 | pop      | pop something        | mode = 2 or 3          | reg = mem[++sp]                                      |
| 23 | call     | call                 | reg = 0, mode = 0 or 1 | mem[sp--] = ip, ip = data                            |
| 24 | ret      | return               | reg = 0, mode = 2 or 3 | ip = mem[sp + 1], sp += address + 1                  |
| 23 | bcall    | branch call          | reg = 1, mode = 0 or 1 | mem[sp--] = ip, ip += data                           |
| 24 | bret     | branch return        | reg = 1, mode = 2 or 3 | ip += mem[sp + 1], sp += address + 1                 |
| 25 | ssp      | set stack pointer    |                        | sp = data                                            |
|    |          |                      |                        |                                                      |
| 26 | bankjmp  | bank jump            |                        | code_bank = reg, ip = data                           |
| 27 | bankcall | bank call            | mode = 0 or 1          | code_bank = reg, mem[sp--] = ip, ip = data           |
| 28 | bankret  | bank return          | mode = 2 or 3          | code_bank = reg, ip = mem[sp + 1], sp += address + 1 |
| 29 | sdb      | set data bank        |                        | data_bank = data                                     |
| 30 | ssb      | set stack bank       |                        | stack_bank = data                                    |
|    |          |                      |                        |                                                      |
| 31 | halt     | halt processor       |                        | stops the processor                                  |

There are also some pseudo instructions which the assembler translates to other instructions:

| Name | Meaning                      | Example         | Translation       |
|------|------------------------------|-----------------|-------------------|
| mov  | move something in register   | mov reg, data   | load reg, data    |
| mov  | move something to memory     | mov [data], reg | store reg, [data] |
|      |                              |                 |                   |
| inc  | increment register           | inc reg         | add reg, 1        |
| dec  | decrement register           | dec reg         | sub reg, 1        |
|      |                              |                 |                   |
| jb   | jump if below                | jb data         | jc data           |
| jnae | jump if not above or equel   | jnae data       | jc data           |
| jnb  | jump if not below            | jnb data        | jnc data          |
| jae  | jump if above or equel       | jae data        | jnc data          |
| je   | jump if equel                | je data         | jz data           |
| jne  | jump if not equel            | jne data        | jnz data          |
| jnbe | jump if not below or equel   | jnbe data       | ja data           |
| jbe  | jump if below or equel       | jbe data        | jna data          |
|      |                              |                 |                   |
| bb   | branch if below              | bb data         | bc data           |
| bnae | branch if not above or equel | bnae data       | bc data           |
| bnb  | branch if not below          | bnb data        | bnc data          |
| bae  | branch if above or equel     | bae data        | bnc data          |
| be   | branch if equel              | be data         | bz data           |
| bne  | branch if not equel          | bne data        | bnz data          |
| bnbe | branch if not below or equel | bnbe data       | ba data           |
| bbe  | branch below or equel        | bbe data        | bna data          |

## Memory I/O interface
All input and output options of the computer are based on memory addresses. So you need to read or write to some specific addresses to communicate with other devices:
```
0x00fe = Read a ASCII character from the keyboard
0x00ff = Write an ASCII character to the terminal display

-- Only in the JavaScript simulator
0x00fb = x position
0x00fc = y position
0x00fd = 0 = clear the points
         1 = render points to the screen
         2 = move the pen to this position
         3 = line the pen to this position
         4 = move the pen to this position relative to the last point
         5 = line the pen to this position relative to the last point

```

## Online simulator and assembler
There is an online processor simulator and assembler available at [neva-processor.netlify.app](https://neva-processor.netlify.app/)


## Assembler for Logism
The file `asm.js` contains a simple assembler written in JavaScript, you need [Node.js](https://nodejs.org/) to use this on your computer

---

## Ideas for the Neva II Processor
I've also some ideas for the second Neva processor:

- A better 16-bit or 24-bit address bus (for more memory access)
- As much as possible compatible at assembler level (for portability)
- More registers 4, 6 or 8 (for better performance)
- More flags and jump / branch instructions like: jump if less signed (for more flexibility)
- Direct write access to the stack pointer, and banks as registers (for more flexibility)
- Variable instruction length encoding (for smaller code size and better performance)

## The Taro video controller
I think it would also be nice to make a simple VGA video card / generator / controller for this new processor that can do the following:

- It outputs a VGA signal (640x480)
- It has it's own video ram for fast access
- It only has text modes with a 8x8 pixel character font with the [Code page 437](https://en.wikipedia.org/wiki/Code_page_437) symbols
- The character font can be changed because it's in video ram
- Different text mode sizes: 20x15, 40x30, 80x60
- 4-bit color so 16 different colors in a nice color pallet
- It is connect via a small memory interface with the Neva II processor

You can find a simple working example in the [taro.html](https://neva-processor.netlify.app/taro.html) file
