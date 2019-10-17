# The Neva 8-bit Processor
A simple educational 8-bit processor with assembler

## Design
The file `design.circ` is a [Logism](http://www.cburch.com/logisim/) circuit which contains the complete processor:

![Logisim Design](design.png)

## Inspiration
- https://en.wikipedia.org/wiki/MOS_Technology_6502
- https://en.wikichip.org/wiki/intel/mcs-8/isa
- https://en.wikipedia.org/wiki/X86_instruction_listings
- https://schweigi.github.io/assembler-simulator/

## Instruction encoding
There are two different instruction encodings the first is the immediate data encoding and the second is the register encoding:

### Data encoding:
```
  5     1   2   |  8
opcode reg mode | imm
```

### Register encoding:
```
  5     1   2   |  7    1
opcode reg mode | null reg
```

## Registers
```
0 = A = 0
1 = B = 0
ip = instruction pointer = 0
sp = stack pointer = 0xfe or 0xfb
carry flag = 0
zero flag = 0
```

## Modes
```
0 = data = imm
1 = data = reg
2 = data = [imm]
3 = data = [reg]
```

## Instructions
There is room for 32 different instructions:

```
0 = nop

1 = load = reg = data
2 = store (mode = 2 or mode = 3) = mem[data] = reg

-- effects carray flag and zero flag
3 = add = reg += data
4 = adc = reg += data + carry
5 = sub = reg -= data
6 = sbb = reg -= data - carry
7 = cmp = reg - data (set only flags)

-- effects zero flag
8 = and = reg &= data
9 = or = reg |= data
10 = xor = reg ^= data
11 = not = reg = ~data
12 = shl = reg <<= data & 7
13 = shr = reg >>= data & 7

14 = jmp = ip = data
15 = jc = if (carry) ip = data
16 = jnc = if (!carry) ip = data
17 = jz = if (zero) ip = data
18 = jnz = if (!carry) ip = data
19 = ja = if (!carry && !zero) ip = data
20 = jna = if (carry && zero) ip = data

21 = push (mode = 0 or mode = 1) = mem[sp--] = data
22 = pop (mode = 2) = reg = mem[++sp]
23 = call (mode = 0 or mode = 1) = mem[sp--] = ip, ip = data
24 = ret (mode = 2) = ip = mem[++sp]

25 / 30 = nothing

31 = halt
```

There are also some pseudo instructions which translates to other instructions:
```
mov reg, data = load reg, data
mov [data], reg = store reg, [data]

inc reg = add reg, 1
dec reg = sub reg, 1

jb data = jc data
jnae data = jc data
jnb data = jnc data
jae data = jnc data

je data = jz data
jne data = jnz data

jnbe data = ja data
jbe data = jna data
```

## Memory I/O interface
If you write to some special memory locations you can communicate with some I/O devices:

```

0xff = Write an ASCII character to the terminal display

-- Only in the JavaScript simulator
0xfc = x position
0xfd = y position
0xfe = 0 = move the pen to this position
       1 = line the pen to this position
       2 = clear the screen

```

## Online simulator and assembler
There is an online processor simulator and assembler available at [neva-processor.ml](https://neva-processor.ml/)


## Assembler for Logism
The file `asm.js` contains a simple assembler written in JavaScript, you need [Node.js](https://nodejs.org/) to use this


## Ideas for the Neva II Processor
I've also some ideas for the second Neva processor:

- Same 8-bit design
- 16-bit address bus (for more memory access)
- More registers 4 or 8 (for better performance)
- More instruction modes like: [register + imm] (for more flexibility)
- More flags and jump instructions like: jump if less signed (for more flexibility)
- Direct access to the stack pointer as a register (for more flexibility)
- Variable instruction length encoding (for smaller code size and better performance)
