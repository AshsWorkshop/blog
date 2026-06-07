---
title: A Redundant Count Comparison in AbstractContainerMenu
authors:
    - ash
date: 2026-05-23T19:59:03.000Z
last_update:
    date: 2026-06-07T16:48:58.000Z
---

Did you know that when shift-clicking a stack within a GUI like a chest or dispenser, the stack will move from one inventory to the other? It's a feature that's been in the game since [b1.5](https://minecraft.wiki/w/Java_Edition_Beta_1.5) and hasn't really changed much.

<!-- truncate -->

The method that manages this shift-clicking behavior is `AbstractContainerMenu.quickMoveStack()`, as internally, shift-clicking performs the `ContainerInput.QUICK_MOVE` action. The logic for this is rather simple:

```java
// From \[Minecraft 26.1.2 `CraftingMenu`](https://mcsrc.dev/1/26.1.2/net/minecraft/world/inventory/CraftingMenu#L105-149)
// Comments added to understand how the method works
@Override
public ItemStack quickMoveStack(Player player, int slotIndex) {
    // Setup variables
    ItemStack clicked = ItemStack.EMPTY;
    Slot slot = this.slots.get(slotIndex);

    // If the clicked slot has an item to move...
    if (slot != null && slot.hasItem()) {
        // Get the stack to move
        ItemStack stack = slot.getItem();
        // Keep track of the original stack
        clicked = stack.copy();

        // If the clicked slot is the crafting result...
        if (slotIndex == RESULT_SLOT) {
            // On stack crafted
            stack.getItem().onCraftedBy(stack, player);

            // Try to move stack into the player slots, starting from the hotbar
            if (!this.moveItemStackTo(stack, INV_SLOT_START, USE_ROW_SLOT_END, true)) {
                // Return if the stack can't be moved into the player slots
                return ItemStack.EMPTY;
            }

            // Slot behavior on moving the crafting result
            slot.onQuickCraft(stack, clicked);
        }
        // Otherwise, if the clicked slot is in the player slots...
        else if (slotIndex >= INV_SLOT_START && slotIndex < USE_ROW_SLOT_END) {
            // Try to move stack into the crafting inventory
            if (!this.moveItemStackTo(stack, CRAFT_SLOT_START, CRAFT_SLOT_END, false)) {
                // If the stack can't be moved into the crafting inventory...

                // If the clicked slot is in the player inventory
                if (slotIndex < INV_SLOT_END) {
                    // Try to move stack into the player hotbar
                    if (!this.moveItemStackTo(stack, USE_ROW_SLOT_START, USE_ROW_SLOT_END, false)) {
                        // Return if the stack can't be moved into the player hotbar
                        return ItemStack.EMPTY;
                    }
                }
                // Otherwise, since the clicked slot is in the player hotbar
                // Try to move stack into the player inventory
                else if (!this.moveItemStackTo(stack, INV_SLOT_START, INV_SLOT_END, false)) {
                    // Return if the stack can't be moved into the player inventory
                    return ItemStack.EMPTY;
                }
            }
        }
        // Otherwise try to move stack into the player slots
        else if (!this.moveItemStackTo(stack, INV_SLOT_START, USE_ROW_SLOT_END, false)) {
            // Return if the stack can't be moved into the player slots
            return ItemStack.EMPTY;
        }

        // If all items in the stack was successfully moved...
        if (stack.isEmpty()) {
            // Clear the original slot the stack was in
            slot.setByPlayer(ItemStack.EMPTY);
        }
        else {
            // Otherwise, mark that the contents of the slot have changed
            slot.setChanged();
        }

        // If the slot's contents haven't changed
        if (stack.getCount() == clicked.getCount()) {
            return ItemStack.EMPTY;
        }

        // Slot behavior on stack move
        slot.onTake(player, stack);

        // If the clicked slot is the crafting result
        if (slotIndex == RESULT_SLOT) {
            // Drop the remaining stack into the level
            player.drop(stack, false);
        }
    }

    // Return the original clicked stack
    return clicked;
}
```

This was my original understanding of how `quickMoveStack` worked. There were some differences depending on the backing inventory and menu, but the structure remained more or less the same. I didn't really think more about it at the time, and it was sitting that way across docs and other mod projects for a decade.

Well, until two days ago.

On March 21 2026, [Celeste](https://github.com/CelDaemon) made a comment on the Fabric Discord on one particular part on the `quickMoveStack` logic saying that the following didn't make much sense.

```java
if (stack.getCount() == clicked.getCount()) {
    return ItemStack.EMPTY;
}
```

I responded with, "Why not? The original stack can be modified in `moveItemStackTo` right? I'm pretty sure it's to prevent `onTake` from being called if nothing was taken" since that was how I understood the method to work. I would've stopped thinking about it right there, but then, Celeste responded with something interesting:

```
though honestly, I can't seem to find a way to reach that case at all
```

...well, that's strange.

So, I tried to trigger it myself. Normal quick move, moving with multiple stacks, modifying the stack size in the player data, etc. However, no matter what I did, nothing worked, the same as Celeste. At this point, there was only one reasonable thing to do:

Backtrace the addition through previous Minecraft versions to find why it was added.

So modifying an old gradle workspace with the following buildscript:

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

Let's look at the original code added in b1.5:

```java
// From \[Minecraft b1.5](https://minecraft.wiki/w/Java_Edition_Beta_1.5) `do`
public ii a(int i) {
    ge var2 = (ge) this.e.get(i);
    return var2 != null ? var2.a() : null;
}
```

...well that's not clear whatsoever. Which makes sense -- the Minecraft codebase was still obfuscated during the period. There are some mappings through the [Feather](https://github.com/OrnitheMC/feather) project, but I ended up going with the old 'translate it myself' approach. A bit of nostalgia from the SRG and Parchment mapping days.

For ease of understanding, I'll be translating the codebase into its modern Mojang mapping equivalent along with providing the original signature if you want to look up the methods yourself.

So, let's take another look at the b1.5 method:

```java
// From \[Minecraft b1.5](https://minecraft.wiki/w/Java_Edition_Beta_1.5) `AbstractContainerMenu`
// Comments added to understand how the method works
// Translated with their equivalent Mojang mappings
// Original signature: `do a(I)Lii;`
public ItemStack quickMoveStack(int slotIndex) {
    // Setup variables
    Slot slot = (Slot) this.slots.get(slotIndex);

    // If the slot exists, get the item in the slot
    // Otherwise, return an empty stack
    return slot != null ? slot.getItem() : null;
}
```

> Some IDEs may fail to open the file as the obfuscated name of the class `do` is a keyword. I got around this in IntelliJ IDEA by right-clicking the class and selecting 'Open in Right Split'.

Now you might be wondering why I'm showing the `AbstractContainerMenu` method instead of the `CraftingMenu` override. Well, it's because `CraftingMenu` (or `ie` obfuscated) didn't override `quickMoveStack` when it was first implemented. Nowadays, all menus have to implement `quickMoveStack` as an abstract method, much different than before.

Well, regardless, what we're looking for hasn't been implemented yet, so let's jump up a version:

```java
// From \[Minecraft b1.6](https://minecraft.wiki/w/Java_Edition_Beta_1.6) `CraftingMenu`
// Translated with their equivalent Mojang mappings
// Original signature: `iq a(I)Liw;`
public ItemStack quickMoveStack(int slotIndex) {
    // Setup variables
    ItemStack clicked = null;
    Slot slot = (Slot) this.slots.get(slotIndex);

    // If the clicked slot has an item to move...
    if (slot != null && slot.hasItem()) {
        // Get the stack to move
        ItemStack stack = slot.getItem();
        // Keep track of the original stack
        clicked = stack.copy();

        // If the clicked slot is the crafting result...
        if (slotIndex == RESULT_SLOT) {
            // Try to move stack into the player slots, starting from the hotbar
            this.moveItemStackTo(stack, INV_SLOT_START, USE_ROW_SLOT_END, true);
        }
        // Otherwise, if the clicked slot is in the player inventory...
        else if (slotIndex >= INV_SLOT_START && slotIndex < INV_SLOT_END) {
            // Try to move stack into the player hotbar
            this.moveItemStackTo(stack, USE_ROW_SLOT_START, USE_ROW_SLOT_END, false);
        }
        // Otherwise, if the clicked slot is in the player hotbar...
        else if (slotIndex >= USE_ROW_SLOT_START && slotIndex < USE_ROW_SLOT_END) {
            // Try to move stack into the player inventory
            this.moveItemStackTo(stack, INV_SLOT_START, INV_SLOT_END, false);
        }
        // Otherwise try to move stack into the player slots
        else {
            this.moveItemStackTo(stack, INV_SLOT_START, USE_ROW_SLOT_END, false);
        }

        // If all items in the stack was successfully moved...
        if (stack.count == 0) {
            // Clear the original slot the stack was in
            slot.setByPlayer((ItemStack) null);
        } else {
            // Otherwise, mark that the contents of the slot have changed
            slot.setChanged();
        }

        // If the slot's contents haven't changed
        if (stack.count == clicked.count) {
            return null;
        }

        // Slot behavior on stack move
        slot.onTake(stack);
    }

    // Return the original clicked stack
    return clicked;
}
```

Now, this is looking much closer to the current `CraftingMenu`. There are, of course, a few things missing. For example, you can't move quick move items from the player slots to the crafting inventory. Or, if you're able to quick move from the crafting result that fills up the entire inventory, any items left in the crafting result will disappear into the aether.

But with this, we can now see the original purpose of that count comparison: to prevent `onTake` from being called if the slot's contents haven't changed. In [b1.6](https://minecraft.wiki/w/Java_Edition_Beta_1.6), `AbstractContainerMenu.moveItemStackTo()` didn't originally have a return result indicating if some of the stack was moved successfully. As such, if the player tried to quick move from the with a full inventory, `onTake` would still be called, which depending on the `Slot`, could perform behavior it wasn't yet supposed to. So the count comparison acted as a gate to prevent the method from being called if nothing changed about the contents.

Later on in [b1.8.1](https://minecraft.wiki/w/Java_Edition_Beta_1.8.1), the implementation was changed to:

```java
// From \[Minecraft b1.8.1](https://minecraft.wiki/w/Java_Edition_Beta_1.8.1) `CraftingMenu`
// Translated with their equivalent Mojang mappings
// Original signature: `uf a(I)Lul;`
public ItemStack quickMoveStack(int slotIndex) {
    // Setup variables
    ItemStack clicked = null;
    Slot slot = (Slot) this.slots.get(slotIndex);

    // If the clicked slot has an item to move...
    if (slot != null && slot.hasItem()) {
        // Get the stack to move
        ItemStack stack = slot.getItem();
        // Keep track of the original stack
        clicked = stack.copy();

        // If the clicked slot is the crafting result...
        if (slotIndex == RESULT_SLOT) {
            // Try to move stack into the player slots, starting from the hotbar
            if (!this.moveItemStackTo(stack, INV_SLOT_START, USE_ROW_SLOT_END, true)) {
                // Return if the stack can't be moved into the player slots
                return null;
            }
        }
        // Otherwise, if the clicked slot is in the player inventory...
        else if (slotIndex >= INV_SLOT_START && slotIndex < INV_SLOT_END) {
            // Try to move stack into the player hotbar
            if (!this.moveItemStackTo(stack, USE_ROW_SLOT_START, USE_ROW_SLOT_END, false)) {
                // Return if the stack can't be moved into the player hotbar
                return null;
            }
        }
        // Otherwise, if the clicked slot is in the player hotbar...
        else if (slotIndex >= USE_ROW_SLOT_START && slotIndex < USE_ROW_SLOT_END) {
            // Try to move stack into the player inventory
            if (!this.moveItemStackTo(stack, INV_SLOT_START, INV_SLOT_END, false)) {
                // Return if the stack can't be moved into the player inventory
                return null;
            }
        }
        // Otherwise try to move stack into the player slots
        else if (this.moveItemStackTo(stack, INV_SLOT_START, USE_ROW_SLOT_END, false)) {
            // Return if the stack can't be moved into the player slots
            return null;
        }

        // If all items in the stack was successfully moved...
        if (stack.count == 0) {
            // Clear the original slot the stack was in
            slot.setByPlayer((ItemStack) null);
        } else {
            // Otherwise, mark that the contents of the slot have changed
            slot.setChanged();
        }

        // If the slot's contents haven't changed
        if (stack.count == clicked.count) {
            return null;
        }

        // Slot behavior on stack move
        slot.onTake(stack);
    }

    // Return the original clicked stack
    return clicked;
}
```

`moveItemStackTo` now returned if the stack was successfully moved. `quickMoveStack` then checked that result and, if the stack wasn't moved, exited early with the empty stack. This change functionally made the count comparison pointless as what it was checking for happened much earlier in the method. From there, the count comparison was copy-pasta-ed throughout different menus across the versions until the `quickMoveStack` we have today. Since the comparison always returns `false`, it doesn't affect game behavior whatsoever, and if it works, then who cares.

With this discovery, I [removed it from the NeoForged docs](https://github.com/neoforged/Documentation/pull/348). After all, what's the point in having something that will never do anything?

A very worthwhile four hour rabbit hole.

Thanks again to [Celeste](https://github.com/CelDaemon) for the initial discovery and investigation work.
