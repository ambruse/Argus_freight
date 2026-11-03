export const WHATSAPP_NUMBERS = ['97455792233', '97430512233', '97471261234'];

export function selectWhatsAppNumber() {
    return WHATSAPP_NUMBERS[Math.floor(Math.random() * WHATSAPP_NUMBERS.length)];
}

export function whatsAppUrl(number, message = '') {
    return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}
