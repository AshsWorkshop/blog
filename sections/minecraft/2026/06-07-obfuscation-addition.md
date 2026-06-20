---
title: When was Minecraft obfuscated?
authors:
    - ash
date: 2026-06-07T19:01:01.000Z
last_update:
    date: 2026-06-14T15:03:11.000Z
---

Large language models like to lie, a lot.

<!-- truncate -->

I don't try to ask it tricky questions. If anything, I want to eventually integrate large language models into my workflow, well, once they stop hallucinating on any problem outside their dataset. It doesn't matter how good a word predictor is if it can't admit that it doesn't know the answer.

For example, when was the Minecraft source code first obfuscated?

We know for a fact that the codebase hasn't been obfuscated since it's inception, especially with the recently popularity spike of people making mods for [`rd-132211`](https://minecraft.wiki/w/Java_Edition_pre-Classic_rd-132211). It's also not an easy question given the number of versions that we don't have archives for (according to the [Minecraft wiki](https://minecraft.wiki/w/Java_Edition_version_history)). So I threw the question over to Gemini:

'When was Minecraft first obfuscated?'

> "Minecraft: Java Edition was first obfuscated alongside its initial public release in 2009. To protect their proprietary code, Mojang used scrambled variable and class names, a practice that continued for over a decade."

...well, that's not true. Though, Gemini could be assuming only releases from 1.0 onwards So let's rephrase the question.

'What was the first version of Minecraft (any build) that was obfuscated?'

> "The first obfuscated build (2009): The very initial pre-Classic and Classic versions (like `rd-131655`) were obfuscated with ProGuard."

...that's even worse. We already know the next version wasn't obfuscated, so what's the likelihood that a prior one, a version with no archive, was? Maybe I phrased the question wrong. Let's try once more:

'Including all pre-release builds, when was Minecraft first obfuscated?'

> "Minecraft’s Java code was first scrambled (obfuscated) with ProGuard in the pre-Classic version 0.0.15a in May 2009. Mojang applied this code scrambling to its very earliest multiplayer tests to protect proprietary algorithms and prevent hacked clients."

Well now, that seems a lot more reasonable, and only after three attempts!

But is it true?

Well, if we track down the source, it leads to a single comment from [a reddit post by 'iProgramMC' on December 21st, 2023](https://www.reddit.com/r/Minecraft/comments/18i7ybi/comment/keam8os/).

> "I mentioned this in several replies to comments. I believe that the original reason for obfuscation was to try to prevent the creation of hacked clients and client-based cheats. You see, Classic builds before 0.0.15a (when the first multiplayer tests were being performed), are not obfuscated at all - you can throw them into any Java decompiler and they will show it all; this leads me to believe that's the original reason. It probably has changed over time."

I couldn't really find any proof to this claim, but on its face, it seems reasonable. However, I can do one better.

Let's verify it!

Modifying the previous gradle buildscript once again:

```kotlin
plugins {
    id("fabric-loom") version "1.10-SNAPSHOT"
}

group = "net.ashwork.mc"
version = "0.0.0"
base.archivesName = "legacy"

loom {
    noIntermediateMappings()
    clientOnlyMinecraftJar()
}

dependencies {
    minecraft("com.mojang:minecraft:<minecraft_version>")
    mappings(loom.layered {
        // No mappings required
    })
    modImplementation("net.fabricmc:fabric-loader:0.16.14")
}

tasks.withType<JavaCompile> {
    options.release = 8
    options.encoding = "UTF-8"
}

java {
    sourceCompatibility = JavaVersion.VERSION_1_8
    targetCompatibility = JavaVersion.VERSION_1_8
}
```

All we need to do is check the downloaded source and see if it was obfuscated or not.

And running through all the versions in the manifest from oldest to newest, the first obfuscated version is [`c0.0.13a_03` (or `0.0.13a_03`)](https://minecraft.wiki/w/Java_Edition_Classic_0.0.13a_03). And since the version prior to that, [`c0.0.13a` (or `0.0.13a`)](https://minecraft.wiki/w/Java_Edition_Classic_0.0.13a), isn't obfuscated, we have our answer!

Well, sort of. There's a slight hiccup to this reasoning. According to the Minecraft Wiki:

> "An early development version of 0.0.13a, mislabelled as its released counterpart, is available in the launcher. It was used for testing the world size, and can only generate flat terrain, instead of the actual terrain used in the full release. Many features from 0.0.12a are still present, such as using the "generating level" screen from that version instead of the one from 0.0.13a."

This means that we could potentially be dealing with some kind of mislabeling. Of course, there is some evidence that `0.0.13a_03` can be the first obfuscated version. Looking through the channel logs from the [#minecraft IRC server by Testvan](https://archive.org/details/Testvan-Minecraft-IRC-logs), we can see some supporting conversation from May 25th, 2009:

> - \[04:22] \<taodih_away> then last question , for developers *make sure you licence it then* can we expand the game as you say you only used 17/256 of the tilesets
> - \[04:22] \<\@Notch> that's a really good idea
> - \[04:22] * failgoat is now known as Stargoat
> - \[04:22] \<\@Notch> charge less for it when it's beta, then more when it's done (but you still get the full version if you bought at beta)
> - \[04:23] \<taodih_away> maby an extra payment for the developers as the get the sourcecode
> - \[04:23] \<mezo> yeah
> - \[04:23] \<\@Notch> taodih_away: I'm very much considering modding support. =)
> - \[04:23] \<mezo> people feel inclined to buy the beta that way
> - \[04:23] \<taodih_away> awsome
> - \[04:23] \<pyl> oh shit yes, modding support
> - \[04:23] \<\@Notch> it'd probably be mostly for multiplayer, though, since that's where people run servers
> - \[04:23] \<\@Notch> so you could set up a server with custom textures and blocks, possibly. =)
> - \[04:23] \<pyl> maybe i can finally have my earthworm mode :)
> - \[04:23] \<vdgmprgrmr> That'd be cool.
> - \[04:23] \<taodih_away> lol
> - \[04:24] \<taodih_away> hmmmmmi actuly meant real total modding 
> - \[04:24] \<MCXD> I'd probably buy it too
> - \[04:24] * neutrinka has joined #minecraft
> - \[04:24] \<taodih_away> that you actuly get the sourcecode 
> - \[04:25] \<taodih_away> me to but i'll need the money first
> - \[04:25] \<vdgmprgrmr> ... That might be cool as well.
> - \[04:25] \<\@Notch> I'm not going to opensource it or sell the source code
> - \[04:25] \<vdgmprgrmr> Yeah, expected that.
> - \[04:25] \<\@Notch> if people reverse-engineer and so on, I can't (and won't! especially if they've paid me :D) stop them
> - \[04:25] \<\@Notch> but as soon as you release the source code, you kinda encourage it, and I don't want to do that
> - \[04:25] \<taodih_away> ooooh 
> - \[04:25] \<taodih_away> ok i'll need to study on java xD
> - \[04:25] \<\@Notch> however, once sales starts dwindling, I could definitely see myself opensourcing it

This conversation, from taodih_away "\[maybe] an extra payment for the developers as the get the sourcecode" and @Notch "I'm not going to opensource it or sell the source code' / 'if people reverse-engineer and so on, I can't (and won't! especially if they've paid me :D) stop them" indicate that, at this point in time, the Minecraft source code was already obfuscated. There's even further proof from May 29th, 2009:

> - \[05:52] \<taodih> i hope the n error isint just because of that o-O 
> - \[05:52] \<\@Notch> the n error is caused by the loaded map having a width and height of 0
> - \[05:53] \<taodih> oh ok 
> - \[05:53] \<\@Notch> levels saved when there was some level file version problem (ie yesterday? the day before) could get corrupted like that
> - \[05:53] \<taodih> cunk when did you last saved??? o_O 
> - \[05:53] \<\@Notch> the sad thing is that the actual level data is null as well, so I can't recompute the level data for that
> - \[05:53] \<taodih> maby it was because of new updates 
> - \[05:53] \<\@Notch> it was a stupid mistake of mine
> - \[05:54] \<\@Notch> I had changed to using the built in serialization in java, and it worked great locally
> - \[05:54] \<Cunk> i got the error right after i made the level.  the same night.  it wasn't something that happened a day or two later
> - \[05:54] \<\@Notch> but I forgot that I obfuscate the game before uploading it, and that broke serialization between versions
> - \[05:54] \<\@Notch> yes, I updated the client many times that night
> - \[05:54] \<Cunk> ah, ok.  then i guess it could have been a version thing

@Notch "but I forgot that I obfuscate the game before uploading it, and that broke serialization between versions" indicates that the game was obfuscated prior to May 29th, 2009.

So, I guess this is it, `0.0.13a_03` is the first obfuscated Minecraft version.

...well, maybe we can dig up a bit more proof.

There are two nearby versions that are archived somewhere else, and therefore not in the version manifest: [`0.0.12a_03`](https://minecraft.wiki/w/Java_Edition_Classic_0.0.12a_03) and [`0.0.14a_08`](https://minecraft.wiki/w/Java_Edition_Classic_0.0.14a_08). If we decompile the JAR of these versions, we should be able to, at least, definitively prove to the best to our knowledge that `0.0.13a_03` is the first obfuscated Minecraft version.

Luckily for us, [Omniarchive](https://omniarchive.uk/) provides a link to these versions. For brevity, I downloaded all versions from `0.0.11a` to `0.0.14a_08` just to verify our findings. For those curious:

- `c0.0.11a-launcher.jar`
- `c0.0.12a_03-200018.jar`
- `c0.0.13a-launcher.jar`
- `c0.0.13a_03.jar`
- `c0.0.13a_03-launcher.jar`
- `c0.0.14a_08.jar`

And for whether they were obfuscated:

| JAR                        | Obfuscated |
|:--------------------------:|:-----------|
| `c0.0.11a-launcher.jar`    | No         |
| `c0.0.12a_03-200018.jar`   | Yes        |
| `c0.0.13a-launcher.jar`    | No         |
| `c0.0.13a_03.jar`          | Yes        |
| `c0.0.13a_03-launcher.jar` | Yes        |
| `c0.0.14a_08.jar`          | Partial    |

...huh. Well that's a problem. Let's expand our version range a bit more just to verify:

| JAR                        | Obfuscated |
|:--------------------------:|:-----------|
| `c0.0.15a-05311904.jar`    | Partial    |
| `c0.0.16a_02-081047.jar`   | Partial    |
| `c0.0.17a-2014.jar`        | Partial    |
| `c0.0.18a_02.jar`          | Partial    |
| `c0.0.19a_04.jar`          | Partial    |
| `c0.0.19a_06-0137.jar`     | Partial    |
| `c0.0.20a_01.jar`          | Partial    |
| `c0.0.20a_02.jar`          | Partial    |

...hmm. Yeah. Still weird. First of all, [`c0.0.12a_03` (or `0.0.12a_03`)](https://minecraft.wiki/w/Java_Edition_Classic_0.0.12a_03) is obfuscated, which is earlier than the `c0.0.13a_03` release. Meanwhile, JARs from `c0.0.14a_08` have some unobfuscated classes.

For the latter, Minecraft originally used Java's `Serializable` class to handle saving data to disk. `Serializable`, along with its associated `ObjectInputStream` and `ObjectOutputStream` used reflection to read a class's fields by their name to write them to some file. Naturally, if a field's or class's name changes, for example due to obfuscation, the game may be unable to read or write the data deterministically. As such, the easiest way to handle this was to leave it deobfuscated. (Credit to [Celeste](https://github.com/CelDaemon) for the accurate deduction)

As for the former, the obfuscated existence of `0.0.12a_03` while `0.0.13a` being unobfuscated in the launcher provides two potential conclusions:

One, `0.0.13a` is mislabelled in the Minecraft launcher and actually represents a previous version. The [Omniarchive version spreadsheet](https://docs.google.com/spreadsheets/d/1OCxMNQLeZJi4BlKKwHx2OlzktKiLEwFXnmCrSdAFwYQ/htmlview#gid=872531987) mentions that a lot of the versions in the launcher are either incorrectly labelled or 'developer builds', meaning not the ones that were actually released to players, but the raw compiled JAR.

Two, the versions in the Minecraft launcher are not the "true" versions, and are instead re-releases. The spreadsheet also notes that the versions released in the launcher were from 2013, compared to the archived versions from 2009. Going off that logic, `c0.0.11a` might have originally been obfuscated, but was later released in the launcher unobfuscated.

Unfortunately, there's not much evidence supporting either claim enough to make any definitive statements. It's all guesswork as all other versions are lost as far as we know. Of course this may change in the future, so who knows?

But for right now, the first version Minecraft was obfuscated is [Classic 0.0.12a_03 (or `c0.0.12a_03`)](https://minecraft.wiki/w/Java_Edition_Classic_0.0.12a_03), with one big asterisk.

:::note

[An addendum to this post was released on June, 20th, 2026](./06-20-obfuscation-addendum.md).

:::
