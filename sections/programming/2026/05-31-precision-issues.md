---
title: Why 0.1 + 0.2 = 0.30000000000000004
authors:
    - ash
date: 2026-05-31T04:39:30.000Z
last_update:
    date: 2026-06-07T19:01:15.000Z
---

How do you know whether two expressions are equivalent?

<!-- truncate -->

As humans, this can be a rather simple task: we apply the formulas we know to convert one expression to another. But for computers, they may not be aware of all the general nuances and complexities that come with math expressions. Therefore, many checkers typically choose the brute force approach: that is, plug in numbers and check whether the returned values are the same. Rather simplistic, but it gets the job done well in a number of cases.

Let's take a look at an example:

```math
f_1(x)=(\frac23)^x
```

```math
f_2(x)=(\frac{2^x}{3^x})
```

Take a moment to convince yourself that $f_1(x)=f_2(x)$ due to the Power of a Quotient rule. Therefore if we were to create a new equation:

```math
d(x)=f_1(x)-f_2(x)
```

We should see that $d(x)=0$ for all values of $x$. So, when we look at a graph:

<Desmos id="csowgloafz" />

...hm, well that's weird. The graph seems to stop arbitrarily at $x=1024$ while increasing exponentially around $x=-80$. And what's with that giant black bar at $x=-680$ to $x=-650$?

Well, my dear readers, welcome to the wonderful world of floating point precision errors.

Hmm? What's a floating point precision error, you ask? Well, let me show you through a simple example.

Evaluate:

```math
0.1+0.2
```

Did you think the answer is $0.3$? Well, I'm sorry to tell you that you're wrong. It's actually $0.30000000000000004$. Don't believe me? Open up a JavaScript console and try it yourself.

To understand why, let's look at the binary representations of these numbers. JavaScript stores decimal values as double-precision floating-point numbers following the [IEEE 754 standard](https://en.wikipedia.org/wiki/IEEE_754). This means that a float is made up of 8 bytes, or 64 bits.

The IEEE 754 standard stores floating point numbers as a sort-of scientific notation with three parts: a 1 bit sign (positive or negative), a 52 bit fraction or significand, and a 11 bit exponent all in base 2.

We can get the bytes of a number with a neat little coding trick:

```javascript
function floatToBinaryString(value) {
    var output = '';
    // Get the bytes in reverse order
    for (const part of new Uint8Array(new Float64Array([value]).buffer, 0, 8)) {
        // Convert to string
        var partString = (part >>> 0).toString(2);
        // Pad any missing zeros
        while (partString.length < 8) partString = '0' + partString;
        // Prefix to place in proper order
        output = partString + output;
    }
    return output;
}
```

Using this, the binary representations of our two numbers are:

```javascript
// Values are displayed in the correct order
// In the form '<Sign> <Exponent> <Fraction>'
0.1 = 0 01111111011 1001100110011001100110011001100110011001100110011010
0.2 = 0 01111111100 1001100110011001100110011001100110011001100110011010
```

Now at a glance, you can tell something is weird, especially with that fraction part. It shouldn't be that complicated to store $0.1$ or $0.2$ in base 2, right?

Why don't we try evaluating these binary values manually then?

The sign is rather straight forward (0 if positive and 1 if negative). The same goes for the fraction: the sum of all $2^{-n}$ that have a 1, where $n$ is the bit number starting from 1, plus 1. The exponent, on the other hand, is calculated differently to allow for negative values. This is done by performing the standard base 2 to base 10 conversion, then subtracting $2^{k-1}-1$, where $k$ is the number of bits in the exponent (in this case $k=11$). Then all of these parts are multiplied together.

That was probably not explained that well, so let me show you the code:

```javascript
// Outputs the sign
function binaryStringToSign(value) {
    // Gets the sign value from the first part
    return value[0] === '0' ? 1 : -1;
}

// Outputs the 2^n exponent
function binaryStringToExponent(value) {
    var output = 0;
    // Compute initial exponent
    for (var i = 0; i < 11; i++) {
        const bit = parseInt(value[i + 1]);
        output += bit * 2 ** (11 - 1 - i);
    }
    // Apply bias
    output -= (2 ** (11 - 1)) - 1;
    // Return exponent to raise '2' to
    return output;
}

// Outputs the 2^n exponents to sum together and add 1
function binaryStringToFractionParts(value) {
    const output = [];
    // Compute fraction parts
    for (var i = 0; i < 52; i++) {
        const bit = parseInt(value[i + 12]);
        if (bit === 1) output.push((-(i + 1)));
    }
    return output;
}
```

With all this, we can add up the values in our accurate calculator of choice (e.g., Wolfram Alpha):

```math
1 * 2^{-4} * (1 + 0.600000000000000088817841970012523233890533447265625) =
```
```math
0.1000000000000000055511151231257827021181583404541015625
```

```math
1 * 2^{-3} * (1 + 0.600000000000000088817841970012523233890533447265625) =
```
```math
0.200000000000000011102230246251565404236316680908203125
```

Well, that's pretty much $0.1$ and $0.2$, but it's not exactly those values. It's just a really accurate approximation, leaving some room for precision error.

But wait. Adding those two numbers together, we get:

```math
0.1000000000000000055511151231257827021181583404541015625 +
```
```math
0.200000000000000011102230246251565404236316680908203125 =
```
```math
0.3000000000000000166533453693773481063544750213623046875
```

Which is definitely not $0.30000000000000004$. Though, surprisingly enough, if we put that number into the JavaScript console, it does equal that value. So, there's even more precision bugs to work out.

Adding two floating-point numbers together require the exponents to be the same before adding the fraction component. First, let's convert this to a more convenient form to perform the operations on:

```math
0.1 = 1.1001100110011001100110011001100110011001100110011010 * 2^{01111111011}
```
```math
0.2 = 1.1001100110011001100110011001100110011001100110011010 * 2^{01111111100}
```

In this case, the exponent for $0.1$ is $01111111011$ while it's $01111111100$ for $0.2$. Well, that's easy enough to deal with. We can increase the exponent for $0.1$ by 1 by shifting the fraction component 1 to the left.

```math
0.1 = 0.1100110011001100110011001100110011001100110011001101 * 2^{01111111100}
```
```math
0.2 = 1.1001100110011001100110011001100110011001100110011010 * 2^{01111111100}
```

Now all that's left to do is add the two fraction parts together:

```math
0.1100110011001100110011001100110011001100110011001101 +
```
```math
1.1001100110011001100110011001100110011001100110011010 =
```
```math
10.0110011001100110011001100110011001100110011001100111
```

Which we can rewrite as:

```math
0.3 = 10.0110011001100110011001100110011001100110011001100111 * 2^{01111111100}
```

Shift to match proper scientific notation:

```math
0.3 = 1.00110011001100110011001100110011001100110011001100111 * 2^{01111111101}
```

And round since there are now 53 bits representing the exponent. We round up if the 52nd bit is 1, and down if 0:

```math
0.3 = 1.0011001100110011001100110011001100110011001100110100 * 2^{01111111101}
```

Which leaves us with the final number:

```javascript
0.3 = 0 01111111101 0011001100110011001100110011001100110011001100110100
```

And sure enough, evaluating the floating-point precisely gives us:

```math
1 * 2^{-2} * (1 + 0.20000000000000017763568394002504646778106689453125) =
```
```math
0.3000000000000000444089209850062616169452667236328125
```

Where we can now see that pesky $4*10^{-17}$ rounding error. It's all a game of approximation math. And with those precision issues, $(\frac23)^{x}-(\frac{2^x}{3^x})\neq0$.

However, that graph hold a lot more math limitations than you think. But that's a story for next week.
