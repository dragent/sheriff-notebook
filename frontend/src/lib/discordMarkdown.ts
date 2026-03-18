/**
 * Rendu simplifié type Discord pour le message effectif :
 * ### titres, **gras**, *italique*, listes à puces, shortcodes emoji → emoji Unicode.
 * Utilisé pour afficher le visuel comme sur Discord (sans dépendance markdown).
 */

const EMOJI_SHORTCODES: Record<string, string> = {
  ":clipboard:": "📋",
  ":star:": "⭐",
  ":star2:": "🌟",
  ":dizzy:": "💫",
  ":stars:": "🌠",
  ":passport_control:": "🛂",
  ":identification_card:": "🪪",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applyEmojiShortcodes(text: string): string {
  let out = text;
  for (const [shortcode, emoji] of Object.entries(EMOJI_SHORTCODES)) {
    out = out.replace(new RegExp(shortcode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), emoji);
  }
  return out;
}

/**
 * Convertit le markdown du message effectif en HTML affichable (style Discord).
 * Gère : ###, **gras**, *italique*, lignes - puces. Échappe le contenu pour la sécurité.
 */
export function discordMarkdownToHtml(markdown: string): string {
  const escaped = escapeHtml(markdown);
  const lines = escaped.split("\n");
  const blocks: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed.startsWith("# ")) {
      if (inList) {
        blocks.push("</ul>");
        inList = false;
      }
      const content = applyEmojiShortcodes(trimmed.slice(2));
      blocks.push(`<h1 class="discord-h1">${content}</h1>`);
      continue;
    }

    if (trimmed.startsWith("### ")) {
      if (inList) {
        blocks.push("</ul>");
        inList = false;
      }
      const content = applyEmojiShortcodes(trimmed.slice(4));
      blocks.push(`<h3 class="discord-h3">${content}</h3>`);
      continue;
    }

    if (trimmed.startsWith("- ")) {
      if (!inList) {
        blocks.push("<ul class=\"discord-ul\">");
        inList = true;
      }
      let content = trimmed.slice(2);
      content = content.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      content = content.replace(/\*(.+?)\*/g, "<em>$1</em>");
      content = content.replace(/__(.+?)__/g, "<u>$1</u>");
      content = applyEmojiShortcodes(content);
      blocks.push(`<li class="discord-li">${content}</li>`);
      continue;
    }

    if (trimmed === "") {
      if (inList) {
        blocks.push("</ul>");
        inList = false;
      }
      continue;
    }

    if (inList) {
      blocks.push("</ul>");
      inList = false;
    }

    let content = trimmed;
    content = content.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    content = content.replace(/\*(.+?)\*/g, "<em>$1</em>");
    content = applyEmojiShortcodes(content);
    blocks.push(`<p class="discord-p">${content}</p>`);
  }

  if (inList) {
    blocks.push("</ul>");
  }

  return blocks.join("\n");
}
