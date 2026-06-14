---
title: "Minecraft Mod Loader Parity: Built-In Packs"
authors:
    - ash
tags:
    - neoforge
    - fabric
date: 2026-06-14T15:03:04.000Z
last_update:
    date: 2026-06-14T15:03:04.000Z
---

Minecraft has many mod loaders that allow players to load mods into their game, as the name implies.

<!-- truncate -->

As such, there are a number of mod developers that try to support all potential mod loaders for the game, either through using a mod that implements each API on top of one another, or creating that API themselves. There is no one right solution, which is why there are over a thousand different implementations for the same thing.

I, too, [have my own multiloader that consolidates the two APIs](https://github.com/AshsWorkshop/mc-multiloader), though it is slow going as I'm never sure what I should handle first. However, this isn't an advertisement for that. No, this is to talk about my solution for adding built-in packs to the game.

...I swear it's more complicated than it sounds. It took a few days for me to figure it out.

So let's get through it.

> These explanations will use NeoForge 26.1.2.76 and Fabric API 0.151.0+26.1.2. As such, it may not hold true for previous or future versions.

NeoForge adds packs to the game through the [`AddPackFindersEvent` registered to the mod event bus](https://github.com/neoforged/NeoForge/blob/272ac27afcffbdff6aa081f7ea236433a9a5b505/src/main/java/net/neoforged/neoforge/event/AddPackFindersEvent.java). Fabric, meanwhile, uses a static call to [`ResourceLoader#registerBuiltinPack`](https://github.com/FabricMC/fabric-api/blob/811e3afac27e39f361087a8c142ddec4d58b23a2/fabric-resource-loader-v1/src/main/java/net/fabricmc/fabric/api/resource/v1/ResourceLoader.java#L117-L119), which is typically invoked in `ModInitializer#onInitialize` or `ClientModInitializer#onInitialize` depending on if the pack contains only assets.

First we need to determine which loader has the most restrictive API. This isn't that hard to determine: it's Fabric. Even though NeoForge has its own helper through `AddPackFindersEvent#addPackFinders`, you can simply forgo it altogether and use `addRepositorySource` to completely implement yourself, which `addPackFinders` delegates to.

With that in mind, what does Fabric allow the modder to configure? Well, ignoring mod context, it takes in an `Identifier` for the pack id, a `Component` for the display name on the pack selection screen, and an `PackActivationType` enum that sets whether the pack is disabled initially and can be changed, enabled by default but can be disable, or always enabled.

What about any assumptions? Well, Fabric assumes that the pack will be at `resourcepacks/<id_path>` in the mod JAR. Additionally, the pack name will always be suffixed with `(built-in: <mod_id>)`. Finally, Fabric will always attempt to add the pack as both an asset pack and a data pack based on the files within the pack (e.g., looking for files within `assets` and `data`, respectively).

How about NeoForge? Well, as mentioned previously, we can have our own custom implementation through `AddPackFindersEvent#addRepositorySource`, so we don't have any real limitations on configuration. However, can we use the `addPackFinders` helper? Well, technically yes. The Fabric implementation is easily transferrable to NeoForge's with `addPackFinders`. We just need to have the NeoForge id prefix with `resourcepacks/`. The reason I say technically is due to the internal ids of the pack.

Let's say I have a pack `examplemod:example_pack` I want to add. Assuming we add that prefix in our NeoForge specific implementation, the pack ids would be:

- Fabric: `examplemod:example_pack`
- NeoForge: `mod/examplemod:resourcepacks/example_pack`

This is because, unlike Fabric, NeoForge's `addPackFinders` doesn't differentiate between the pack path and pack id. Also, it adds a `mod/` prefix. This is fine in most cases, but if we were running a game test to validate specific behavior or implementations, it would be better to have both identifiers be the same.

So, with all this information, let's construct our own implementation. We will assume any loader-specific implementation has access to any mod context (e.g., mod id, mod container, mod event bus). Therefore, from the user, we need the pack `Identifier`, a `Component` for the display name, and some enum to determine the pack activation state. Since NeoForge can't easily rely on file contents to determine whether a pack should be active, we also need an enum to specify what `PackType`s to add the pack to.

With that information, we can create our API to something like so:

```java
/**
 * A handler to register additional built-in packs to the game.
 */
public interface RegisterBuiltInPacks {

    /**
     * Registers a built-in pack. The pack will be located within
     * {@code "resourcepacks/<id_path>"}, either under the mod JAR file
     * at runtime, or the {@code resources/} directory during development.
     * 
     * @param id The identifier of the built-in pack.
     * @param display The display name of the resource pack.
     * @param types The type of pack this is (i.e. resource, data, both).
     * @param state The activation state of the pack.
     */
    void add(Identifier id, Component displayName, PackTypes types, ActivationState state);

    /**
     * An enum denoting whether the pack should be registered as an
     * asset pack, data pack, or both.
     */
    public enum PackTypes {
        /**
         * A client assets pack.
         */
        CLIENT_RESOURCES(PackType.CLIENT_RESOURCES),
        /**
         * A server data pack.
         */
        SERVER_DATA(PackType.SERVER_DATA),
        /**
         * A general resource pack with both client assets and
         * server data.
         */
        ALL(PackType.CLIENT_RESOURCES, PackType.SERVER_DATA)

        private final Set<PackType> types;

        private PackTypes(PackType... types) {
            this.types = Set.of(types);
        }

        public boolean contains(PackType type) {
            return this.types.contains(type);
        }
    }

    public enum ActivationState {
        /**
         * A pack is added to the selection menu. Disabled initially.
         * User can control whether enabled or disabled.
         */
        DEFAULT,
        /**
         * A pack is added to the selection menu. Enabled initially.
         * User can control whether enabled or disabled.
         */
        ENABLED,
        /**
         * A pack is added to the selection menu. Enabled initially.
         * User cannot disable the pack.
         */
        ALWAYS_ENABLED;
    }
}
```

From here, the Fabric implementation is rather simple:

```java
// Assume we have access to the mod context.
// `ModContainer` container
@Override
public void add(Identifier id, Component displayName, PackTypes types, ActivationState state) {
    // Map `ActivationState` to `PackActivationType`.
    PackActivationType activationType = switch (state) {
        case DEFAULT -> PackActivationType.NORMAL;
        case ENABLED -> PackActivationType.DEFAULT_ENABLED;
        case ALWAYS_ENABLED -> PackActivationType.ALWAYS_ENABLED;
    };

    // Register the built-in pack.
    ResourceLoader.registerBuiltinPack(id, container, displayName, activationType);
}
```

Meanwhile, for NeoForge, we'll need to reimplement `addPackFinders` to handle parity:

```java
// Assume we have access to the mod context.
// `IEventBus` modBus
@Override
public void add(Identifier id, Component displayName, PackTypes types, ActivationState state) {
    // Register the event.
    modBus.addListener((AddPackFindersEvent event) -> {
        // Copy and modify implementation from AddPackFindersEvent#addPackFinders

        // First check whether we are adding the pack for this `PackType`.
        if (types.contains(event.getPackType())) {
            // If so, get the mod information from the pack id.
            IModInfo modInfo = ModList.get().getModContainerById(id.getNamespace())
                .orElseThrow(() -> new IllegalArgumentException("Mod not found: " + id.getNamespace()))
                .getModInfo();
            
            // Construct the pack.
            Pack pack = Pack.readMetaAndCreate(
                // First the `PackLocationInfo`.
                new PackLocationInfo(
                    // The pack id.
                    id.toString(),
                    // The display name of the pack.
                    displayName,
                    // The pack source. We need to provide our own to handle
                    // automatic pack adding.
                    PackSource.create(
                        // A decorator that typically adds a suffix to the pack description or id.
                        description -> Component.translatable(
                            "pack.nameAndSource",
                            description,
                            // Taken from Fabric for parity.
                            // We will need to create a lang entry for this:
                            // "pack.source.builtin_mod": "built-in: %s"
                            Component.translatable("pack.source.builtin_mod", id.getNamespace())
                        ).withStyle(ChatFormatting.GRAY),
                        // Whether the pack will be enabled by default
                        state == ActivationState.ENABLED
                            || state == ActivationState.ALWAYS_ENABLED
                    ),
                    // The known pack info. This should match NeoForge's implementation.
                    Optional.of(new KnownPack("neoforge", id.toString(), modInfo.getVersion().toString()))
                ),
                // Specify were to get the subpack files from.
                new JarContentsPackResources.JarContentsResourcesSupplier(
                    // The mod JAR contents the subpack can be found in.
                    modInfo.getOwningFile().getFile().getContents(),
                    // The subdirectory the files can be found within.
                    "resourcepacks/" + id.getPath()
                ),
                // The pack type.
                event.getPackType(),
                // How the pack displays in the selection menu.
                new PackSelectionConfig(
                    // Whether the pack is always active.
                    state == ActivationState.ALWAYS_ENABLED,
                    // Where the pack is positioned when shifted in the list.
                    Pack.Position.TOP,
                    // Whether the pack's position is fixed in the list.
                    false
                )
            );

            // Add the repository source that accepts this pack.
            event.addRepositorySource((consumer) -> consumer.accept(pack));
        }
    });
}
```

With that, we now have (close enough) parity when adding built-in packs to the mod loaders. All that's left is to create or generate the required `pack.mcmeta` and any additional files.
