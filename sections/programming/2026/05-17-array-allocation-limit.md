---
title: Determining Java's Max Array Allocation Size
authors:
    - ash
date: 2026-05-17T18:53:30.000Z
last_update:
    date: 2026-06-07T16:48:58.000Z
---

For those unfamiliar, the Minecraft modding community just released a patch on May 11th, 2026 for a [Memory Allocation with Excessive Size Value](https://cwe.mitre.org/data/definitions/789.html) exploit when decoding a network packet.

<!-- truncate -->

I was the one responsible for implementing the mitigation strategy and writing the [blog post](https://neoforged.net/news/mitigating-vulnerabilities-network/) for the NeoForged team. It was quite fun to research and learn some new things during the process.

However, this blog post has nothing to do with that.

During the review phase of the post, the original reporter of the exploit [Paul](https://github.com/pau101) mentioned that trying to allocate an array with `Integer.MAX_VALUE` will [likely fail before any memory is allocated](https://github.com/neoforged/websites/pull/100#discussion_r3253303333). This actually comes from a comment in [`ArraysSupport`](https://github.com/openjdk/jdk/blob/22b46872d0d647c9ef9f4414b4685afa8313926d/src/java.base/share/classes/jdk/internal/util/ArraysSupport.java#L842-L854) that states:

```java
// From `ArraysSupport`
/**
 * A soft maximum array length imposed by array growth computations.
 * Some JVMs (such as HotSpot) have an implementation limit that will cause
 *
 *     OutOfMemoryError("Requested array size exceeds VM limit")
 *
 * to be thrown if a request is made to allocate an array of some length near
 * Integer.MAX_VALUE, even if there is sufficient heap available. The actual
 * limit might depend on some JVM implementation-specific characteristics such
 * as the object header size. The soft maximum value is chosen conservatively so
 * as to be smaller than any implementation limit that is likely to be encountered.
 */
public static final int SOFT_MAX_ARRAY_LENGTH = Integer.MAX_VALUE - 8;
```

To which I thought... really? So I gave it a quick try with Microsoft's OpenJDK using `new Object[Integer.MAX_VALUE]`, and lo and behold:

```
Exception in thread "main" java.lang.OutOfMemoryError: Requested array size exceeds VM limit
```

It did throw the error. And trying with `new Object[Integer.MAX_VALUE - 8]` created the array successfully, at the cost of ~8GiBs of heap usage.

I could've left it there with a 'neat' and moved on, but the 'some JVMs' part kept rattling around in my head. Since it's 'some', wouldn't that mean there exists a JVM that allows `new Object[Integer.MAX_VALUE]`? Actually, what *is* the maximum number of elements an array can hold?

So, I decided to test it.

Using [SDKMAN!](https://sdkman.io/), I downloaded the latest release of every JVM, including the [JetBrains Runtime (JBR)](https://github.com/JetBrains/JetBrainsRuntime) separately, into a Debian 13 container and ran a quick little allocation test using:

```java
public class AllocationTest {

    public static void main(String[] args) {
        // Start with max size
        int size = Integer.MAX_VALUE;
        while (true) {
            try {
                Object[] maxCapacity = new Object[size];
                // Break after successful allocation
                break;
            } catch (OutOfMemoryError error) {
                // Too large, reduce size
                size--;
            }
        }
        System.out.println("Max Size: " + size);
    }
}
```

Nothing to complex, it attempts to construct an array with the given size, and if an OOM is thrown, it repeats the process with one number smaller until does. With 18GiBs to play around with, I got the following results:

| Implementation | Latest Version | Max Allocation Size |
|:---:|:---:|:---|
| BiSheng (Huawei) | 21 | 2,147,483,645 |
| Corretto (Amazon) | 26 | 2,147,483,645 |
| Dragonwell (Alibaba) | 21 | 2,147,483,645 |
| GraalVM (GraalVM Community) | 25 | 2,147,483,645 |
| GraalVM (Oracle) | 25 | 2,147,483,645 |
| Java SE Development Kit (Oracle) | 26 | 2,147,483,645 |
| Kona (Tencent) | 21 | 2,147,483,645 |
| Liberica (Bellsoft) | 26 | 2,147,483,645 |
| Liberica NIK (Bellsoft) | 25 | 2,147,483,645 |
| Mandrel (Red Hat) | 25 | 2,147,483,645 |
| OpenJDK (Microsoft) | 25 | 2,147,483,645 |
| OpenJDK (jdk.java.net) | 26 | 2,147,483,645 |
| SapMachine (SAP) | 26 | 2,147,483,645 |
| Semeru (IBM) | 26 | 2,147,483,647 |
| Temurin (Eclipse) | 26 | 2,147,483,645 |
| Trava (Trava) | 11 | 2,147,483,645 |
| Zulu (Azul Systems) | 26 | 2,147,483,645 |
| JetBrains Runtime | 25 | 2,147,483,645 |

Strangely, only IBM's Semeru JVM allowed the array to allocate an `Integer.MAX_VALUE` of elements. Even stranger, the other JVMs allocated `Integer.MAX_VALUE - 2`, which is six greater than the `ArraysSupport.SOFT_MAX_ARRAY_LENGTH`.

So, for the first part, that's because of the underlying base making up the JVMs. Every single one except for IBM's Semeru is based off of HotSpot, where that comment comes from. Meanwhile, Semeru is based on OpenJ9, which provides a different implementation of the JVM spec. We can see that even more clearly when trying to go outside the maximum bounds of an `ArrayList` via `add`.

For HotSpot JVMs:

```
Exception in thread "main" java.lang.OutOfMemoryError: Requested array size exceeds VM limit
        at java.base/java.util.Arrays.copyOf(Arrays.java:3509)
        at java.base/java.util.Arrays.copyOf(Arrays.java:3478)
        at java.base/java.util.ArrayList.grow(ArrayList.java:238)
        at java.base/java.util.ArrayList.grow(ArrayList.java:245)
        at java.base/java.util.ArrayList.add(ArrayList.java:484)
        at java.base/java.util.ArrayList.add(ArrayList.java:497)
```

And for Semeru's OpenJ9 JVM:

```
Exception in thread "main" java.lang.OutOfMemoryError: Required array length 2147483647 + 1 is too large
        at java.base/jdk.internal.util.ArraysSupport.hugeLength(ArraysSupport.java:914)
        at java.base/jdk.internal.util.ArraysSupport.newLength(ArraysSupport.java:907)
        at java.base/java.util.ArrayList.grow(ArrayList.java:235)
        at java.base/java.util.ArrayList.grow(ArrayList.java:245)
        at java.base/java.util.ArrayList.add(ArrayList.java:484)
        at java.base/java.util.ArrayList.add(ArrayList.java:497)
```

Same OOM, but different reasoning. Though, the OpenJ9 error doesn't make much sense since it implies it would let you create a larger array if it wasn't limited to a signed integer.

As for why they allow allocation up to those values, I have no idea. After asking around, someone mentioned that the Java Virtual Machine Specification (JVMS) defines that the first two entries could be taken up by the array's length followed by its data type, but I was unable to find such a explanation within the doc. Most likely, it's just up to the JVM to choose how arrays are implemented. After all, "the soft maximum value is chosen conservatively so as to be smaller than any implementation limit that is likely to be encountered." (From `ArraysSupport.SOFT_MAX_ARRAY_LENGTH`)

Now, of course there are other JVMs other than the two big ones everyone forks, so what about those? Well, the problem is that most of those JVMs are implemented for pre-8 versions, which fails spectacularly in modern containers with modern libraries. To actually get it working in a container, I'd have to build an old linux distro from scratch, install the dependencies from some archival site, and then just hope there isn't any weird implementations preventing me from building it from source. So I thought about it...

...and moved on.

What? That's way too much effort for "how big can I make my array" when the likelihood of me actually ever reaching that limit is slim to none. I'd much rather go down some different rabbit holes.

So all in all, the main difference between the array implementations is that I can store two more elements in Semeru than the others.

...yeah, definitely an interesting use of my time.
