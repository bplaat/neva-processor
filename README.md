# The Neva 8-bit Processor
A simple educational 8-bit processor with assembler

## Design
The file `design.circ` is a [Logism](http://www.cburch.com/logisim/) circuit wich contains the complete processor

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
sp = stack pointer = 0xfe
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

## Online simulator and assembler
There is an online processor simulator and assembler available at [neva-processor.ml](https://neva-processor.ml/)


## Assembler for Logism
The file `asm.js` contains a simple assembler written in JavaScript, you need [Node.js](https://nodejs.org/) to use this
