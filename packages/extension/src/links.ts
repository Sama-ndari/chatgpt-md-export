/**
 * Signed-in browsers get a JSON body containing `accessToken` here, which is
 * the same bearer token the backend API expects. Far easier than digging
 * through the network tab.
 */
export const TOKEN_SESSION_URL = "https://chatgpt.com/api/auth/session";

export const URL_HELP_URL =
  "https://github.com/Sama-ndari/chatgpt-md-export/blob/main/packages/extension/README.md#from-a-conversation-link";

export const DATA_EXPORT_HELP_URL =
  "https://github.com/Sama-ndari/chatgpt-md-export/blob/main/packages/extension/README.md#without-a-token-recommended";

/** Marketplace page, scrolled to the review form. */
export const REVIEW_URL =
  "https://marketplace.visualstudio.com/items?itemName=samandari.chatgpt-md-export-vscode&ssr=false#review-details";
