---
title: Apparently, Minecraft was Obfuscated Earlier
authors:
    - ash
date: 2026-06-20T14:24:01.000Z
last_update:
    date: 2026-06-27T09:15:50.000Z
---

So, I tried asking a large language model when Minecraft was obfuscated again.

<!-- truncate -->

Given my [previous investigation into the matter](./06-07-obfuscation-addition.md), I thought Gemini might've picked up the context as part of the initial web search, feeding it in and using that as the answer. So once again, I asked the question:

'Including all pre-release builds, when was Minecraft first obfuscated?'

> "Minecraft has been obfuscated since its inception. The original builds and the very first publicly released version in 2009 were obfuscated using ProGuard to scramble classes and methods."

...huh, they really don't like telling me the version. Well, maybe this time, I'll follow up the question in a chat. You know, like how you're supposed to.

'Can you give me the specific version Minecraft was first obfuscated?'

> Minecraft was first obfuscated in version old_alpha c0.0.13a_03.

Wait a second, we know that's not the case. According to my findings from Omniarchive, it should be `c0.0.12a_03`. Well, let's try telling Gemini that.

'Minecraft was not first obfuscated in c0.0.13a_03.'

> While the official launcher archives point to c0.0.13a_03 as the first archived build with ProGuard active, Minecraft was actually first obfuscated in version c0.0.12a, a missing historic build.

Wait, that's not right either. And the context it's pulling this from is a [gist mentioning what versions aren't obfuscated in the launcher](https://gist.github.com/MajickTek/24dc9a2bc076e28d2579df3bc663e573). We already know that this can be extremely inaccurate since these versions could be development builds without any obfuscation (this seems to be the general consensus).

'c0.0.12a was not the first version Minecraft was obfuscated either.'

> Minecraft was actually obfuscated right from the very first public release in May 2009.

...okay. I'm starting to think Gemini is just gaslighting me again. And it did, as I spent the next two weeks occasionally asking the question again. I was hoping to see something different, either referencing the uncertainty or asterisk in my blog post, or something completely new.

And eventually, it did, in a way I did not expect.

'What version was minecraft first obfuscated, including pre-releases?'

> Minecraft’s code was first obfuscated in Classic 0.0.2a, which introduced the use of the ProGuard obfuscator.

...huh? `0.0.2a`? Where did that version come from? Well apparently, it was sourced from [old Minecraft fandom](https://minecraft.fandom.com/wiki/Java_Edition_Classic_0.0.2a), where in the trivia section, it says, "This was the first version of Minecraft to have its code obfuscated." No footnote or link. Just that one sentence.

Well, the fandom has abandoned for a long time now, [replaced by the Minecraft Wiki](https://minecraft.wiki/w/Java_Edition_Classic_0.0.2a), so if we check there...

Yes! We have a footnote to the channel logs from the [#tigirc IRC server](https://archive.org/details/Minecraft_IRC_Logs_2009) for conversation on May 16th, 2009:

> - (13:40:22) PFawkes: notch
> - (13:40:28) PFawkes: this game is just a blank white screen
> - (13:40:33) PFawkes: I don't know why
> - (13:41:08) notch: do you have java installed? did it show a download progress bar thingie?
> - (13:41:14) PFawkes: yes
> - (13:41:40) notch: hm.. what operating system? oh, and does the java console say anything?
> - (13:41:50) PFawkes: vista
> - (13:41:52) Kasran: Blah
> - (13:41:55) notch: (it's usually available from the help menu in the browser)
> ...
> - (13:42:08) PFawkes: it's having some wonky opengl errors
> - (13:42:13) PFawkes: so it's likely my card or something
> - (13:42:34) PFawkes: alas
> - (13:42:35) notch: what errors?
> - (13:42:41) PFawkes: lots of them
> - (13:42:50) PFawkes: you using pixel shaders?
> - (13:42:57) PFawkes: or hardware TnL? :D
> - (13:43:16) PFawkes: because by "card" I mean useless piece of integrated chipset
> - (13:43:22) notch: no pixel shaders, nothing custom for TnL.. that's driver level, isn't it?
> - (13:43:25) PFawkes: well, yes
> - (13:43:33) PFawkes: but if you had that, it wouldn't work here, see?
> - (13:43:46) notch: hm, it ran for jrsquee with software opengl drivers. ;D
> - (13:43:49) PFawkes: so it might error out
> ...
> - (13:43:57) notch: yar, ok =\)
> - (13:44:03) PFawkes: bah
> - (13:44:28) PFawkes: will give it another go
> ...
> - (13:44:54) PFawkes: org.lwjgl.opengl.OpenGLException: Invalid value (1281)
> - (13:44:56) PFawkes:  at org.lwjgl.opengl.Util.checkGLError(Util.java:54)
> - (13:44:58) PFawkes:  at org.lwjgl.opengl.Display.swapBuffers(Display.java:640)
> - (13:44:59) PFawkes:  at org.lwjgl.opengl.Display.update(Display.java:660)
> - (13:45:01) PFawkes:  at com.mojang.minecraft.c.b(Unknown Source)
> - (13:45:03) PFawkes:  at com.mojang.minecraft.c.run(Unknown Source)
> - (13:45:05) PFawkes:  at java.lang.Thread.run(Unknown Source)
> - (13:45:07) PFawkes: java.security.AccessControlException: access denied (java.io.FilePermission level.dat write)
> - (13:45:09) PFawkes:  at java.security.AccessControlContext.checkPermission(Unknown Source)
> - (13:45:11) PFawkes:  at java.security.AccessController.checkPermission(Unknown Source)
> - (13:45:12) PFawkes:  at java.lang.SecurityManager.checkPermission(Unknown Source)
> - (13:45:14) PFawkes:  at java.lang.SecurityManager.checkWrite(Unknown Source)
> - (13:45:16) PFawkes:  at java.io.FileOutputStream.\<init>(Unknown Source)
> - (13:45:17) fartron: oh jeez
> - (13:45:18) PFawkes:  at java.io.FileOutputStream.\<init>(Unknown Source)
> - (13:45:20) PFawkes:  at com.mojang.minecraft.a.g.a(Unknown Source)
> - (13:45:21) fartron: pastebin
> - (13:45:22) PFawkes:  at com.mojang.minecraft.c.a(Unknown Source)
> - (13:45:22) notch: aaaahhhhhh
> - (13:45:24) PFawkes:  at com.mojang.minecraft.c.run(Unknown Source)
> - (13:45:25) notch: lol
> - (13:45:26) PFawkes:  at java.lang.Thread.run(Unknown Source)
> - (13:45:27) PFawkes: er, sorry.
> - (13:45:29) PFawkes: copying and pasting is bad :D

And as we see from "(13:45:01) PFawkes:  at com.mojang.minecraft.c.b(Unknown Source)", the Minecraft classes is called `c` with it's function being `b`, indicating obfuscation in the source code. This likely confirms that the unobfuscated versions in the launcher are development builds and not the actual releases to the public.

However, like the footnote mentions, this begs the question:

Was `c0.0.2a` really the first version obfuscated?

For the pre-classic versions (i.e. those prefixed with `rd-`), we'll likely never know since they were never given out to anyone. However, `c0.0.2a` was only the first version released to the public, not the first version given to anyone.

See, before Minecraft had an actual version number, there were four versions (`mc-161607`, `mc-161616`, `mc-161625`, `mc-161648`) released earlier that day to three users to test privately beforehand:

> - (12:07:06) notch: minecraft alpha is available. I need someone on windows, someone on mac and someone on linux!
> - (12:07:14) notch: singleplayer only still
> - (12:07:19) dock: I'm on a mac
> - (12:07:28) Siiseli: goddamnit I'd help but I can't on my dads computer
> - (12:07:52) fartron: i'm on windows!
> - (12:08:19) Jrsquee: notch, I'm linux
> - (12:08:29) notch: awesome. urls pm'd.
> - (12:08:43) notch: let me know if it works, and if it does, how well it works

:::note[Parts that don't line up with the wiki]
At the time of writing, only dock and fartron are mentioned as the users to got the URL for testing on the [Minecraft wiki](https://minecraft.wiki/w/Java_Edition_Classic_mc-161607). Jrsquee seems to have been left out since they did not have Java downloaded at the time when they were originally linked the game, starting testing later during `mc-161625`:

> - (12:26:46) Jrsquee: notch
> - (12:26:51) Jrsquee: pm me the link again
> - ...
> - (12:31:21) Jrsquee: alright
> - (12:31:23) Jrsquee: running
> - (12:31:24) fartron: but now sensitivity is way low
> - (12:31:30) Jrsquee: I'm getting like 8 fps

The times don't exactly match up with those reported on the wiki as the IRC logs are in the -0400 timezone.
:::

Unfortunately, unless these users decided to archive these versions, rather than deleting and redownloading (definitely the more likely situation), these versions are probably lost to time. There's no proof that these versions were obfuscated, like there's no proof they were not either.

As such, although the first archived obfuscated version is `c0.0.12a_03`, the first provably obfuscated version is [Classic 0.0.2a](https://minecraft.wiki/w/Java_Edition_Classic_0.0.2a), though once again, with one big asterisk.

So, I guess Gemini was helpful after two weeks of getting things wrong.

...though I probably could've figured this out faster if I went through all the versions on the wiki.
