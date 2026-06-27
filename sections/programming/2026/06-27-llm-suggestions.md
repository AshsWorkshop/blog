---
title: Large Language Models Could be Much Better
authors:
    - ash
---

So I've been talking quite a bit about large language models (LLMs), mostly because nearly everyone I'm around tend to praise it as gospel.

<!-- truncate -->

And, of course, LLMs ain't all that. 90% of the time I get the complete wrong answer. About 5% of the answers are technically correct but with about a hundred asterisks. 4% is genuinely correct, though I could've clicked the first link on a search engine and gotten the same result. And 1% is just 'how in the world did it spew out this'.

Basically, I think LLMs have a lot of potential, but they're currently barely worth using. My main use cases are literally searching for specific words through descriptions. Occasionally, I'll shoot it a question that a million other people know by heart, but otherwise, I just find it a waste of time. I'm never really learning anything by reading it's responses, and that's probably because I learn differently from the majority of others.

However, that doesn't mean I don't have opinions.

I have tons of them.

And here are just a few on how I think LLMs could be much better.

So, you know how LLMs are basically fancy neural networks working with tokens that represent parts of words? Is there a reason they can be a full word? What about a phrase? If you wanted to keep a specific thing (like a title) from being hallucinated, why not just make the title a single token and provide it that context. LLMs do a decent job at summarization, and making a variable token size when passing in the training data would help ground the answers in realism. I think this would be especially useful with research papers or court documents where you could associate one token with an encoded vector space of the document.

What about those source references. Supposedly, the LLMs provide the sources that it cites from. However, 99% of the answers it gives is functionally from one source. Even worse, that one source can be a single comment from a social media thread buried tens of layers deep, making the accuracy of the response dubious. I can understand that for some resources, there is generally only one source, but there's a host of difference between a community curated wiki compared to one guy / gal on Reddit. Therefore, why not update the model to provide context on the reliability of sources? For example, if a response relies on one social media post, mention that the answer may be unreliable, or better yet, frame the answer in such a way that the LLM is unsure, but source A says XYZ. It doesn't detract from verifying the answer yourself, but it at least provides more transparent insight into where the responses come from.

Speaking of unsure, why can't LLMs admit if they don't have enough knowledge to provide an accurate answer? It always spouts baloney so confidently that makes it seem like a sleazy salesman. I mean, I understand why. The majority of the data on the internet is either people providing accurate answers to questions or confidently spewing nonsense that either gets corrected later or perpetuated. The collective idea of 'I don't know' only comes up outside of these question / answer forums or in social media chat logs, which is typically not public information. Still, there's not reason a knowledge threshold couldn't be implemented as a layer within the network before the answer itself is evaluated. It would require a new notion of training, but we're already spending tons of money on supporting larger and larger language models, so why not other types as well?

Basically, all of my suggestions can be boiled down to: change the model to suit the task, rather than write a prompt to act upon an entirety of data. I think that would be a bigger revolution than 'look, I've changed a paragraph to create something new'.