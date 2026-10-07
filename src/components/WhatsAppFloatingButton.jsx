import './WhatsAppFloatingButton.css';

const WHATSAPP_NUMBERS = ['97455792233', '97430512233'];

export default function WhatsAppFloatingButton() {
  const handleClick = () => {
    const selectedNumber =
      WHATSAPP_NUMBERS[Math.floor(Math.random() * WHATSAPP_NUMBERS.length)];

    window.open(
      `https://wa.me/${selectedNumber}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <button
      type="button"
      className="whatsapp-floating-button"
      onClick={handleClick}
      aria-label="Chat with us on WhatsApp"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 32 32"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M16.04 3A12.93 12.93 0 0 0 4.84 22.4L3 29l6.77-1.77A12.95 12.95 0 1 0 16.04 3Zm0 23.72a10.74 10.74 0 0 1-5.47-1.5l-.39-.23-4.02 1.05 1.08-3.91-.25-.4a10.77 10.77 0 1 1 9.05 4.99Zm5.9-8.07c-.32-.16-1.91-.94-2.21-1.05-.3-.11-.51-.16-.73.16-.21.32-.83 1.05-1.02 1.27-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.6a9.7 9.7 0 0 1-1.79-2.23c-.19-.32-.02-.5.14-.66.15-.15.32-.38.49-.57.16-.19.21-.32.32-.54.11-.21.05-.4-.03-.56-.08-.16-.73-1.75-1-2.4-.26-.63-.53-.55-.73-.56h-.62c-.22 0-.57.08-.86.4-.3.33-1.13 1.11-1.13 2.7s1.16 3.13 1.32 3.35c.16.21 2.28 3.48 5.52 4.88.77.33 1.37.53 1.84.68.77.24 1.48.21 2.03.13.62-.09 1.91-.78 2.18-1.54.27-.76.27-1.42.19-1.55-.08-.14-.3-.22-.62-.38Z"
        />
      </svg>
    </button>
  );
}
