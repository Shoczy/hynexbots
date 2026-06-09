const {
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');

/**
 * Helpers for Discord "Components V2" messages. With V2 the whole message is
 * built from components inside a Container — no embeds, no top-level content.
 * Set the V2 flag on every reply/send that uses these.
 */
const V2 = MessageFlags.IsComponentsV2;
const V2_EPHEMERAL = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;

const text = (content) => new TextDisplayBuilder().setContent(content);

/** A full-width image (Media Gallery with a single item). */
const media = (url) =>
  new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url));

const sep = (large = false, divider = true) =>
  new SeparatorBuilder()
    .setDivider(divider)
    .setSpacing(large ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small);

/**
 * Build a Container. `children` are added in order. The main bot uses a clean,
 * neutral look — we intentionally do NOT set an accent colour (the `accent`
 * argument is kept so call sites can stay expressive, but it's not applied).
 */
function container(accent, children = []) {
  void accent;
  const c = new ContainerBuilder();
  for (const child of children) {
    const tag = child?.data?.type;
    // 10 = TextDisplay, 14 = Separator, 1 = ActionRow, 9 = Section, 13 = File, 12 = MediaGallery
    if (tag === 1) c.addActionRowComponents(child);
    else if (tag === 9) c.addSectionComponents(child);
    else if (tag === 14) c.addSeparatorComponents(child);
    else if (tag === 13) c.addFileComponents(child);
    else if (tag === 12) c.addMediaGalleryComponents(child);
    else c.addTextDisplayComponents(child);
  }
  return c;
}

module.exports = { V2, V2_EPHEMERAL, text, media, sep, container };
