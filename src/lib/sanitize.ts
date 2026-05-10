// Sanitize user input to prevent XSS
export function sanitize(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Clean input — strip HTML tags but keep the text readable
export function cleanInput(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}
