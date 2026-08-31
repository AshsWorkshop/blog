---
title: A Random Idea
authors:
    - ash
---

I've been recently thinking about a weird idea. Not weird as in something strange, but as in a challenge of 'why overcomplicate it'?

<!-- truncate -->

Let's start from the beginning.

I enjoy playing video games, more specifically puzzle games. Working out the little tricks and strategies required to efficiently solve a task brings a good bit of enjoyment. While I don't mind a good modern puzzle, I find myself entranced by the games of old, those that could be considered 'retro'. When I learned about [RetroAchievements](https://retroachievements.org/) a couple years back, I immediately signed up before going on to complete all of the achievements for nonograms.

As I continued through my puzzle escapade, I had an occasional thought from time to time: I could probably create an algorithm to solve this. I didn't really think much of it at the time. It was just a passing thought that I had no plan to actually go through with. Plus, I never really had a need for a solver in most cases.

But then came *On the Tiles - Franky, Joke, and Dirk*, a game based upon the 15-puzzle and 24-puzzle with a few gimmicks. Long story short, a number of achievements aren't possible without a solver + macro. I made an entire [write-up on the forum](https://retroachievements.org/forums/topic/5230?comment=417803#417803) about it. It was the first time I ever bothered to write an algorithm for a puzzle game. While it wasn't the most optimized piece of code in the world, I found the same sort of satisfaction as solving the puzzle itself.

So I wondered, what if I could make a bot that could complete a game while getting every single achievement?

The rules are simple:

1. The bot is the only one allowed to interact with the game once the emulator starts up. No human input is allowed.
2. The bot is only given the screen of the game and the possible inputs it can make. It is not allowed to view the data of the device itself.
3. All achievements must be gathered in the minimum number of sessions possible. If a change is made to the bot, then it must unlock all achievements again.

I have seen numerous solvers out there on the internet, but none of them are strung together to take in an arbitrary image to create an output. Not to mention, it has to be performant, at least within 16.67ms for any achievements that involve a timer. Of course, that's not even accounting for menu-ing, and knowing whether the game is in a playable state. It seems ridiculous.

And yet, at the same time, I want to give it a try. Like, legitimately. I already have some prototypes in active development.

As for what? Well, you'll just have to wait and see.
